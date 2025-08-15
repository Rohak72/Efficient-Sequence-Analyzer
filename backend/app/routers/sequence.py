from app.scripts.frame_retrieve import *
from app.scripts.build_alignment import *
from app.scripts.utils import *
from app.scripts.s3_tools import *
from app.models.seq_input import *
from app.models.auth_tools import *
from app.routers.auth import get_optional_user
from app.database import get_db
from collections import defaultdict
from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
import pandas as pd

router = APIRouter()

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
    response = {'alignment_results': alignment_results}
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
