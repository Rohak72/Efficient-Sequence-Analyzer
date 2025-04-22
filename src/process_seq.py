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

from termcolor import colored
from translate import *
import platform
import re
import warnings
warnings.filterwarnings('ignore')

def generate_frames(input_seq, translate_direction, indicator_tag = ["M", "B"], verbose = True):
    frame_set = {}
    direction_set = ["FWD"] * 3 + ["REV"] * 3 if translate_direction == "BOTH" else \
                    [translate_direction] * 3 # building the frame labels
    mapping = {"FWD": "5'3'", "REV": "3'5'"}

    aa_seqs = get_translate_output(input_seq, translate_direction)
    
    for i in range(len(aa_seqs)):
        entry = f"Frame #{i + 1} ({direction_set[i]} / {mapping[direction_set[i]]})" # label
        frame_set[entry] = find_orfs(aa_seqs[i], indicator_tag) # extracting the ORF set
        if verbose and "MAC" in platform.platform().upper(): # coloring sequence if appropriate
            color_sequence(aa_seqs[i], frame_set[entry].get("orf_set"), entry, indicator_tag)
        elif verbose: # resorting to basic print if there's platform incompatibility
            print(f"{entry}:\n{aa_seqs[i]}\n")
    
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

def select_seq(frame_set, verbose = True):
    frame_origin, global_max, start_pos, priority_orf = 1, 0, 0, ""

    for i in range(len(frame_set)):
        frame_data = list(frame_set.values())[i]
        if len(frame_data["orf_set"]) == 0:
            continue

        temp_max = max(frame_data["orf_set"], key=len)
        if len(temp_max) > global_max: # renaming the current "winner" (in terms of ORF length)
            global_max = len(temp_max)
            priority_orf = temp_max
            frame_origin = i + 1
            start_pos = frame_data["aa_seq"].find(priority_orf)
    
    if verbose:
        print(f"Most Likely AA Sequence (Frame #{frame_origin}, Length - {global_max}, Start Position - "
              f"{start_pos}): \n{priority_orf}\n")
    
    return (frame_origin, priority_orf, global_max, start_pos)

def find_orfs(aa_seq, indicator_tag = ["M", "B"]):
    end_match = indicator_tag[0] if indicator_tag[1] == "E" else ""
    leading_seq = "M" if end_match != "" else indicator_tag[0]

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

    if end_match != "":
        suitable_orfs = [orf for orf in suitable_orfs if orf.endswith(end_match)]
    
    return {'aa_seq': aa_seq, 'orf_set': suitable_orfs}

def color_sequence(aa_seq, orf_set, label, indicator_tag = ["M", "B"]):
    colored_seq = aa_seq
    for orf in orf_set:
        if len(orf) == len(indicator_tag[0]): # solitary, one-character ORF (i.e. 'M-')
            orf = indicator_tag[0] + "-"
            colored_seq = colored_seq.replace(orf, colored(orf[0:len(indicator_tag[0])], 
                                                           "red", "on_red") + "-")
        elif indicator_tag[1] == "B": # color scheme: beginning red, rest yellow
            colored_seq = colored_seq.replace(orf, colored(orf[0:len(indicator_tag[0])], "red", 
                                              attrs=["bold"]) + colored(orf[len(indicator_tag[0]):], 
                                              "yellow", attrs=["bold"]))
        else: # color scheme: all yellow except for the ending red
            colored_seq = colored_seq.replace(orf, colored(orf[0:len(orf)-len(indicator_tag[0])], 
                                              "yellow", attrs=["bold"]) + colored(orf[-len(indicator_tag[0]):], 
                                              "red", attrs=["bold"]))
    
    print(f"{label}:\n{colored_seq}\n")
