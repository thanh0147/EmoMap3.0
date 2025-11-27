import os
from supabase import create_client, Client
from dotenv import load_dotenv
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from database import Base # Dòng này chắc chắn đã có sẵn ở đầu file của bạn

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

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
