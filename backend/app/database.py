from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def reset_database():
    """Drops and recreates all tables."""
    print("--- Resetting Database ---")
    # Make sure all models are imported before calling drop_all / create_all
    # This is often done by importing the models module
    import models 
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("--- Database Reset Complete ---")