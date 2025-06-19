# -*- coding: utf-8 -*-
# main.py

"""
Author: Rohak Jain
Last Date Modified: 2025-04-21
Description: This program encodes the primary method workflow for the ESA script, connecting the
computational aspects of the analysis through well-defined user input, console display, and file I/O.
Specifically, the code is able to generalize to high sequence volumes and account for a range of user 
preferences, including translation direction, vector tags, and read-by-read frame output. The final results
are packaged into a CSV for use in downstream applications.

"""

from process_seq import *
from compare_seq import *
from utils import *
import time
import os

print("\nWelcome to the Efficient Sequence Analyzer! This pipeline will: \n"
      "  - (1) generate all possible reading frames of the nucleotide sequence\n"
      "  - (2) select the most optimal amino acid ORF\n"
      "  - (3) perform a global pairwise alignment between the target and query\n")

print("NOTE: All of the options specified here will be enforced over the ENTIRE execution of the" \
      " program, so choose wisely!")

# (1) FASTA File Extraction
infile = get_input("Enter the filepath/filename of your input FASTA: ", ".fasta", "ending")
tgtfile = get_input("Enter the filepath/filename of your target FASTA: ", ".fasta", "ending")
in_records = process_fasta(infile)
tgt_records = process_fasta(tgtfile)
print("FASTA files successfully imported!\n")

strand_direction = get_input("What should be the direction of translation? (options: 'FWD', "
                                 "'REV', or 'BOTH'): ", ["FWD", "REV", "BOTH"]).upper()
verbose_flag = get_input("Occasionally, output from the analysis may be shown on terminal. Activate "
                         "this verbose mode? (options: 'Y' or 'N'): ", ["Y", "N"]).upper() == "Y"

# (2) High-Level Specifications - Target Sequence, Verbose Setting 
#target = get_input("Copy and paste your target sequence: ", "letters", "substr").upper()
#verbose_flag = get_input("Occasionally, output from the analysis may be shown on terminal. Activate "
                         #"this verbose mode? (options: 'Y' or 'N'): ", ["Y", "N"]).upper() == "Y"

print(f"\nIdentified {len(in_records)} sequence entries...")
print(f"Screening across {len(tgt_records)} target sequences...")

# For EACH sequence, user is asked for a (3) translate direction and (4) optional vector!
# Status messages highlight the completion of an ESA step, distinguished by time-sleep commands
run_number = 1
results_df = pd.DataFrame(columns = ["Name", "Direction", "Most-Likely-Seq", 
                                     "Seq-Metadata", "Alignment-Identity (%)", "Target"])

for record in in_records.values():
    # compare the max ORF across all targets
    run_number += 1
    if run_number < 12:
        continue

    if run_number > 13:
        break

    time.sleep(1)
    print(f"\n*** Run #{run_number} of {len(in_records)} ***\n")
    time.sleep(1)
    print(f"NAME: {record.id}")
    print(f"SEQUENCE: {repr(record.seq)}\n")
    
    frame_set = generate_frames(str(record.seq), strand_direction, verbose = verbose_flag)
    print(">> STATUS: Frame generation complete!\n")
    time.sleep(1)

    empty_result = all(len(frame.get('orf_set')) == 0 for frame in frame_set.values())
    if not empty_result: # if we yield no significant open reading frames
        time.sleep(1)
        ref_frame, optimal_seq, length, start_pos = select_seq(frame_set, verbose = verbose_flag)
        print(">> STATUS: Viable amino acid sequence found!\n")

        print(f">> STATUS: Computing best alignment among {len(tgt_records)} target entries...")
        time.sleep(1)
        optimal_seq = "MGGVSFAFNLNSLIVGILRFHWGGASPAAPAGGMVSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFTYGVQCFSRP"
        align_res = align(tgt_records, optimal_seq, identity_ratio = 0.98, verbose = verbose_flag)
        print(">> STATUS: Pairwise alignment finished!\n")

        results_df = data_export(results_df, record.id, strand_direction, optimal_seq, 
                                 f"Source: Frame #{ref_frame}; Length: {length}; Start Position: " 
                                 f"{start_pos}", align_res, align_res["target"])
    else:
        print(">> STATUS: No valid AA reads found.\n")
        results_df = data_export(results_df, record.id, strand_direction, "N/A", "N/A", "N/A")
    
    time.sleep(1)
    print(">> STATUS: Run data exported!")
    
    run_number += 1

# Preparing the CSV outpath by accounting for directory chains and Windows/Linux/macOS slash differences
infile = infile.replace("\\", "/") if "\\" in infile else infile
prefix = "" if os.path.dirname(infile) == "" else os.path.dirname(infile) + os.sep

# Saving the results!
results_df.to_csv(f"{prefix}ESA-Results-{time.strftime("%m-%d-%Y")}.csv", index = False)
print("\n***\n\nProcess complete! Your results should be available for viewing in a CSV file.\n")
