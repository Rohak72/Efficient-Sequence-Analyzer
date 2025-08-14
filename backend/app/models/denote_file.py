from app.routers.auth import *
from app.database import Base

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

class FastaFile(Base):
    __tablename__ = "fasta-files"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)
    filename = Column(String)
    s3_key = Column(String, unique=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="fasta_files")

class FastaUpdate(BaseModel):
    content: str

class AlignmentResult(Base):
    __tablename__ = "alignment-results"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))

    s3_results_key = Column(String, unique=True)
    s3_top_hits_key = Column(String, unique=True)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="alignment_results")
