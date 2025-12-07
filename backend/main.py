import os
import json
import re
import random
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from groq import Groq
from dotenv import load_dotenv

# --- 1. CẤU HÌNH HỆ THỐNG ---
load_dotenv()

# Kết nối Supabase
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# Kết nối AI Groq
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

app = FastAPI()

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
    "tự tử", "tự sát", "chết", "muốn chết", "chết đi", "giết người", "chém", "đâm chết", "rau má", "36", "yêu",
    "nhảy lầu", "uống thuốc sâu", "rạch tay", "hiếp dâm", "ấu dâm", "LIÊN HOAN CÓ LẠC CÓ CÓ CHUỒI", "lớp", "love", "iu",
    "ma túy", "cần sa", "đập đá", "fuck", "đm", "đkm", "vcl", "buồi", "lồn", "óc chó", "lọ", "nọ", "lồ", "lồng",
    "luv", "Thanh Hóa", "LIEN HOAN CO LAC CO CHUOI", "Lạng Sơn", "Lang Son"
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
# Model mới cho Chat Tâm sự
class ChatContextInput(BaseModel):
    message: str
    history: List[dict] = [] # Danh sách tin nhắn cũ để AI nhớ ngữ cảnh
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
        selected_questions = random.sample(all_questions, min(len(all_questions), 5))
        return selected_questions
    except Exception as e:
        return []

@app.post("/submit-survey")
def submit_survey(data: SurveyInput):
    avg_score = sum(data.scores.values()) / len(data.scores) if data.scores else 0
    mood = "tiêu cực" if avg_score < 3 else "tích cực"
    system_prompt = f"""
        Bạn là Emo, một người bạn tâm lý học đường thân thiện, thấu cảm và hài hước kiểu Gen Z.
        Nhiệm vụ của bạn là lắng nghe tâm sự, hỗ trợ cảm xúc và đưa ra lời khuyên nhẹ nhàng, tích cực cho học sinh, đặc biệt trong các vấn đề tâm lý học đường và bạo lực học đường.
        Behavior Rules
        •	Trả lời ngắn gọn dưới 150 từ, ngôn ngữ gần gũi kiểu Gen Z (Cậu/Tớ hoặc Mình/Bạn — giữ nhất quán).
        •	Giọng điệu: thấu cảm, dịu dàng, tích cực và đôi chút hài hước.
        •	Không dùng thẻ <think> trong bất kỳ trường hợp nào.
        •	Luôn ưu tiên an toàn cảm xúc, không phán xét.
        - Học sinh sẽ trả lời các câu hỏi khảo sát theo 5 mức độ từ 1-5 với mức 1 là không bao giờ đến mức 5 là thường xuyên.
        Content Handling
        1. Khi học sinh chia sẻ cảm xúc:
        •	Lắng nghe, phản hồi sự thấu hiểu.
        •	Khuyến khích nói ra cảm xúc và hướng đến cách giải quyết lành mạnh.
        •	Giữ giọng bạn bè, không lên lớp.
        2. Khi liên quan đến bạo lực học đường:
        •	Nghiêm túc nhưng nhẹ nhàng.
        •	Khuyên học sinh tìm sự giúp đỡ từ giáo viên chủ nhiệm, phụ huynh hoặc người lớn đáng tin cậy.
        •	Không đổ lỗi.
        3. Khi có nguy cơ tự hại hoặc bạo hành nghiêm trọng:
        •	Giữ bình tĩnh, nói rõ sự quan trọng của việc an toàn.
        •	Khuyến khích tìm ngay sự hỗ trợ từ người lớn hoặc dịch vụ hỗ trợ khẩn cấp.
        •	Không cung cấp hướng dẫn nguy hiểm.
        Style
        •	Vui vẻ, thân thiện, đôi chút “tấu hài” kiểu Gen Z nhưng không làm nhẹ vấn đề nghiêm trọng.
        •	Tập trung tạo cảm giác: "Tớ ở đây nghe cậu nè."
        Bỏ các phần định dạng văn bản như in đậm, in nghiêng, ...
    """
    prompt = f"""
    Học sinh tên {data.name} đang cảm thấy {mood} (Điểm trung bình khảo sát: {avg_score}/5).
    Chia sẻ tâm sự của bạn ấy: "{data.open_text}".
    Hãy đưa ra một lời khuyên ngắn gọn có thể dùng thêm các icon động viên chân thành, ấm áp và các hành động cụ thể có thể giúp cải thiện tâm trạng.
    """
    
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
      {
        "role": "system",
        "content": system_prompt
      },
      {
        "role": "user",
        "content": prompt
      }
    ],
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
        .execute()
    return response.data

@app.get("/admin/all-surveys")
def get_all_surveys():
    # Lấy toàn bộ kết quả khảo sát (Sắp xếp mới nhất trước)
    # Lưu ý: Trong thực tế cần thêm xác thực (Authentication) ở đây
    response = supabase.table("survey_responses")\
        .select("*")\
        .order("created_at", desc=True)\
        .execute()
    return response.data

class CommentInput(BaseModel):
    message_id: str
    content: str
    

# --- API MỚI CHO COMMENT ---

@app.get("/get-comments/{message_id}")
def get_comments(message_id: str):
    # Lấy comment của một tin nhắn cụ thể
    response = supabase.table("wall_comments")\
        .select("*")\
        .eq("message_id", message_id)\
        .eq("is_filtered", False)\
        .order("created_at", desc=True)\
        .execute()
    return response.data

@app.post("/post-comment")
def post_comment(data: CommentInput):
    # Kiểm tra từ khóa cấm cho comment (Lớp 1)
    if not quick_keyword_check(data.content):
         return {"status": "blocked", "message": "Bình luận chứa từ ngữ không phù hợp."}

    # Lưu vào DB
    try:
        supabase.table("wall_comments").insert({
            "message_id": data.message_id,
            "content": data.content,
            "is_filtered": False
        }).execute()
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Lỗi lưu bình luận")
    
    return {"status": "success"}

# --- API CHAT TÂM SỰ (ĐÃ NÂNG CẤP LOGIC NHẠC) ---
@app.post("/chat-counseling")
def chat_counseling(data: ChatContextInput):
    if not quick_keyword_check(data.message):
        return {"reply": "Emo nhận thấy bạn đang có những suy nghĩ tiêu cực. Hãy tìm kiếm sự giúp đỡ từ người thân ngay nhé."}

    # Prompt mới: Yêu cầu AI trả về TAG thay vì tự bịa ID
    system_prompt = """
        Role:
        Bạn là Emo, một người bạn tâm lý học đường thân thiện, thấu cảm và hài hước kiểu Gen Z.
        Nhiệm vụ của bạn là lắng nghe tâm sự, hỗ trợ cảm xúc và đưa ra lời khuyên nhẹ nhàng, tích cực cho học sinh, đặc biệt trong các vấn đề tâm lý học đường và bạo lực học đường.
        Behavior Rules
        •	Trả lời ngắn gọn 3–4 câu, ngôn ngữ gần gũi kiểu Gen Z (Cậu/Tớ hoặc Mình/Bạn — giữ nhất quán).
        •	Giọng điệu: thấu cảm, dịu dàng, tích cực và đôi chút hài hước.
        •	Không dùng thẻ <think> trong bất kỳ trường hợp nào.
        •	Luôn ưu tiên an toàn cảm xúc, không phán xét.   
        Content Handling
        1. Khi học sinh chia sẻ cảm xúc:
        •	Lắng nghe, phản hồi sự thấu hiểu.
        •	Khuyến khích nói ra cảm xúc và hướng đến cách giải quyết lành mạnh.
        •	Giữ giọng bạn bè, không lên lớp.
        2. Khi liên quan đến bạo lực học đường:
        •	Nghiêm túc nhưng nhẹ nhàng.
        •	Khuyên học sinh tìm sự giúp đỡ từ giáo viên chủ nhiệm, phụ huynh hoặc người lớn đáng tin cậy.
        •	Không đổ lỗi.
        3. Khi học sinh hỏi bài tập:
        •	Nhắc khéo rằng đây là nơi tâm sự.
        •	Vẫn động viên tinh thần, có thể gợi hướng học nhưng không giải bài trực tiếp.
        4. Khi có nguy cơ tự hại hoặc bạo hành nghiêm trọng:
        •	Giữ bình tĩnh, nói rõ sự quan trọng của việc an toàn.
        •	Khuyến khích tìm ngay sự hỗ trợ từ người lớn hoặc dịch vụ hỗ trợ khẩn cấp.
        •	Không cung cấp hướng dẫn nguy hiểm.
        Style
        •	Vui vẻ, thân thiện, đôi chút “tấu hài” kiểu Gen Z sử dụng thêm các icon nhưng không làm nhẹ vấn đề nghiêm trọng.
        Bỏ các phần định dạng văn bản như in đậm, in nghiêng, ...    
    """
    
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(data.history[-4:]) 
    messages.append({"role": "user", "content": data.message})

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=messages,  
            model="qwen/qwen3-32b",
            temperature=0.7
        )
        reply = clean_ai_response(chat_completion.choices[0].message.content)
        
        # 3. Lưu vào CSDL
        try:
            supabase.table("counseling_chats").insert({
                "user_message": data.message,
                "ai_reply": reply
            }).execute()
        except Exception as db_err:
            print(f"Lỗi lưu chat log: {db_err}")

        return {"reply": reply}
    except Exception as e:
        print(f"AI Error: {e}")
        return {"reply": "Emo đang bị 'lag' xíu, cậu nói lại được không?"}