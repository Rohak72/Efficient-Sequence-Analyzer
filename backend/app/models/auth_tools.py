from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base
from pydantic import BaseModel

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    fasta_files = relationship("FastaFile", back_populates="owner", cascade="all, delete-orphan")
    alignment_results = relationship("AlignmentResult", back_populates="owner", cascade="all, delete-orphan")

class UserCreate(BaseModel):
    username: str
    password: str