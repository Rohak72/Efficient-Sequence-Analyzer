# -*- coding: utf-8 -*-
# utils.py

"""
Author: Rohak Jain
Last Date Modified: 2025-08-03
Description: 'utils' is responsible for verifying the user input in the ESA pipeline, distilling
down the information in the input FASTA into a series of sequence records, and relaying the results
generated to an external dataframe. Functions as a helper script for main.  

"""

import io
from app.models.denote_file import AlignmentResult
from collections import defaultdict
from Bio import SeqIO
from datetime import datetime, timezone
from fastapi import HTTPException, status

import pandas as pd
import uuid

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
        for identity, lca, orf in hits:
            rows.append({
                "Target": target,
                "Identity-Score": identity,
                "LCA": lca,
                "Source-ORF": orf
            })

    df = pd.DataFrame(rows)
    return df

def save_alignment_artifacts(results_df: pd.DataFrame, top_hits: defaultdict, final_align_res: dict,
                             current_user, s3_client, bucket_name: str, db):
    unique_id = uuid.uuid4()
    results_key = f"users/{current_user.id}/results/{unique_id}_orf_mappings.csv"
    top_hits_key = f"users/{current_user.id}/results/{unique_id}_top_hits.csv"

    results_buffer = io.StringIO()
    results_df.to_csv(results_buffer, index=False)
    results_buffer.seek(0)

    top_hits_df = build_target_map(top_hits)
    top_hits_buffer = io.StringIO()
    top_hits_df.to_csv(top_hits_buffer, index=False)
    top_hits_buffer.seek(0)

    try:
        s3_client.put_object(Bucket=bucket_name, Key=results_key, Body=results_buffer.getvalue())
        s3_client.put_object(Bucket=bucket_name, Key=top_hits_key, Body=top_hits_buffer.getvalue())
    except Exception as e:
        print(f"[ERROR] S3 upload failed: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Couldn't upload alignment results.")

    db_result = AlignmentResult(
        id=unique_id,
        summary={
            "query_name": final_align_res.get("target"), 
            "best_target": final_align_res.get("target"), 
            "identity_pct": final_align_res.get("identity_pct"), 
            "lca_length": final_align_res.get("length")
        },
        s3_results_key=results_key,
        s3_top_hits_key=top_hits_key,
        created_at=datetime.now(timezone.utc),
        owner_id=current_user.id)
    
    db.add(db_result)
    db.commit()
    db.refresh(db_result)

    return results_key, top_hits_key
