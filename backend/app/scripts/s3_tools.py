import os
import boto3
from dotenv import load_dotenv

load_dotenv()

aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
bucket_name = os.getenv("FASTA_S3_BUCKET_NAME")

# Expose this to be used everywhere
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
