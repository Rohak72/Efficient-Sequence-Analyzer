from dotenv import load_dotenv
load_dotenv()

import boto3
import json
import os
import io

fasta_bucket_name = os.environ.get("FASTA_S3_BUCKET_NAME")
sqs_queue_url = os.environ.get("JOB_QUEUE_URL")
dynamo_table_name = os.environ.get("DYNAMO_TABLE_NAME", "JobStatus")

sqs_client = boto3.client("sqs")
dynamo = boto3.resource("dynamodb")
jobs_table = dynamo.Table(dynamo_table_name)

# In Lambda, boto3 will automatically find the IAM Role credentials -- no keys needed.
# However, when running locally, we need to collect the credentials ourselves.
if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    print("Running in Lambda, using IAM Role for S3 credentials.")
    s3_client = boto3.client("s3", region_name="us-east-2")
else:
    print("Running locally, using .env file for S3 credentials.")
    aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")

    s3_client = boto3.client(
        's3',
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        region_name="us-east-2"
    )

# S3 Helpers

async def upload_to_s3(file_obj, upload_key: str):
    if isinstance(file_obj, str):
        raw_content = file_obj.encode('utf-8')
    else:
        raw_content = await file_obj.read()
    
    s3_client.put_object(Bucket=fasta_bucket_name, Key=upload_key, Body=raw_content)

def download_from_s3(file_key: str):
    file_obj = s3_client.get_object(Bucket=fasta_bucket_name, Key=file_key)
    file_content = file_obj["Body"].read().decode("utf-8")
    return io.StringIO(file_content) 

def get_bucket_name():
    return fasta_bucket_name

def generate_presigned_url(key: str, filename: str = None, expires: int = 3600):
    url_params = {'Bucket': fasta_bucket_name, 'Key': key}
    if filename:
        url_params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'

    return s3_client.generate_presigned_url('get_object', Params=url_params, ExpiresIn=expires)

# SQS Helper

def enqueue_job(job_id, input_key, target_key, direction, user_id=None):
    message = {
        "job_id": job_id,
        "input_key": input_key,
        "target_key": target_key,
        "direction": direction,
        "user_id": user_id
    }
    sqs_client.send_message(QueueUrl=sqs_queue_url, MessageBody=json.dumps(message))

    jobs_table.put_item(
        Item={
            "job_id": job_id,
            "status": "PENDING"
        }
    )

# Redis Helpers

def get_job_status(job_id):
    try:
        response = jobs_table.get_item(Key={"job_id": job_id})
        return response.get("Item", {"status": "UNKNOWN"})
    except Exception as e:
        print(f"Error fetching job status: {e}")
        return {"status": "ERROR"}
