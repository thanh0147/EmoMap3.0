from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
from groq import Groq
import os
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load biến môi trường từ file .env
load_dotenv()

# Lấy thông tin Supabase từ .env
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

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


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Pydantic Model -----
class Survey(BaseModel):
    name: str
    class_: str
    gender: str
    avatar: str | None = None
    q1: str | None = None
    q2: str | None = None
    q3: str | None = None
    q4: str | None = None
    q5: str | None = None
    q6: str | None = None
    q7: str | None = None
    q8: str | None = None
    message: str | None = None

import re

def clean_ai_text(text: str):
    # Xoá thẻ <think> ... </think> và nội dung bên trong
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    return text.strip()

# ----- Hàm gọi Groq AI -----
def generate_ai_response(data: Survey):
    completion = client.chat.completions.create(
        model = "qwen/qwen3-32b",
        messages=[
      {
        "role": "system",
        "content": """Bạn là Emo, một giáo viên rất yêu thương HS, một chuyên gia tâm lý học đường ảo của học sinh THPT.  
        Giọng văn của bạn khi khuyên học sinh nên:
        - Ấm áp, chân thành, phù hợp với học sinh THPT   
        - Không phán xét  
        - Không dùng từ chuyên môn tâm lý học quá nhiều   
        - Hãy thêm emoji nhẹ nhàng để tăng cảm xúc tích cực
        """
      },
      {
        "role": "user",
        "content": f"""
        Lắng nghe và đưa ra lời khuyên nhẹ nhàng, truyền cảm hứng cho ngày hôm sau. HS sẽ cung cấp cho bạn các thông tin.
        Hãy phản hồi theo cấu trúc chỉ với 3 đoạn trừ lời chào sau:
        - Lời chào thân mật (gọi tên học sinh theo cách dễ thương, gần gũi).
        - Đoạn tâm sự ngắn gọn thể hiện sự thấu hiểu và đồng cảm với tâm sự của học sinh (dùng ngôn ngữ nhẹ nhàng, không phán xét).
        - Đưa ra lời khuyên tích cực, ngắn gọn giúp học sinh biết nên làm gì để có một ngày vui hơn hoặc nhẹ lòng hơn vào ngày hôm sau (gợi ý hành động cụ thể).  
        - Kết thúc bằng một thông điệp ngắn gọn khích lệ (ví dụ: “Ngày mai chắc chắn sẽ tốt hơn đó 🌈” hoặc “Bạn đang làm rất tốt rồi, đừng quên mỉm cười nhé 💪”).
            Một học sinh vừa chia sẻ cảm xúc của mình như sau:\nTên của HS là {data.name}, giới tính là {data.gender}.\n
            Các cảm xúc học sinh chia sẻ:
                1. {data.q1}
                2. {data.q2}
                3. {data.q3}
                4. {data.q4}
                5. {data.q5}
                6. {data.q6}
                7. {data.q7}
                8. {data.q8}
                Tâm sự thêm: {data.message}
        """
      }
    ],
        temperature=0.6,
        max_completion_tokens=4096,
        top_p=0.95,
        reasoning_effort="default",
        stream=False,
        stop=None
    )

    cleaned = clean_ai_text(completion.choices[0].message.content)
    return cleaned

def calculate_risk_score(data: Survey):
    score = 0
    
    # ---- 1) Chấm từng câu Likert ----
    negative_keywords = ["buồn","buồn bã","không vui" "mệt","lạc lõng" "sợ hãi", "căng thẳng", "cô đơn", "lo lắng", "sợ", "tức giận"]

    answers = [data.q1, data.q2, data.q3, data.q4, data.q5, data.q6, data.q7, data.q8]
    for a in answers:
        if a:
            for kw in negative_keywords:
                if kw in a.lower():
                    score += 8  # mỗi cảm xúc tiêu cực +8
    
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

        Vui lòng can thiệp sớm theo hướng dẫn chuyên môn.
    """)

    msg["Subject"] = f"[EmoMap] Cảnh báo cảm xúc nguy cơ cao — {data.name} ({risk_score})"
    msg["From"] = "emomap@system.com"
    msg["To"] = "txt0147.03@gmail.com"

    try:
        # Example Gmail SMTP
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login("txt0147.03@gmail.com", os.getenv("ALERT_PASS"))
            server.send_message(msg)
    except:
        print("Không gửi được email cảnh báo")

# ----- API chính -----
@app.post("/submit")
def submit(data: Survey):
    # --- 1. AI tạo phản hồi ---
    ai_text = generate_ai_response(data)

    # --- 2. Tính điểm rủi ro ---
    risk = calculate_risk_score(data)

    # --- 3. Nếu rủi ro cao → gửi cảnh báo ---
    if risk >= 60:
        send_alert_email(data, risk)

    # --- 4. Lưu database ---
    supabase.table("emomap").insert({
        "name": data.name,
        "class": data.class_,
        "gender": data.gender,
        "avatar": data.avatar,
        "q1": data.q1,
        "q2": data.q2,
        "q3": data.q3,
        "q4": data.q4,
        "q5": data.q5,
        "q6": data.q6,
        "q7": data.q7,
        "q8": data.q8,
        "message": data.message,
        "ai_response": ai_text,
        "risk": risk
    }).execute()

    return {
        "ai_response": ai_text,
        "risk_score": risk
    }


@app.get("/")
def root():
    return {"message": "Backend EmoMap chạy với Groq + Qwen2.5-32b!"}

@app.get("/dashboard/summary")
async def get_dashboard_summary():
    data = supabase.table("emomap").select("*").execute().data

    total = len(data)
    high_risk = len([x for x in data if x.get("risk", 0) >= 70])
    medium_risk = len([x for x in data if 40 <= x.get("risk", 0) < 70])

    avg_risk = sum([x.get("risk", 0) for x in data]) / total if total else 0

    return {
        "total_records": total,
        "avg_risk": round(avg_risk, 2),
        "high_risk": high_risk,
        "medium_risk": medium_risk,
    }
@app.get("/dashboard/high-risk")
async def get_high_risk_students():
    data = supabase.table("emomap").select("*").execute().data
    high = [x for x in data if x.get("risk", 0) >= 70]

    return {
        "count": len(high),
        "students": high
    }
@app.get("/dashboard/timeline")
async def get_timeline():
    data = supabase.table("emomap").select("created_at, risk").order("created_at").execute().data

    timeline = [
        {
            "date": x["created_at"],
            "risk": x["risk"]
        }
        for x in data
    ]

    return timeline
import datetime

@app.get("/dashboard/heatmap")
async def get_heatmap():
    data = supabase.table("emomap").select("created_at, risk").execute().data

    heat = {}

    for x in data:
        date = datetime.datetime.fromisoformat(x["created_at"].replace("Z", ""))
        day = date.strftime("%Y-%m-%d")

        if day not in heat:
            heat[day] = []

        heat[day].append(x["risk"])

    # Trung bình cảm xúc mỗi ngày
    heatmap = [
        {"date": k, "avg_risk": sum(v)/len(v)}
        for k, v in heat.items()
    ]

    return heatmap
@app.get("/dashboard/all")
async def get_all_data():
    res = supabase.table("emomap").select("*").order("created_at").execute()
    return res.data
@app.get("/dashboard/class/{class_name}")
async def get_by_class(class_name: str):
    res = supabase.table("emomap").select("*").eq("class", class_name).execute()
    return res.data
@app.get("/dashboard/gender/{gender}")
async def get_by_gender(gender: str):
    res = supabase.table("emomap").select("*").eq("gender", gender).execute()
    return res.data
