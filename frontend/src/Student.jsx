import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Heart, X, MessageCircle, Sparkles, User } from 'lucide-react';

// --- CẤU HÌNH API ---
const API_BASE_URL = "https://emomap-backend.onrender.com"; 
const MAX_NOTE_LENGTH = 50; 
const AVATAR_LIST = ["🦊", "🐼", "🐱", "🐶", "🦁", "🐰", "🐸", "🦄", "🐯", "🐨", "🐧", "🦉", "🐣", "🐝", "🐞"];
const STICKERS = ["🎄", "🎅", "❄️", "☃️", "🎁", "🦌", "✨", "🔥", "💖", "💯", "💅", "👻", "🤡", "🥺", "🌱", "🍓", "💫", "🧸", "👑", "💎", "🚀", "🌙", "🎵", "🦄"];
const RATING_OPTIONS = [
  { score: 1, icon: "😌", label: "Không bao giờ" },
  { score: 2, icon: "😕", label: "Hiếm khi" },
  { score: 3, icon: "😟", label: "Đôi khi" },
  { score: 4, icon: "😣", label: "Thỉnh thoảng" },
  { score: 5, icon: "😭", label: "Thường xuyên" }
];


const QUESTION_TYPES = {
  // Loại 1: Đồng ý / Không đồng ý (Mặc định)
  AGREEMENT: [
    { score: 1, icon: "😠", label: "Rất không đồng ý" },
    { score: 2, icon: "🙁", label: "Không đồng ý" },
    { score: 3, icon: "😐", label: "Bình thường" },
    { score: 4, icon: "🙂", label: "Đồng ý" },
    { score: 5, icon: "😍", label: "Rất đồng ý" }
  ],
  // Loại 2: Tần suất (Dành cho câu hỏi sức khỏe, thói quen)
  FREQUENCY: [
    { score: 1, icon: "😱", label: "Không bao giờ" },
    { score: 2, icon: "😥", label: "Hiếm khi" },
    { score: 3, icon: "😣", label: "Thỉnh thoảng" },
    { score: 4, icon: "🙂", label: "Thường xuyên" },
    { score: 5, icon: "😊", label: "Luôn luôn" }
  ],
  // Loại 3: Cảm xúc (Dành cho câu hỏi về tâm trạng)
  MOOD: [
    { score: 1, icon: "😊", label: "Không bao giờ" },
    { score: 2, icon: "🙂", label: "Hiếm khi" },
    { score: 3, icon: "😣", label: "Thỉnh thoảng" },
    { score: 4, icon: "😥", label: "Thường xuyên" },
    { score: 5, icon: "😱", label: "Luôn luôn" }
  ],
  // Loại 4: Có / Không (Binary)
  YES_NO: [
    { score: 1, icon: "👎", label: "Không" },
    { score: 5, icon: "👍", label: "Có" }
  ]
};

const getOptionsByCategory = (category) => {
  const cat = category ? category.toLowerCase() : 'default';
  if (cat.includes('camxuc')) return QUESTION_TYPES.MOOD;
  if (cat.includes('tansuat') ) return QUESTION_TYPES.FREQUENCY;
  if (cat.includes('dongy') ) return QUESTION_TYPES.AGREEMENT; 
  if (cat.includes('cokhong')) return QUESTION_TYPES.YES_NO;
  return QUESTION_TYPES.AGREEMENT; // Mặc định
};
function StudentApp() {
  const [activeTab, setActiveTab] = useState('chatAI'); 
  
  // --- STATE 1: CHATBOT KHẢO SÁT ---
  const [messages, setMessages] = useState([]); 
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null); 
  const [surveyResponses, setSurveyResponses] = useState({ name: '', student_class: '', gender: 'Nam', scores: {}, open_text: '' });
  
  // --- STATE 2: TƯỜNG ẨN DANH & COMMENT ---
  const [wallMessages, setWallMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null); 
  const [comments, setComments] = useState([]); 
  const [newComment, setNewComment] = useState('');

  // --- STATE 3: TÂM SỰ CÙNG AI ---
  const [counselorMessages, setCounselorMessages] = useState([
    { sender: 'bot', text: "Chào cậu! Mình là Emo. Cậu đang có chuyện gì vui hay buồn muốn kể cho mình nghe không? Mình ở đây để lắng nghe nè! 🎧" }
  ]);
  const [counselorInput, setCounselorInput] = useState('');
  const [isCounselorTyping, setIsCounselorTyping] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const messagesEndRef = useRef(null);
  const counselorEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    counselorEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(scrollToBottom, [messages, isTyping, counselorMessages, isCounselorTyping, activeTab]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ id: 'intro', sender: 'bot', text: "Chào cậu! Trước khi bắt đầu bài khảo sát nhỏ, hãy chọn một Avatar đại diện cho cậu nhé:", type: 'select_avatar' }]);
    }
  }, []);

  // --- LOGIC KHẢO SÁT ---
  const handleAvatarSelect = (avatar) => {
    setUserAvatar(avatar);
    addMessage('user', avatar);
    setIsTyping(true);
    setTimeout(() => { setIsTyping(false); addMessage('bot', `Avatar ${avatar} xịn xò đấy! Giờ cậu cho mình biết chút thông tin cơ bản nhé?`, 'input_name'); }, 1000);
  };

  const handleInfoSubmit = async (name, studentClass, gender) => {
    const userName = name || "Cậu bạn giấu tên";
    setSurveyResponses(prev => ({ ...prev, name: userName, student_class: studentClass, gender }));
    addMessage('user', `Mình là ${userName}, lớp ${studentClass}, giới tính ${gender}`);
    setIsTyping(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/get-random-questions`);
      setQuestions(res.data);
      setTimeout(() => { setIsTyping(false); addMessage('bot', `Chào ${userName}! Mình sẽ đưa ra 5 nhận định. Cậu hãy chọn biểu tượng phù hợp nhất nhé.`); setTimeout(() => askQuestion(0, res.data), 1000); }, 1500);
    } catch (error) { setIsTyping(false); addMessage('bot', "Lỗi kết nối máy chủ. Cậu thử tải lại trang nhé!"); }
  };

  const askQuestion = (index, questionList) => {
    const q = questionList[index];
    
    // Lấy bộ đáp án dựa trên loại câu hỏi (category)
    const options = getOptionsByCategory(q.category);

    setIsTyping(true);
    setTimeout(() => { 
      setIsTyping(false); 
      // Truyền options vào data của tin nhắn
      addMessage('bot', q.question_text, 'rating', { id: q.id, options: options }); 
    }, 800);
  };

 const handleRating = (option, questionId) => {
    addMessage('user', `${option.icon} ${option.label}`);
    setSurveyResponses(prev => ({ ...prev, scores: { ...prev.scores, [questionId]: option.score } }));
    if (currentQIndex < questions.length - 1) {
      const nextIndex = currentQIndex + 1;
      setCurrentQIndex(nextIndex);
      askQuestion(nextIndex, questions);
    } else { finishQuestions(); }
  };

  const finishQuestions = () => {
    setIsTyping(true);
    setTimeout(() => { setIsTyping(false); addMessage('bot', "Cảm ơn cậu đã chia sẻ. Cuối cùng, cậu có muốn kể thêm điều gì cụ thể khiến cậu vui hay buồn gần đây không?", 'text_input'); }, 1000);
  };

  const submitFullSurvey = async (text) => {
    addMessage('user', text);
    setIsTyping(true);
    const detailedLog = questions.map((q, index) => {
      const score = surveyResponses.scores[q.id];
      const label = RATING_OPTIONS.find(opt => opt.score === score)?.label || "Không rõ";
      return `Câu ${index + 1}: "${q.question_text}" -> Trả lời: ${label} (${score}/5)`;
    }).join('\n');
    const enrichedOpenText = `Lời tâm sự: "${text}"\n\n--- CHI TIẾT KẾT QUẢ KHẢO SÁT ---\n${detailedLog}`;
    const finalData = { ...surveyResponses, open_text: enrichedOpenText };
    try {
      const res = await axios.post(`${API_BASE_URL}/submit-survey`, finalData);
      setIsTyping(false);
      addMessage('bot', "Mình đã lắng nghe tất cả. Đây là lời nhắn nhủ dành riêng cho cậu:");
      setTimeout(() => { addMessage('bot', res.data.advice, 'advice_card'); }, 800);
    } catch (error) { setIsTyping(false); addMessage('bot', "Lỗi gửi dữ liệu, nhưng mình đã ghi nhận tâm sự của cậu!"); }
  };

  const addMessage = (sender, text, type = 'text', data = null) => {
    setMessages(prev => [...prev, { id: Date.now(), sender, text, type, data, submitted: false }]);
  };

  // --- LOGIC TƯỜNG & COMMENT ---
  const fetchMessages = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/get-messages`); setWallMessages(res.data); } catch (error) { console.error(error); }
  };

  // --- HÀM ĐĂNG NOTE (ĐÃ CẬP NHẬT KIỂM TRA SPAM) ---
  const postMessage = async () => {
    if (!newMessage.trim()) return;

    // 1. KIỂM TRA SPAM TRƯỚC KHI GỬI
    const errorMsg = validateContent(newMessage);
    if (errorMsg) {
      alert("⚠️ " + errorMsg);
      return; // Dừng lại, không gửi
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/post-message`, { content: newMessage });
      if (res.data.status === 'blocked') { 
        alert("⚠️ " + res.data.message); 
      } else { 
        setNewMessage(''); 
        fetchMessages(); 
        alert("Đã gửi lên tường!"); 
      }
    } catch (error) { alert("Lỗi gửi tin nhắn spam"); } 
    finally { setIsLoading(false); }
  };

  const handleNoteClick = async (note) => {
    setSelectedNote(note); setComments([]);
    try { const res = await axios.get(`${API_BASE_URL}/get-comments/${note.id}`); setComments(res.data); } catch (error) { console.error("Lỗi tải bình luận"); }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !selectedNote) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/post-comment`, { message_id: selectedNote.id, content: newComment });
      if (res.data.status === 'blocked') { alert("⚠️ " + res.data.message); } else { setNewMessage(''); const updated = await axios.get(`${API_BASE_URL}/get-comments/${selectedNote.id}`); setComments(updated.data); }
    } catch (error) { alert("Lỗi gửi bình luận"); }
  };

  useEffect(() => { if (activeTab === 'wall') fetchMessages(); }, [activeTab]);

  // --- LOGIC CHAT TÂM SỰ AI (ĐÃ SỬA LỖI) ---
  const handleCounselorSubmit = async () => {
    if (!counselorInput.trim()) return;

    const userMsg = { sender: 'user', text: counselorInput };
    setCounselorMessages(prev => [...prev, userMsg]);
    setCounselorInput('');
    setIsCounselorTyping(true);

    const historyForApi = counselorMessages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    try {
      const res = await axios.post(`${API_BASE_URL}/chat-counseling`, {
        message: userMsg.text,
        history: historyForApi
      });

      if (res.data && res.data.reply) {
        setIsCounselorTyping(false);
        setCounselorMessages(prev => [...prev, { sender: 'bot', text: res.data.reply }]);
      } else {
        throw new Error("Phản hồi không hợp lệ");
      }
    } catch (error) {
      setIsCounselorTyping(false);
      setCounselorMessages(prev => [...prev, { sender: 'bot', text: "Mạng hơi lag, cậu nói lại được không?" }]);
    }
  };
  // --- HÀM KIỂM TRA SPAM (MỚI THÊM) ---
  const validateContent = (text) => {
    const content = text.trim();

    // 1. Quá ngắn
    if (content.length < 3) {
      return "Nội dung quá ngắn, hãy viết thêm chút nữa nhé!";
    }

    // 2. Ký tự lặp lại liên tiếp quá 4 lần (vd: "aaaaa", "!!!!!", ".....")
    if (/(.)\1{4,}/.test(content)) {
      return "Đừng spam ký tự giống nhau nhé, khó đọc lắm!";
    }

    // 3. Spam lặp lại từ (vd: "test test test test")
    const words = content.split(/\s+/);
    if (words.length > 4) {
      const uniqueWords = new Set(words.map(w => w.toLowerCase()));
      // Nếu số lượng từ độc nhất ít hơn 50% tổng số từ -> Spam
      if (uniqueWords.size / words.length < 0.5) {
        return "Vui lòng không spam các từ lặp lại!";
      }
    }

    return null; // Hợp lệ
  };
  // --- VISUAL HELPERS ---
  const getSizeClass = () => { const count = wallMessages.length; if (count < 5) return 'note-lg'; if (count < 15) return 'note-md'; return 'note-sm'; };
  const getVisualProps = (id) => {
    const safeId = id || Math.random().toString(); const seed = safeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rotationRange = isMobile ? 10 : 50; const translateRange = isMobile ? 10 : 60;
    const rotation = (seed % rotationRange) - (rotationRange / 2); const translateX = (seed % translateRange) - (translateRange / 2); 
    const translateY = (seed % translateRange) - (translateRange / 2); const tapeRotation = (seed % 10) - 5; const zIndexBase = seed % 10; const stickerIndex = seed % STICKERS.length;
    return { rotation, sticker: STICKERS[stickerIndex], transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`, tapeRotation, zIndexBase };
  };
  const getNoteColor = (c) => { const colors = { yellow: '#fef08a', blue: '#bae6fd', red: '#fecaca', purple: '#e9d5ff', green: '#bbf7d0', gray: '#e5e7eb' }; return colors[c] || colors.yellow; };

  return (
    <div className="app-container">
      <header className="header">
        <h1><img src="https://cdn-icons-png.flaticon.com/512/763/763755.png" width="10%"/> EmoMap</h1>
        <p>Người bạn lắng nghe tâm hồn Gen Z</p>
      </header>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'chatAI' ? 'active' : ''}`} onClick={() => setActiveTab('chatAI')}>
          <Sparkles size={18} /> Tâm sự Emo
        </button>
        <button className={`tab-btn ${activeTab === 'survey' ? 'active' : ''}`} onClick={() => setActiveTab('survey')}>
          <Heart size={18} /> Khảo sát
        </button>
        <button className={`tab-btn ${activeTab === 'wall' ? 'active' : ''}`} onClick={() => setActiveTab('wall')}>
          <MessageSquare size={18} /> Note tâm sự
        </button>
      </div>

      <main className="content-area">
        <AnimatePresence mode='wait'>
          
          {/* TAB 1: TÂM SỰ CÙNG AI */}
          {activeTab === 'chatAI' && (
            <motion.div key="chatAI" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chat-interface">
              <div className="messages-list">
                {counselorMessages.map((msg, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className={`message-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}
                  >
                    {msg.sender === 'bot' && <div className="avatar"><img src="https://cdn-icons-png.flaticon.com/512/763/763755.png" width="100%"/> </div>}
                    <div className={`bubble ${msg.sender}`}>
                      {/* FIX: Hiển thị trực tiếp text thay vì gọi hàm renderMessageContent đã bị xóa */}
                      <p className="msg-text">{msg.text}</p>
                    </div>
                    {msg.sender === 'user' && <div className="avatar user-avatar">{userAvatar || '😺'}</div>}
                  </motion.div>
                ))}
                {isCounselorTyping && <div className="message-row bot-row"><div className="avatar"><img src="https://cdn-icons-png.flaticon.com/512/763/763755.png" width="100%"/> </div><div className="bubble bot typing"><span>.</span><span>.</span><span>.</span></div></div>}
                <div ref={counselorEndRef} />
              </div>

              <div className="wall-input" style={{ marginTop: 'auto', position: 'sticky', bottom: 0, zIndex: 100 }}>
                <input 
                  type="text" 
                  placeholder="Nhắn tin cho Emo..." 
                  value={counselorInput}
                  onChange={(e) => setCounselorInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCounselorSubmit()}
                />
                <button onClick={handleCounselorSubmit} disabled={isCounselorTyping}>
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 2: KHẢO SÁT */}
          {activeTab === 'survey' && (
            <motion.div key="survey" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chat-interface">
              <div className="messages-list">
                {messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`message-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}>
                    {msg.sender === 'bot' && <div className="avatar"><img src="https://cdn-icons-png.flaticon.com/512/763/763755.png" width="100%"/></div>}
                    <div className={`bubble ${msg.sender} ${msg.type === 'advice_card' ? 'advice-bubble' : ''}`}>
                      <p className="msg-text">{msg.text}</p>
                      {msg.type === 'select_avatar' && !msg.submitted && <div className="avatar-grid">{AVATAR_LIST.map((ava, idx) => <button key={idx} onClick={() => { msg.submitted = true; handleAvatarSelect(ava); }}>{ava}</button>)}</div>}
                      {msg.type === 'input_name' && !msg.submitted && <InfoForm onSubmit={(n, c, g) => { msg.submitted = true; handleInfoSubmit(n, c, g); }} />}
                      {/* Form chọn đáp án (Linh hoạt theo loại câu hỏi) */}
                      {msg.type === 'rating' && !msg.submitted && (
                        <div className="rating-grid">
                          {/* Sử dụng msg.data.options được truyền từ askQuestion */}
                          {(msg.data.options || QUESTION_TYPES.AGREEMENT).map((opt) => (
                            <button 
                              key={opt.score}   
                              className="rating-btn" 
                              onClick={() => { msg.submitted = true; handleRating(opt, msg.data.id); }}
                            >
                              <span className="rating-icon">{opt.icon}</span>
                              <span className="rating-label">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {msg.type === 'text_input' && !msg.submitted && <InputSection onSubmit={(text) => { msg.submitted = true; submitFullSurvey(text); }} />}
                    </div>
                    {msg.sender === 'user' && <div className="avatar user-avatar">{userAvatar || '👤'}</div>}
                  </motion.div>
                ))}
                {isTyping && <div className="message-row bot-row"><div className="avatar"><img src="https://cdn-icons-png.flaticon.com/512/763/763755.png" width="100%"/></div><div className="bubble bot typing"><span>.</span><span>.</span><span>.</span></div></div>}
                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          )}

          {/* TAB 3: TƯỜNG ẨN DANH */}
          {activeTab === 'wall' && (
            <motion.div key="wall" className="wall-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="wall-input">
                <input type="text" placeholder="Viết lên tường..." value={newMessage} onChange={e => setNewMessage(e.target.value)} maxLength={MAX_NOTE_LENGTH} />
                <span style={{ 
                    position: 'absolute', 
                    right: '20px', 
                    fontSize: '0.8rem', 
                    color: newMessage.length >= MAX_NOTE_LENGTH ? '#ef4444' : '#9ca3af',
                    fontWeight: 600,
                    pointerEvents: 'none'
                }}>
                    {newMessage.length}/{MAX_NOTE_LENGTH}
                  </span>
                <button onClick={postMessage} disabled={isLoading}>Dán</button>
              </div>
              
              <div className="sticky-wall">
                {wallMessages.map(msg => {
                  const visual = getVisualProps(msg.id);
                  const sizeClass = getSizeClass();
                  return (
                    <motion.div key={msg.id} className={`sticky-note ${sizeClass}`} style={{ backgroundColor: getNoteColor(msg.sentiment_color), transform: visual.transform, zIndex: visual.zIndexBase }} initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.15, zIndex: 9999, rotate: 0, transition: { duration: 0.1 } }} onClick={() => handleNoteClick(msg)}>
                      <div className="tape" style={{ transform: `translateX(-50%) rotate(${visual.tapeRotation}deg)` }}></div>
                      <div className="sticker-deco">{visual.sticker}</div>
                      <p>{msg.content}</p>
                      <div className="comment-indicator"><MessageCircle size={14} /></div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL BÌNH LUẬN */}
        <AnimatePresence>
          {selectedNote && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedNote(null)}>
              <motion.div className="note-modal" initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 50 }} onClick={(e) => e.stopPropagation()} style={{ backgroundColor: getNoteColor(selectedNote.sentiment_color) }}>
                <button className="close-btn" onClick={() => setSelectedNote(null)}><X size={20} /></button>
                <div className="modal-note-content">
                  <h3>Lời tâm sự:</h3> <p>"{selectedNote.content}"</p> <span className="modal-date">{new Date(selectedNote.created_at).toLocaleString('vi-VN')}</span>
                </div>
                <div className="comments-section">
                  <h4>Bình luận ({comments.length})</h4>
                  <div className="comments-list">
                    {comments.length === 0 ? ( <p className="no-comment">Chưa có bình luận nào.</p> ) : ( comments.map(cmt => ( <div key={cmt.id} className="comment-item"> <p>{cmt.content}</p> </div> )) )}
                  </div>
                  <div className="comment-input-area">
                    <input type="text" placeholder="Viết bình luận..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submitComment()} />
                    <button onClick={submitComment}><Send size={16} /></button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Sub-components
function InfoForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [cls, setCls] = useState('');
  return ( <div className="mini-form"> <input placeholder="Tên cậu là gì?" value={name} onChange={e => setName(e.target.value)} /> <input placeholder="Lớp (VD: 12A1)" value={cls} onChange={e => setCls(e.target.value)} /> <select id="gender-select"> <option value="Nam">Nam</option> <option value="Nữ">Nữ</option> <option value="Khác">Khác</option> </select> <button onClick={() => { const gender = document.getElementById('gender-select').value; if(cls) onSubmit(name, cls, gender); else alert("Nhập lớp đi cậu ơi!"); }}>Tiếp tục</button> </div> );
}
function InputSection({ onSubmit }) {
  const [txt, setTxt] = useState('');
  return ( <div className="mini-input"> <textarea rows="3" placeholder="Chia sẻ với mình nhé..." value={txt} onChange={e => setTxt(e.target.value)}></textarea> <button onClick={() => txt && onSubmit(txt)}><Send size={16}/></button> </div> );
}
const getNoteColor = (c) => { const colors = { yellow: '#fef08a', blue: '#bae6fd', red: '#fecaca', purple: '#e9d5ff', green: '#bbf7d0', gray: '#e5e7eb', pink: '#f7bbefff' }; return colors[c] || colors.yellow; };

export default StudentApp;