from fastapi import FastAPI
from mangum import Mangum

from fastapi.middleware.cors import CORSMiddleware
from app.routers.sequence import router as sequence_router
from app.routers.auth import router as auth_router
from app.routers.files import router as files_router
from app.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI()
app.include_router(sequence_router)
app.include_router(auth_router)
app.include_router(files_router)

origins = [
    "http://localhost:5173",
    "https://simpliseq.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
async def read_root():
    return "Server is running."

handler = Mangum(app)