# -*- coding: utf-8 -*-
# process_seq.py

"""
Author: Rohak Jain
Last Date Modified: 2025-03-29
Description: 'process_seq' is responsible for executing and rendering the six-frame translation pipeline 
(which would normally be done via Expasy). From translating the input sequence to displaying the 
associated amino acid reads, this set of code is ultimately able to come up with the "most likely" AA 
ORF (by length) to slot into the alignment portion of ESA.

"""

from app.scripts.translate import *
import re
import warnings
warnings.filterwarnings('ignore')

def generate_frames(input_seq, translate_direction):
    frame_set = {}
    direction_set = ["FWD"] * 3 + ["REV"] * 3 if translate_direction == "BOTH" else \
                    [translate_direction] * 3 # building the frame labels

    aa_seqs = get_translate_output(input_seq, translate_direction)
    
    for i in range(len(aa_seqs)):
        entry = f"Frame #{i + 1} ({direction_set[i]})" # label
        frame_set[entry] = find_orfs(aa_seqs[i]) # extracting the ORF set
    
    return frame_set

def get_translate_output(input_seq, translate_direction):
    if translate_direction == "BOTH": # recursive call to account for both FWD and REV
        return get_translate_output(input_seq, "FWD") + get_translate_output(input_seq, "REV")
    elif translate_direction == "FWD":
        aa_seqs = [translate(input_seq), 
                   translate(input_seq[1:]), 
                   translate(input_seq[2:])]
    else:
        aa_seqs = [translate(reverse_complement(input_seq)), 
                   translate(reverse_complement(input_seq[:len(input_seq) - 1])),
                   translate(reverse_complement(input_seq[:len(input_seq) - 2]))]
    
    return aa_seqs

def find_orfs(aa_seq):
    leading_seq = "M"
    start_positions = [match.start() for match in re.finditer(leading_seq, aa_seq)]
    stop_positions = [match.start() for match in re.finditer("-", aa_seq)]

    closest_stop = 0
    suitable_orfs = []
    for start in start_positions:
        if start > closest_stop:
            stop_candidates = [n for n, i in enumerate(stop_positions) if i > start]
            if len(stop_candidates) == 0:
                suitable_orfs.append(aa_seq[start:])
                break
            else:
                closest_stop = stop_positions[stop_candidates[0]]
                suitable_orfs.append(aa_seq[start:closest_stop])
    
    return {'aa_seq': aa_seq, 'orf_set': suitable_orfs}
