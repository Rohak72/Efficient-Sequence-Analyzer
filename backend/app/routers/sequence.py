from app.scripts.frame_retrieve import generate_frames
from app.scripts.build_alignment import align
from app.models.seq_input import *
from fastapi import APIRouter

router = APIRouter()

@router.post("/frames")
def build_frames(data: FrameRequest):
    frame_set = generate_frames(data.seq, data.direction)
    return frame_set

@router.post("/align")
def pairwise_align(data: AlignmentRequest):
    align_res = align([data.target], data.query, data.threshold)
    return align_res