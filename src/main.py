# -*- coding: utf-8 -*-
# main.py

"""
Author: Rohak Jain
Last Date Modified: 2025-08-04
Description: This program encodes the primary method workflow for the ESA script, connecting the
computational aspects of the analysis through well-defined user input, console display, and file I/O.
Specifically, the code is able to generalize to high sequence volumes and account for a range of user 
preferences, including translation direction, read-by-read frame output, and alignment dynamics. The 
final results are packaged into a dedicated folder for use in downstream applications.

"""

from collections import defaultdict
from process_seq import *
from align_ops import *
from utils import *
import time
import os

print("\nWelcome to the Efficient Sequence Analyzer! This pipeline will: \n"
      "  - (1) generate all possible reading frames of the nucleotide sequence\n"
      "  - (2) exhaustively determine the most optimal amino acid ORF\n"
      "  - (3) perform a global pairwise alignment between the target and query\n")

print("NOTE: All of the options specified here will be enforced over the ENTIRE execution of the" \
      " program, so choose wisely!\n")

# (1) FASTA File Extraction (Input + Target)
infile = get_input("Enter the filepath/filename of your input FASTA: ", ".fasta", "ending")
tgtfile = get_input("Enter the filepath/filename of your target FASTA: ", ".fasta", "ending")

in_records = process_fasta(infile)
tgt_records = process_fasta(tgtfile)
print("FASTA files successfully imported!\n")

# (2) Parameter Selection
strand_direction = get_input("What should be the direction of translation? (options: 'FWD', "
                                 "'REV', or 'BOTH'): ", ["FWD", "REV", "BOTH"]).upper()
verbose_flag = get_input("Occasionally, output from the analysis may be shown on terminal. Activate "
                         "this verbose mode? (options: 'Y' or 'N'): ", ["Y", "N"]).upper() == "Y"

print(f"\nIdentified {len(in_records)} sequence entries...")
print(f"Screening across {len(tgt_records)} target sequences...")

# Status messages highlight the completion of an ESA step, distinguished by time-sleep commands.

run_number = 1
results_df = pd.DataFrame(columns = ["Name", "Target", "Identity-Score", "Direction", "Most-Likely-ORF", "Notes"])
top_hits = defaultdict(list)

# Go sequence-by-sequence, repeating the 6FT + alignment pipeline for each.
for record in in_records.values():
    time.sleep(0.5)
    print(f"\n*** Run #{run_number} of {len(in_records)} ***\n")
    time.sleep(0.5)
    print(f"NAME: {record.id}")
    print(f"SEQUENCE: {repr(record.seq)}\n")
    
    frame_set = generate_frames(str(record.seq), strand_direction, verbose = verbose_flag)
    print(">> STATUS: Frame generation complete!\n")
    time.sleep(0.5)

    empty_result = all(len(frame.get('orf_set')) == 0 for frame in frame_set.values())
    if not empty_result: # If we yield some significant open reading frames...
        time.sleep(0.5)
        all_orfs = enumerate_orfs(frame_set)
        print(">> STATUS: Aggregating all viable amino acid sequences!\n")

        '''
        This code optimizes ORF selection by choosing the one with longest AA coverage.
        Feel free to comment out the all_orfs segment and replace for faster compute!

        ref_frame, optimal_seq, length, start_pos = select_seq(frame_set, verbose = verbose_flag)
        print(">> STATUS: Viable amino acid sequence found!\n")

        '''

        print(f">> STATUS: Computing best alignment among {len(tgt_records)} target entries...\n")
        time.sleep(0.5)

        # Declare instance variables to keep a running tally of the highest-performing ORF alignment for
        # the current sequence, using top_hits (defined earlier) as a min heap for top-K data storage.
        max_lca, final_align_res, top_orf = 0, None, None

        for orf in all_orfs:
            align_res = align(query=orf, target_set=tgt_records, top_hits=top_hits, identity_ratio=0.98)
            # print(align_res["alignment"]) -> Intermediate Debugging Output

            # If this ORF result yields a longer continuous overlap than we've seen before, update metadata
            # and rehash the 'best' variables from above.
            if align_res.get('length') > max_lca:
                max_lca = align_res.get('length')
                final_align_res = align_res
                top_orf = orf
        
        # Print out the alignment object along with a suite of summary statistics.
        summarize_align_result(final_align_res)
        print(">> STATUS: Pairwise alignment finished!\n")
        
        # Add a new results row to our growing data repository.
        results_df = data_export(results_df, record.id, strand_direction, top_orf, final_align_res.get("identity_pct"), 
                                 final_align_res.get("target"), "")
    else:
        print(">> STATUS: No valid AA reads found.\n")
        results_df = data_export(results_df, record.id, strand_direction, "N/A", "N/A", "N/A")
    
    time.sleep(0.5)
    print(">> STATUS: Run data exported!")
    
    run_number += 1

# Preparing the CSV outpath by accounting for directory chains and Windows/Linux/macOS slash differences.
infile = infile.replace("\\", "/") if "\\" in infile else infile
prefix = "" if os.path.dirname(infile) == "" else os.path.dirname(infile) + os.sep

# Save the aggregate results!
base_filename = f"{prefix}ESA-Results-{time.strftime('%m-%d-%Y')}"
results_dir = base_filename

# Handle multiple runs in one day, rename accordingly.
repeat_counter = 1
while os.path.isdir(results_dir):
    results_dir = f"{base_filename}-{repeat_counter}"
    repeat_counter += 1
os.mkdir(results_dir)

# Export the ORF-target association dataframe and the top-scoring ORFs per target to the
# newly-created results directory.
results_df.to_csv(f"{results_dir}/orf-target-mappings.csv", index=False)
target_map_df = build_target_map(top_hits)
target_map_df.to_csv(f"{results_dir}/top-orfs-by-target.csv", index=False)

print("\n***\n\nProcess complete! Your results should be available for viewing in a CSV file.\n")
