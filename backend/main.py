
import os
import json
import re
import random
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session  # <-- Để dùng cho biến 'db: Session'
from pydantic import BaseModel
from supabase import create_client, Client
from groq import Groq
from dotenv import load_dotenv

# --- 1. CẤU HÌNH HỆ THỐNG ---
import os
import database 
import models
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
# Load biến môi trường từ file .env
load_dotenv()

# Kết nối Supabase
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# Kết nối AI Groq
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

app = FastAPI()
# Validate biến môi trường
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Lỗi: Không tìm thấy SUPABASE_URL hoặc SUPABASE_KEY trong .env")

# Tạo Supabase client (đúng kiểu)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_supabase():
    """
    Hàm helper để import trong các file khác.
    Usage:
        from database import get_supabase
        supabase = get_supabase()
    """
    return supabase
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ----- Cấu hình AI (Groq + Qwen2.5-32B) -----
client = Groq(api_key=GROQ_API_KEY)

# ----- FastAPI -----

from fastapi import FastAPI
from database import get_supabase

app = FastAPI()
supabase = get_supabase()


@app.get("/test")
def test():
    data = supabase.table("emomap").select("*").execute()
    return {"total": len(data.data)}


# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. DANH SÁCH TỪ KHÓA CẤM (LỚP BẢO VỆ 1) ---
FORBIDDEN_KEYWORDS = [
    "tự tử", "tự sát", "chết", "muốn chết", "chết đi", "giết người", "chém", "đâm chết", 
    "nhảy lầu", "uống thuốc sâu", "rạch tay", "hiếp dâm", "ấu dâm", 
    "ma túy", "cần sa", "đập đá", "fuck", "đm", "đkm", "vcl", "buồi", "lồn", "óc chó"
]

# --- 3. DATA MODELS ---
class SurveyInput(BaseModel):
    name: Optional[str] = "Ẩn danh"
    student_class: str
    gender: str
    scores: dict 
    open_text: str

class MessageInput(BaseModel):
    content: str

# --- 4. CÁC HÀM XỬ LÝ (HELPER FUNCTIONS) ---

def clean_ai_response(text: str) -> str:
    """Loại bỏ thẻ suy nghĩ <think> của AI nếu có"""
    return re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()

def quick_keyword_check(content: str):
    """Kiểm tra nhanh từ khóa cấm"""
    content_lower = content.lower()
    for word in FORBIDDEN_KEYWORDS:
        if word in content_lower:
            return False # Phát hiện từ cấm -> Không an toàn
    return True # Tạm ổn

def analyze_wall_message(content):
    """
    Phân tích nội dung để chọn màu và kiểm duyệt.
    """
    
    # BƯỚC 1: KIỂM TRA TỪ KHÓA CỨNG
    if not quick_keyword_check(content):
        return {"safe": False, "color": "red"}

    # BƯỚC 2: DÙNG AI ĐỂ HIỂU NGỮ CẢNH
    prompt = f"""
    Phân tích câu nói tiếng Việt: "{content}"
    
    Nhiệm vụ 1: Kiểm duyệt an toàn (Safety Check)
    - Nếu nội dung liên quan đến: Tự làm hại bản thân (self-harm), Tự tử (suicide), Bạo lực học đường, Bắt nạt, Quấy rối, Từ ngữ tục tĩu, Chửi thề -> Trả về "safe": false.
    - Lưu ý: Những câu như "tôi muốn biến mất", "chán sống", "muốn đi xa mãi mãi" phải coi là KHÔNG AN TOÀN (false).
    
    Nhiệm vụ 2: Chọn màu cảm xúc (Color Check)
    - Tức giận, phẫn nộ, gay gắt -> "red"
    - Buồn bã, trầm cảm, mệt mỏi, muốn khóc -> "blue"
    - Lo lắng, sợ hãi, áp lực thi cử -> "purple"
    - Vui vẻ, tích cực, biết ơn -> "yellow"
    - Bình thường, bình tĩnh -> "green"
    
    Chỉ trả về định dạng JSON duy nhất:
    {{
        "safe": true hoặc false,
        "color": "red"/"blue"/"purple"/"yellow"/"green"
    }}
    """
    
    # ---- 2) Chấm phần tâm sự ----
    msg = (data.message or "").lower()
    danger_words = ["bị đánh", "bị bắt nạt", "không muốn đến trường", 
                    "tự tử", "muốn biến mất", "không chịu nổi", "bị xâm hại"]

    for kw in danger_words:
        if kw in msg:
            score += 25

    # ---- 3) Chấm độ dài tâm sự (ý nghĩa hơn = risk cao hơn) ----
    length = len(msg.split())
    if length > 15: score += 7
    if length > 40: score += 5

    # ---- Giới hạn 0–100 ----
    return min(score, 100)

import smtplib
from email.mime.text import MIMEText

def send_alert_email(data: Survey, risk_score: int):
    msg = MIMEText(f"""
        ⚠️ CẢNH BÁO RỦI RO CAO HỌC ĐƯỜNG

        Học sinh: {data.name}
        Lớp: {data.class_}
        Giới tính: {data.gender}
        Điểm rủi ro: {risk_score}

        Nội dung tâm sự:
        "{data.message}"

        Vui lòng can thiệp sớm theo hướng dẫn chuyên môn.""")

    msg["Subject"] = f"[EmoMap] Cảnh báo cảm xúc nguy cơ cao — {data.name} ({risk_score})"
    msg["From"] = "emomap@system.com"
    msg["To"] = "txt0147.03@gmail.com"

    try:
        completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="qwen/qwen3-32b",
            response_format={"type": "json_object"},
            temperature=0.3
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"AI Error: {e}")
        return {"safe": True, "color": "gray"}

# --- 5. API ENDPOINTS ---

@app.get("/")
def read_root():
    return {"status": "Server Emo Buddy đang chạy!"}

@app.get("/get-random-questions")
def get_random_questions():
    try:
        response = supabase.table("survey_questions").select("*").limit(50).execute()
        all_questions = response.data
        selected_questions = random.sample(all_questions, min(len(all_questions), 8))
        return selected_questions
    except Exception as e:
        return []

@app.post("/submit-survey")
def submit_survey(data: SurveyInput):
    avg_score = sum(data.scores.values()) / len(data.scores) if data.scores else 0
    mood = "tiêu cực" if avg_score < 3 else "tích cực"
    
    prompt = f"""
    Bạn là Emo, một người bạn tâm lý học đường ân cần. 
    Học sinh tên {data.name} đang cảm thấy {mood} (Điểm trung bình khảo sát: {avg_score}/5).
    Chia sẻ tâm sự của bạn ấy: "{data.open_text}".
    Hãy đưa ra một lời khuyên ngắn gọn có thể dùng thêm các icon động viên (dưới 150 từ), chân thành, ấm áp và các hành động cụ thể có thể giúp cải thiện tâm trạng.
    """
    
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="qwen/qwen3-32b",
        )
        ai_advice = clean_ai_response(chat_completion.choices[0].message.content)
    except Exception as e:
        ai_advice = "Hiện tại Emo đang bận một chút, nhưng cậu hãy nhớ luôn có mọi người bên cạnh nhé!"

    try:
        supabase.table("survey_responses").insert({
            "student_name": data.name,
            "student_class": data.student_class,
            "gender": data.gender,
            "metrics": data.scores,
            "open_ended_answer": data.open_text,
            "ai_advice": ai_advice
        }).execute()
    except Exception as e:
        print(f"Database Error: {e}")
    
    return {"advice": ai_advice}

# --- PHẦN QUAN TRỌNG NHẤT ĐÃ ĐƯỢC SỬA ---
@app.post("/post-message")
def post_message(msg: MessageInput):
    # 1. Phân tích nội dung (Safety & Color)
    analysis = analyze_wall_message(msg.content)
    
    is_safe = analysis.get("safe", False)
    color = analysis.get("color", "gray")
    
    # 2. QUYẾT ĐỊNH: Nếu KHÔNG an toàn -> DỪNG NGAY LẬP TỨC
    if not is_safe:
        # Trả về thông báo bị chặn, KHÔNG lưu vào DB
        return {
            "status": "blocked", 
            "safe": False, 
            "message": "Tin nhắn đã bị chặn do nội dung không phù hợp."
        }
    
    # 3. Chỉ khi an toàn mới lưu vào Database
    try:
        supabase.table("wall_messages").insert({
            "content": msg.content,
            "sentiment_color": color,
            "is_filtered": False
        }).execute()
    except Exception as e:
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail="Lỗi lưu tin nhắn")
    
    return {"status": "success", "color": color, "safe": True}

@app.get("/get-messages")
def get_messages():
    response = supabase.table("wall_messages")\
        .select("*")\
        .order("created_at", desc=True)\
        .limit(50)\
        .execute()
    return response.data
