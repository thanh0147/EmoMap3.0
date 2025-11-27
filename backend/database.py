
from supabase import create_client, Client
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ✅ QUAN TRỌNG: Đây là 'Base' của SQLAlchemy (để tạo bảng), KHÔNG PHẢI Pydantic
Base = declarative_base()

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in .env")

    return create_client(SUPABASE_URL, SUPABASE_KEY)

class WallMessage(Base):
    __tablename__ = "wall_messages"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    emotion_color = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

