from app.scripts.frame_retrieve import generate_frames
from app.scripts.build_alignment import align
from app.scripts.utils import *
from app.scripts.s3_tools import *
from app.models.seq_input import *
from app.models.auth_tools import *
from app.database import get_db
from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import pandas as pd

router = APIRouter()

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
                          current_user: User = Depends(get_db)):
    top_hits = defaultdict(list)
    all_orfs = [orf for entry in data.query_frames.values() for orf in entry.orf_set]
    if len(all_orfs) == 0:
        return {'detail': 'No valid ORFs found in input.'}
    
    results_df = pd.DataFrame(columns = ["Name", "Target", "Identity-Score", "Direction", 
                                         "Most-Likely-ORF", "Notes"])
    max_lca, final_align_res, top_orf = 0, None, None
    for orf in all_orfs:
        align_res = align(query=orf, target_set={'': data.target}, top_hits=top_hits, identity_ratio=data.threshold)
        if align_res.get('length') > max_lca:
                max_lca = align_res.get('length')
                final_align_res = align_res
                top_orf = orf
    
    if final_align_res is None:
        return {'detail': 'No filled alignment was determined.'}

    results_df = data_export(results_df, "", "", top_orf, final_align_res.get("identity_pct"), 
                             final_align_res.get("target"), "")
    final_align_res.update({'top_orf': top_orf})
    response = {'alignment_result': final_align_res}

    if current_user:
        results_key, top_hits_key = save_alignment_artifacts(results_df=results_df, top_hits=top_hits, 
                                                             final_align_res=final_align_res, 
                                                             current_user=current_user, s3_client=s3_client, 
                                                             bucket_name=bucket_name, db=db)
        presigned_result_url = generate_presigned_url(results_key, filename="orf_mappings.csv")
        presigned_hits_url = generate_presigned_url(top_hits_key, filename="top_hits.csv")

        response["download_links"] = {
            "orf_mappings": presigned_result_url,
            "top_hits": presigned_hits_url
        }
        
    return response

@router.post("/align/multi")
def pairwise_align_multi(data: AlignmentRequestMulti):
    top_hits = defaultdict(list)
    align_res = align(query=data.query, target_set=data.target, top_hits=top_hits, identity_ratio=data.threshold)
    return align_res
