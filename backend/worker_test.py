import uuid
from worker_handler import process_alignment_job
from app.scripts.aws_tools import redis_client, fasta_bucket_name, s3_client
import json
import asyncio

# 1. Create a mock job message
job_id = str(uuid.uuid4())
mock_message = {
    "job_id": job_id,
    "input_key": "tmp/Input.fasta",    # already in S3
    "target_key": "tmp/Targets.fasta", # already in S3
    "direction": "BOTH",
    "user_id": None
}

# 2. Call the worker function
async def main():
    await process_alignment_job(mock_message)

asyncio.run(main())

# 3. Inspect Redis status
job_status = redis_client.hgetall(job_id)
print("Redis job status:", json.dumps(job_status, indent=2))

# 4. Optionally, verify the S3 outputs exist
alignment_key = f"tmp/{job_id}/alignment_res.json"
top_hits_key = f"tmp/{job_id}/top_hits.json"
frames_key = f"tmp/{job_id}/frames.json"

for key in [alignment_key, top_hits_key, frames_key]:
    try:
        s3_client.head_object(Bucket=fasta_bucket_name, Key=key)
        print(f"{key} exists in S3 ✅")
    except:
        print(f"{key} NOT FOUND in S3 ❌")
