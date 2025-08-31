# -*- coding: utf-8 -*-
# utils.py

"""
Author: Rohak Jain
Last Date Modified: 2025-08-03
Description: 'utils' is responsible for verifying the user input in the ESA pipeline, distilling
down the information in the input FASTA into a series of sequence records, and relaying the results
generated to an external dataframe. Functions as a helper script for main.  

"""

from io import StringIO
from typing import Dict, Union
from app.models.denote_file import AlignmentResult
from app.models.auth_tools import User
from collections import defaultdict
from Bio import SeqIO
from datetime import datetime, timezone
from fastapi import UploadFile, HTTPException, status

import pandas as pd
import uuid

async def process_fasta_upload(fasta_file: Union[UploadFile, StringIO]) -> Dict[str, str]:
    if isinstance(fasta_file, UploadFile):
        contents = await fasta_file.read()
        stream = StringIO(contents.decode("utf-8"))
    elif isinstance(fasta_file, StringIO):
        stream = fasta_file
    else:
        raise TypeError("Param fasta_file must be of type UploadFile or StringIO!")

    try:
        raw_seq_library = SeqIO.to_dict(SeqIO.parse(stream, "fasta"))
    except Exception as e:
        raise ValueError(f"Failed to parse FASTA file: {str(e)}.")

    simplified_fasta_seqs = {
        record_id: str(record.seq)
        for record_id, record in raw_seq_library.items()
    }

    return simplified_fasta_seqs

def infer_direction(query_frames: dict) -> str:
    first_key = next(iter(query_frames))
    if len(query_frames) == 6:
        return "BOTH"
    return "FWD" if "FWD" in first_key else "REV"

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

def save_alignment_artifacts(results_df: pd.DataFrame, top_hits: defaultdict,
                             current_user: Union[User, str], s3_client, bucket_name: str, db):
    unique_id = uuid.uuid4()
    user_id = current_user if isinstance(current_user, str) else current_user.id
    results_key = f"users/{user_id}/results/{unique_id}_orf_mappings.csv"
    top_hits_key = f"users/{user_id}/results/{unique_id}_top_hits.csv"

    results_buffer = StringIO()
    results_df.to_csv(results_buffer, index=False)
    results_buffer.seek(0)

    top_hits_df = build_target_map(top_hits)
    top_hits_buffer = StringIO()
    top_hits_df.to_csv(top_hits_buffer, index=False)
    top_hits_buffer.seek(0)

    try:
        s3_client.put_object(Bucket=bucket_name, Key=results_key, Body=results_buffer.getvalue())
        s3_client.put_object(Bucket=bucket_name, Key=top_hits_key, Body=top_hits_buffer.getvalue())
    except Exception as e:
        print(f"[ERROR] S3 upload failed: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Couldn't upload alignment results.")

    db_result = AlignmentResult(
        s3_results_key=results_key,
        s3_top_hits_key=top_hits_key,
        created_at=datetime.now(timezone.utc),
        owner_id=current_user.id)
    
    db.add(db_result)
    db.commit()
    db.refresh(db_result)

    return results_key, top_hits_key
