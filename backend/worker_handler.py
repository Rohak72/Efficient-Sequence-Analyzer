from app.scripts.utils import *
from app.scripts.aws_tools import *
from app.scripts.build_alignment import *
from app.scripts.frame_retrieve import *

import json
import traceback
import asyncio

"""
SQS → Lambda handler → process_alignment_job
    → run_pipeline (frames, hits, results, summary)
    → Save JSON artifacts to S3
    → Redis: status, S3 keys, available targets
    → (Optional) Save permanent artifacts + presigned URLs if logged in.
"""

def handler(event: dict, context):
    print("Received JSON event!")
    for record in event.get("Records"):
        try:
            message = json.loads(record.get("body"))
            asyncio.run(process_alignment_job(message))
        except Exception:
            print("CRITICAL ERROR processing a record. See traceback below.")
            traceback.print_exc()
    
    # Debugging stdout:
    # print(f"Lambda {context.function_name} invoked with request ID: {context.aws_request_id}.")
    # print(f"Time left: {context.get_remaining_time_in_millis()} ms.")

    return {'status': 200}

async def process_alignment_job(message: dict):
    job_id = message.get("job_id")
    input_key = message.get("input_key")
    target_key = message.get("target_key")
    direction = message.get("direction")
    user_id = message.get("user_id")

    try:
        print("Downloading from S3...")
        input_fasta = download_from_s3(input_key)
        target_fasta = download_from_s3(target_key)
        print("S3 FASTAs downloaded!")
        
        print("Starting alignment pipeline...")
        frames, top_hits, alignment_results, summary_df = await run_pipeline(input_fasta, target_fasta, direction)
        available_targets = list(top_hits.keys())
        for hits in top_hits.values():
            hits.sort(key=lambda x: x[0], reverse=True)
        
        print("Finished alignment pipeline.")
        
        alignment_key = f"tmp/{job_id}/alignment_res.json"
        top_hits_key = f"tmp/{job_id}/top_hits.json"
        frames_key = f"tmp/{job_id}/frames.json"

        print("Uploading JSON artifacts to S3.")
        await upload_to_s3(json.dumps(alignment_results), alignment_key)
        await upload_to_s3(json.dumps(top_hits), top_hits_key)
        await upload_to_s3(json.dumps(frames), frames_key)

        frames_url = generate_presigned_url(frames_key)
        alignment_url = generate_presigned_url(alignment_key)
        top_hits_url = generate_presigned_url(top_hits_key)

        job_payload = {
            "status": "COMPLETED",
            "available_targets": json.dumps(available_targets),
            "result_urls": json.dumps({
                "frames": frames_url,
                "alignment": alignment_url,
                "top_hits": top_hits_url
            })
        }
        
        if user_id:
            results_key, top_hits_key = save_alignment_artifacts(results_df=summary_df, top_hits=top_hits,
                                                                current_user=user_id, s3_client=s3_client,
                                                                bucket_name=fasta_bucket_name, db=None)

            presigned_result_url = generate_presigned_url(results_key, filename="orf_mappings.csv")
            presigned_hits_url = generate_presigned_url(top_hits_key, filename="top_hits.csv")
            
            job_payload["download_links"] = json.dumps({
                "orf_mappings": presigned_result_url,
                "top_hits": presigned_hits_url
            })
        
        jobs_table.put_item(Item={"job_id": job_id, **job_payload})
        print(f"Job {job_id} completed! Results, hits, and frames saved to S3.")
    except Exception as e:
        print(f"Job {job_id} failed! Exception: {e}.")
        traceback.print_exc()
        jobs_table.put_item(Item={"job_id": job_id, "status": "FAILED"})

async def run_pipeline(input_fasta: StringIO, target_fasta: StringIO, direction: str, 
                       align_threshold: float = 0.98) -> tuple:
    input_sequences = await process_fasta_upload(input_fasta)
    target_sequences = await process_fasta_upload(target_fasta)

    all_frames_data = {}
    for name, seq in input_sequences.items():
        all_frames_data[name] = generate_frames(seq, direction)
    
    alignment_results, top_hits, summary_df = extract_alignment_results(query_frames=all_frames_data,
                                                targets=target_sequences, direction=direction,
                                                align_threshold=align_threshold)
    
    return all_frames_data, top_hits, alignment_results, summary_df

def extract_alignment_results(query_frames: Dict, targets: Dict[str, str], direction: str,
                                  align_threshold: float) -> tuple:
    """
    This is the core logic extracted from your original /align/multi endpoint.
    It can now be reused by both the old and new endpoints.
    """
    top_hits = defaultdict(list)
    results_df = pd.DataFrame(columns = ["Name", "Target", "Identity-Score", "Direction", 
                                         "Most-Likely-ORF", "Notes"])
    alignment_results = {}
    
    for seq_name, frame_data in query_frames.items():
        print(f"Processing {seq_name}...")
        all_orfs = [orf for frame in frame_data.values() for orf in frame.get('orf_set', [])]

        if not all_orfs:
            results_df = data_export(results_df, seq_name, direction, "N/A", 0.0, "N/A", notes="No ORFs!")
            alignment_results[seq_name] = {'detail': 'No valid ORFs found.'}
            continue

        results_df, final_align_res = batch_alignment_cycle(direction=direction, record_id=seq_name, 
                                                            orf_set=all_orfs, target_set=targets, 
                                                            top_hits=top_hits, curr_results_data=results_df, 
                                                            align_threshold=align_threshold)

        alignment_results[seq_name] = final_align_res or {'detail': 'No final alignment determined.'}
        
    return alignment_results, top_hits, results_df
