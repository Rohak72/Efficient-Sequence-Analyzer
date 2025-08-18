# -*- coding: utf-8 -*-
# utils.py

"""
Author: Rohak Jain
Last Date Modified: 2025-08-03
Description: 'utils' is responsible for verifying the user input in the ESA pipeline, distilling
down the information in the input FASTA into a series of sequence records, and relaying the results
generated to an external dataframe. Functions as a helper script for main.  

"""

from Bio import SeqIO
import pandas as pd

def process_fasta(filename: str):
    try:
        raw_seq_library = SeqIO.to_dict(SeqIO.parse(filename, "fasta"))
        simplified_fasta_seqs = {target_id: str(record.seq) for target_id, record in raw_seq_library.items()}
        return simplified_fasta_seqs
    except FileNotFoundError: # Re-initiating the FASTA input if no file was found.
        print("File not found; please check your path/spelling and try again!")
        get_input("Enter the filepath/filename of your FASTA: ", ".fasta", "ending")

def get_input(prompt: str, valid_set: list, mode: str = "options"):
    while True:
        value = input(prompt).strip() # Removing extraneous whitespace from the input string.
        
        if mode == "options" and value.upper() not in valid_set:
            print(f"Sorry, your response must be one of the following: {', '.join(valid_set)}")
            continue
        elif mode == "substr" and not all(x.isalpha() for x in value):
            print(f"Sorry, your response must only be comprised of {valid_set}")
            continue
        elif mode == "ending" and not value.endswith(valid_set):
            print(f"Sorry, your response must end with {valid_set}")
            continue
        else:
            break

    return value

def data_export(df: pd.DataFrame, seq_name: str, direction: str, likely_orf: str, align_perf: float, 
                target: str, notes: str):
    new_row = {"Name": seq_name,
               "Target": target,
               "Identity-Score": align_perf,
               "Direction": direction,
               "Most-Likely-ORF": likely_orf,
               "Notes": notes}
    
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index = True) # Appending new row.
    return df

def build_target_map(target_orf_hits: dict):
    rows = []
    for target, hits in target_orf_hits.items():
        hits = sorted(hits, key=lambda x: x[0], reverse=True)
        for identity, lca, source_orf, source_seq in hits:
            rows.append({
                "Target": target,
                "Identity-Score": identity,
                "LCA": lca,
                "Source-Seq": source_seq,
                "Source-ORF": source_orf
            })

    df = pd.DataFrame(rows)
    return df
