from app.scripts.frame_retrieve import generate_frames
from app.scripts.build_alignment import align
from app.models.seq_input import *
from collections import defaultdict
from fastapi import APIRouter

router = APIRouter()

@router.post("/frames")
def build_frames(data: FrameRequest):
    frame_set = generate_frames(data.seq, data.direction)
    return frame_set

@router.post("/align")
def pairwise_align(data: AlignmentRequest):
    top_hits = defaultdict(list)
    align_res = align(query=data.query, target_set=data.target, top_hits=top_hits, identity_ratio=data.threshold)
    return align_res
