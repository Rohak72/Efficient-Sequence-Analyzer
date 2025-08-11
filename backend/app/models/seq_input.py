from pydantic import BaseModel, PositiveFloat, StrictStr, field_validator
from typing import Literal, Optional, Dict

class FrameRequest(BaseModel):
    seq: StrictStr
    direction: Literal["FWD", "REV", "BOTH"] = "BOTH"

    @field_validator('seq', mode='after')
    @classmethod
    def nucleotide_check(cls, dna_entry: StrictStr):
        dna_entry = dna_entry.upper()
        if not all(base in "ATCGN" for base in dna_entry):
            raise ValueError("DNA Sequence must only contain nucleotides A, T, C, or G (N allowed also).")
        return dna_entry

class AlignmentRequest(BaseModel):
    query: StrictStr
    target: Dict
    threshold: Optional[PositiveFloat] = 0.98
    mode: Literal["SINGLE", "MULTI"]
