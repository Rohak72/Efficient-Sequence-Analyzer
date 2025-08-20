import os
import boto3
from dotenv import load_dotenv

load_dotenv()

if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    # --- IN CLOUD (PRODUCTION) ---
    print("Running in Lambda, using IAM Role for S3 credentials.")
    # When in Lambda, boto3 will automatically find the IAM Role credentials.
    # We do not need to provide any keys. This is the most secure method.
    s3_client = boto3.client("s3", region_name="us-east-2")
    
    # Get the bucket name from the environment variables set in serverless.yml
    bucket_name = os.environ.get("FASTA_S3_BUCKET_NAME")
else:
    # --- ON YOUR LAPTOP (LOCAL DEVELOPMENT) ---
    print("Running locally, using .env file for S3 credentials.")
    # When running locally, get the credentials from your .env file.
    aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    bucket_name = os.getenv("FASTA_S3_BUCKET_NAME")

    # Initialize the client with your local credentials
    s3_client = boto3.client(
        's3',
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        region_name="us-east-2"
    )

def get_bucket_name():
    return bucket_name

def generate_presigned_url(key: str, filename: str = None, expires: int = 3600):
    params = {
        'Bucket': bucket_name,
        'Key': key,
    }

    if filename:
        params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'

    return s3_client.generate_presigned_url('get_object', Params=params, ExpiresIn=expires)
