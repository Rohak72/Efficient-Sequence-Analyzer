from pydantic import BaseModel, PositiveFloat, StrictStr, validator
from typing import Literal, Optional, Dict, List

def nucleotide_check(dna_entry: StrictStr) -> str:
    dna_entry = dna_entry.upper()
    if not all(base in "ATCGN" for base in dna_entry):
        raise ValueError("DNA must only contain nucleotides A, T, C, or G (N allowed also).")
    return dna_entry

class FrameEntry(BaseModel):
    aa_seq: StrictStr
    orf_set: List[StrictStr]

# Can accomodate one-time requests (i.e. one-item list) as well as multi-seq records.
class FrameRequestSingle(BaseModel):
    sequence: StrictStr
    direction: Literal["FWD", "REV", "BOTH"] = "BOTH"

    @validator('sequence', pre=False, always=True)
    @classmethod
    def check_sequence(cls, v): return nucleotide_check(v)

class FrameRequestMulti(BaseModel):
    sequences: Dict[str, StrictStr]
    direction: Literal["FWD", "REV", "BOTH"] = "BOTH"

    @validator('sequences', pre=False, always=True)
    @classmethod
    def check_sequences(cls, v: Dict[str, str]): return {k: nucleotide_check(val) for k, val in v.items()}

class AlignmentRequestSingle(BaseModel):
    query_frames: Dict[str, FrameEntry]
    target: StrictStr
    threshold: Optional[PositiveFloat] = 0.98

class AlignmentRequestMulti(BaseModel):
    query_frames: Dict[str, Dict[str, FrameEntry]]
    targets: Dict[str, StrictStr]
    threshold: Optional[PositiveFloat] = 0.98
 