from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.scripts.aws_tools import * # We can access our premade S3 client here!
from botocore.exceptions import ClientError

DB_BUCKET_NAME = os.environ.get("DB_S3_BUCKET_NAME")
DB_S3_KEY = "database/storage.db"
LAMBDA_DB_PATH = "/tmp/storage.db"

if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{LAMBDA_DB_PATH}"
else:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./storage.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        if not os.path.exists(LAMBDA_DB_PATH):
            print(f"DB not found at {LAMBDA_DB_PATH}. Downloading from S3...")
            try:
                s3_client.download_file(DB_BUCKET_NAME, DB_S3_KEY, LAMBDA_DB_PATH)
                print("DB downloaded.")
            except ClientError as e:
                if e.response['Error']['Code'] == '404':
                    print("No existing DB on S3. A new one will be created shortly.")
                else:
                    raise e
                
    db = SessionLocal()
    try:
        yield db
    finally:
        if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
            print(f"Uploading DB from {LAMBDA_DB_PATH} back to S3...")
            try:
                db.commit()
                s3_client.upload_file(LAMBDA_DB_PATH, DB_BUCKET_NAME, DB_S3_KEY)
                print("DB uploaded.")
            except Exception as e:
                print(f"CRITICAL: Failed to upload DB to S3! Error: {e}")
        
        db.close()

def reset_database():
    """Drops and recreates all tables."""
    print("--- Resetting Database ---")
    # Make sure all models are imported before calling drop_all / create_all!
    import models 
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("--- Database Reset Complete ---")