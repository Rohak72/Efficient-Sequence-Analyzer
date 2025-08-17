from app.scripts.frame_retrieve import *
from app.scripts.build_alignment import *
from app.scripts.utils import *
from app.scripts.s3_tools import *
from app.models.seq_input import *
from app.models.auth_tools import *
from app.routers.auth import get_optional_user
from app.database import get_db
from collections import defaultdict
from fastapi import APIRouter, UploadFile, Form, File, Depends
from sqlalchemy.orm import Session
import pandas as pd

router = APIRouter()

# ==============================================================================
#  NEW: IN-MEMORY CACHE FOR LAZY LOADING
# ==============================================================================
# NOTE: This is a simple in-memory cache. For production, you would replace this
# with a more robust solution like Redis to handle multiple server instances
# and prevent data loss on server restart.
RESULTS_CACHE: Dict[str, Dict] = {}


# ==============================================================================
#  NEW: REUSABLE INTERNAL HELPER FUNCTIONS
# ==============================================================================

def _process_fasta_sync(upload_file: UploadFile) -> Dict[str, str]:
    """
    A synchronous version of your FASTA parser to be called from sync endpoints.
    """
    content = upload_file.file.read().decode("utf-8")
    # This is a placeholder for your actual parsing logic from process_fasta_upload
    # For example:
    lines = content.splitlines()
    sequences = {}
    current_header = ""
    for line in lines:
        if line.startswith(">"):
            current_header = line[1:].strip()
            sequences[current_header] = ""
        elif current_header:
            sequences[current_header] += line.strip()
    return sequences


def _run_multi_alignment_pipeline(
    query_frames: Dict,
    targets: Dict[str, str],
    direction: str,
    align_threshold: float
) -> tuple:
    """
    This is the core logic extracted from your original /align/multi endpoint.
    It can now be reused by both the old and new endpoints.
    """
    top_hits = defaultdict(list)
    results_df = pd.DataFrame(columns = ["Name", "Target", "Identity-Score", "Direction", 
                                         "Most-Likely-ORF", "Notes"])
    alignment_results = {}
    
    for seq_name, frame_data in query_frames.items():
        all_orfs = [orf for frame in frame_data.values() for orf in frame.get('orf_set', [])]

        if not all_orfs:
            results_df = data_export(results_df, seq_name, direction, "N/A", 0.0, "N/A", notes="No ORFs!")
            alignment_results[seq_name] = {'detail': 'No valid ORFs found.'}
            continue

        results_df, final_align_res = batch_alignment_cycle(
            direction=direction, 
            record_id=seq_name, 
            orf_set=all_orfs, 
            target_set=targets,
            top_hits=top_hits, 
            curr_results_data=results_df,
            align_threshold=align_threshold
        )

        alignment_results[seq_name] = final_align_res or {'detail': 'No final alignment determined.'}
        
    return alignment_results, top_hits, results_df


# ==============================================================================
#  NEW: HIGH-PERFORMANCE "WRAPPER" ENDPOINT
# ==============================================================================

@router.post("/process/multi")
def process_multi_alignment(
    input_fasta: UploadFile = File(...),
    target_fasta: UploadFile = File(...),
    direction: str = Form("BOTH"),
    align_threshold: float = Form(0.98),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    This is the new, efficient endpoint for the frontend.
    It performs the entire pipeline on the server to prevent sending huge
    intermediate data (like frames) to the client.
    """
    # 1. Parse FASTA files directly on the server
    input_sequences = _process_fasta_sync(input_fasta)
    target_sequences = _process_fasta_sync(target_fasta)

    # 2. Generate frames in server memory (never sent to client)
    all_frames_data = {}
    for name, seq in input_sequences.items():
        all_frames_data[name] = generate_frames(seq, direction)
    
    # 3. Run the reusable alignment pipeline
    alignment_results, top_hits, results_df = _run_multi_alignment_pipeline(
        query_frames=all_frames_data,
        targets=target_sequences,
        direction=direction,
        align_threshold=align_threshold
    )
    
    # 4. Cache the large, detailed results for lazy loading
    job_id = str(uuid.uuid4())
    RESULTS_CACHE[job_id] = {
        "frames": all_frames_data,
        "top_hits": top_hits
    }
    
    # 5. Prepare and return the LEAN summary response
    response = {
        "job_id": job_id,
        "alignment_results": alignment_results,
        "available_targets": list(top_hits.keys()), # Just the names for the dropdown
    }
    
    if current_user:
        # Save artifacts and add download links to the response
        results_key, top_hits_key = save_alignment_artifacts(results_df, top_hits, ...)
        response['download_links'] = {
            'orf_mappings': generate_presigned_url(results_key, ...),
            'top_hits': generate_presigned_url(top_hits_key, ...)
        }
        
    return response


# ==============================================================================
#  NEW: LAZY-LOADING "GETTER" ENDPOINTS
# ==============================================================================

@router.get("/results/{job_id}/frames/{input_name}")
def get_frames_for_input(job_id: str, input_name: str):
    job_data = RESULTS_CACHE.get(job_id)
    if not job_data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job not found or results have expired.")
    
    input_frames = job_data.get("frames", {}).get(input_name)
    if input_frames is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Input sequence name not found for this job.")
        
    return input_frames

@router.get("/results/{job_id}/tophits/{target_name}")
def get_top_hits_for_target(job_id: str, target_name: str):
    """
    This endpoint returns the top hits for a single target.
    The min-heap (list of tuples) is directly serializable to a JSON array of arrays.
    Frontend receives: [[98.5, 149, "ORF_SEQ_1"], [97.2, 148, "ORF_SEQ_2"]]
    """
    job_data = RESULTS_CACHE.get(job_id)
    if not job_data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job not found or results have expired.")
    
    target_hits = job_data.get("top_hits", {}).get(target_name)
    if target_hits is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Target name not found for this job.")
        
    # The list of tuples is already a valid JSON structure.
    # FastAPI will automatically convert it.
    return sorted(target_hits, key=lambda x: x[0], reverse=True) # Sort before sending


# ==============================================================================
#  EXISTING ENDPOINTS (Kept for modularity, but frontend will use the new one)
# ==============================================================================

@router.post("/parseFASTA")
async def parse_fasta_file(fasta_file: UploadFile = File(...)):
    try:
        simplified_sequences = await process_fasta_upload(fasta_file)
        return {'sequences': simplified_sequences}
    except Exception as e:
        return {'error': str(e)}

@router.post("/frames/single")
def build_frames_single(data: FrameRequestSingle):
    frame_set = generate_frames(data.sequence, data.direction)
    return frame_set

@router.post("/frames/multi")
def build_frames_multi(data: FrameRequestMulti):
    frame_set = {}
    for name, seq in data.sequences.items():
        frame_set[name] = generate_frames(seq, data.direction)
    return frame_set

@router.post("/align/single")
def pairwise_align_single(data: AlignmentRequestSingle, db: Session = Depends(get_db), 
                          current_user: Optional[User] = Depends(get_optional_user)):
    top_hits = defaultdict(list)
    results_df = pd.DataFrame(columns = ["Name", "Target", "Identity-Score", "Direction", 
                                         "Most-Likely-ORF", "Notes"])
    all_orfs = [orf for entry in data.query_frames.values() for orf in entry.orf_set]
    direction = infer_direction(data.query_frames)

    if len(all_orfs) == 0:
        return {'detail': 'No valid ORFs found in input.'}
    
    results_df, final_align_res = batch_alignment_cycle(direction=direction, record_id="", orf_set=all_orfs, 
                                                        target_set={'': data.target}, top_hits=top_hits,
                                                        curr_results_data=results_df, 
                                                        align_threshold=data.threshold)
    
    if final_align_res is None:
        return {'detail': 'No final alignment was determined.'}
    response = {'alignment_result': final_align_res}
    
    return response

@router.post("/align/multi")
def pairwise_align_multi(data: AlignmentRequestMulti, db: Session = Depends(get_db),
                         current_user: Optional[User] = Depends(get_optional_user)):
    top_hits = defaultdict(list)
    results_df = pd.DataFrame(columns = ["Name", "Target", "Identity-Score", "Direction", 
                                         "Most-Likely-ORF", "Notes"])
    alignment_results = {}
    
    for seq_name, frame_data in data.query_frames.items():
        all_orfs = []
        for frame in frame_data.values():
            all_orfs.extend(frame.orf_set)

        direction = infer_direction(data.query_frames)

        if len(all_orfs) == 0:
            results_df = data_export(results_df, seq_name, direction, "N/A", 0.0, "N/A", notes="No ORFs!")
            alignment_results[seq_name] = {'detail': 'No valid ORFs found.'}
            continue

        # Run batch alignment on this ORF set
        results_df, final_align_res = batch_alignment_cycle(direction=direction, record_id=seq_name, 
                                                            orf_set=all_orfs, target_set=data.targets,
                                                            top_hits=top_hits, curr_results_data=results_df,
                                                            align_threshold=data.threshold)

        if final_align_res is None:
            alignment_results[seq_name] = {'detail': 'No final alignment determined.'}
        else:
            alignment_results[seq_name] = final_align_res

    # Save artifacts if user is logged in
    response = {'alignment_results': alignment_results, 'top_hits': top_hits}
    if current_user:
        results_key, top_hits_key = save_alignment_artifacts(results_df=results_df, top_hits=top_hits,
                                                             current_user=current_user, s3_client=s3_client,
                                                             bucket_name=bucket_name, db=db)
        presigned_result_url = generate_presigned_url(results_key, filename="orf_mappings.csv")
        presigned_hits_url = generate_presigned_url(top_hits_key, filename="top_hits.csv")

        response['download_links'] = {
            'orf_mappings': presigned_result_url,
            'top_hits': presigned_hits_url
        }

    return response
