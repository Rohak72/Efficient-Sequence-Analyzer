from app.scripts.frame_retrieve import generate_frames
from app.scripts.build_alignment import align
from app.models.seq_input import *
from collections import defaultdict
from fastapi import APIRouter

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
def pairwise_align_single(data: AlignmentRequestSingle):
    top_hits = defaultdict(list)
    all_orfs = [orf for entry in data.query_frames.values() for orf in entry.orf_set]
    if len(all_orfs) == 0:
        return
    
    max_lca, final_align_res, top_orf = 0, None, None
    for orf in all_orfs:
        align_res = align(query=orf, target_set={'': data.target}, top_hits=top_hits, identity_ratio=data.threshold)
        if align_res.get('length') > max_lca:
                max_lca = align_res.get('length')
                final_align_res = align_res
                top_orf = orf
    
    final_align_res.update({'top_orf': top_orf})
    print(top_hits)
    return final_align_res

@router.post("/align/multi")
def pairwise_align_multi(data: AlignmentRequestMulti):
    top_hits = defaultdict(list)
    align_res = align(query=data.query, target_set=data.target, top_hits=top_hits, identity_ratio=data.threshold)
    return align_res
