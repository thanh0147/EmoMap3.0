import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

// QUAN TRỌNG: Đã thêm X và MessageCircle vào đây để sửa lỗi
import { Send, MessageSquare, Heart, X, MessageCircle } from 'lucide-react';
// --- CẤU HÌNH ---
// Đảm bảo Backend Python đang chạy ở địa chỉ này
const API_BASE_URL = "https://emomap-backend.onrender.com"; 

// Danh sách Avatar
const AVATAR_LIST = ["🦊", "🐼", "🐱", "🐶", "🦁", "🐰", "🐸", "🦄", "🐯", "🐨", "🐧", "🦉", "🐣", "🐝", "🐞"];

// Danh sách Sticker trang trí (Noel + Gen Z + Meme)
const STICKERS = [
  "🎄", "🎅", "❄️", "☃️", "🎁", "🦌", 
  "✨", "🔥", "💖", "💯", "💅", "🤡", "🥺", "🌱", "🍓", "💫", "🧸",
  "👑", "💎", "🚀", "🌙", "🎵", "🦄"
];

// Các lựa chọn cảm xúc (CẬP NHẬT: Ngôn ngữ tự nhiên hơn)
const RATING_OPTIONS = [
  { score: 1, icon: "😠", label: "Tồi tệ / Rất áp lực" },
  { score: 2, icon: "🙁", label: "Không ổn lắm" },
  { score: 3, icon: "😐", label: "Bình thường thôi" },
  { score: 4, icon: "🙂", label: "Khá ổn / Vui vẻ" },
  { score: 5, icon: "😍", label: "Tuyệt vời / Hạnh phúc" }
];

function StudentApp() {
  const [activeTab, setActiveTab] = useState('survey');
  
  // --- STATE CHATBOT ---
  const [messages, setMessages] = useState([]); 
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null); 

  // Dữ liệu khảo sát
  const [surveyResponses, setSurveyResponses] = useState({
    name: '',
    student_class: '',
    gender: 'Nam',
    scores: {},
    open_text: ''
  });
  
  // State Tường ẩn danh
  const [wallMessages, setWallMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State Responsive: Kiểm tra xem có phải mobile không
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Tự động cuộn xuống cuối khung chat
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages, isTyping]);

    // State cho Modal Bình luận
  const [selectedNote, setSelectedNote] = useState(null); // Note đang mở
  const [comments, setComments] = useState([]); // Danh sách comment của note đó
  const [newComment, setNewComment] = useState(''); // Nội dung comment mới
  // Lắng nghe thay đổi kích thước màn hình
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 1. KHỞI ĐỘNG ---
  useEffect(() => {
    setMessages([{
      id: 'intro',
      sender: 'bot',
      text: "Chào cậu! Mình là Emo. Trước khi chúng mình trò chuyện, hãy chọn một Avatar đại diện cho cậu nhé:",
      type: 'select_avatar'
    }]);
  }, []);

  // --- LOGIC CHATBOT ---
  const handleAvatarSelect = (avatar) => {
    setUserAvatar(avatar);
    addMessage('user', avatar);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage('bot', `Avatar ${avatar} xịn xò đấy! Giờ cậu cho mình biết chút thông tin cơ bản nhé?`, 'input_name');
    }, 1000);
  };

  const handleInfoSubmit = async (name, studentClass, gender) => {
    const userName = name || "Cậu bạn giấu tên";
    setSurveyResponses(prev => ({ ...prev, name: userName, student_class: studentClass, gender }));
    
    addMessage('user', `Mình là ${userName}, lớp ${studentClass}, giới tính ${gender}`);
    
    setIsTyping(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/get-random-questions`);
      setQuestions(res.data);
      
      setTimeout(() => {
        setIsTyping(false);
        addMessage('bot', `Chào ${userName}! Mình sẽ đưa ra 8 nhận định. Cậu hãy chọn biểu tượng phù hợp nhất nhé.`);
        setTimeout(() => askQuestion(0, res.data), 1000);
      }, 1500);
    } catch (error) {
      setIsTyping(false);
      addMessage('bot', "Lỗi kết nối máy chủ. Cậu thử tải lại trang nhé!");
    }
  };

  const askQuestion = (index, questionList) => {
    const q = questionList[index];
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage('bot', q.question_text, 'rating', q.id);
    }, 800);
  };

  const handleRating = (option, questionId) => {
    addMessage('user', `${option.icon} ${option.label}`);
    setSurveyResponses(prev => ({
      ...prev,
      scores: { ...prev.scores, [questionId]: option.score }
    }));

    if (currentQIndex < questions.length - 1) {
      const nextIndex = currentQIndex + 1;
      setCurrentQIndex(nextIndex);
      askQuestion(nextIndex, questions);
    } else {
      finishQuestions();
    }
  };

  const finishQuestions = () => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage('bot', "Cảm ơn cậu đã chia sẻ. Cuối cùng, cậu có muốn kể thêm điều gì cụ thể khiến cậu vui hay buồn gần đây không?", 'text_input');
    }, 1000);
  };

  const submitFullSurvey = async (text) => {
    addMessage('user', text);
    setIsTyping(true);
    
    // --- TỔNG HỢP CHI TIẾT CÂU TRẢ LỜI CHO AI ---
    // Tạo một bản tóm tắt các câu hỏi và mức độ trả lời để gửi kèm
    const detailedLog = questions.map((q, index) => {
      const score = surveyResponses.scores[q.id];
      const label = RATING_OPTIONS.find(opt => opt.score === score)?.label || "Không rõ";
      return `Câu ${index + 1}: "${q.question_text}" -> Trả lời: ${label} (${score}/5)`;
    }).join('\n');

    // Ghép vào nội dung gửi đi (để Backend AI đọc được ngữ cảnh chi tiết)
    const enrichedOpenText = `Lời tâm sự: "${text}"\n\n--- CHI TIẾT KẾT QUẢ KHẢO SÁT ---\n${detailedLog}`;

    const finalData = { ...surveyResponses, open_text: enrichedOpenText };
    
    try {
      const res = await axios.post(`${API_BASE_URL}/submit-survey`, finalData);
      setIsTyping(false);
      
      addMessage('bot', "Mình đã lắng nghe tất cả. Đây là lời nhắn nhủ dành riêng cho cậu:");
      setTimeout(() => {
         addMessage('bot', res.data.advice, 'advice_card');
      }, 800);
      
    } catch (error) {
      setIsTyping(false);
      addMessage('bot', "Lỗi gửi dữ liệu, nhưng mình đã ghi nhận tâm sự của cậu!");
    }
  };

  const addMessage = (sender, text, type = 'text', data = null) => {
    setMessages(prev => [...prev, { id: Date.now(), sender, text, type, data, submitted: false }]);
  };

  // --- LOGIC TƯỜNG ẨN DANH ---
  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/get-messages`);
      setWallMessages(res.data);
    } catch (error) { console.error(error); }
  };

  const postMessage = async () => {
    if (!newMessage.trim()) return;
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/post-message`, { content: newMessage });
      
      // Xử lý khi bị chặn
      if (res.data.status === 'blocked') {
        alert("⚠️ " + res.data.message);
      } else {
        setNewMessage('');
        fetchMessages();
        alert("Đã gửi lên tường!");
      }
    } catch (error) { alert("Lỗi gửi tin nhắn"); } 
    finally { setIsLoading(false); }
  };


  // Khi bấm vào một tờ giấy note -> Hiện modal và tải comment
  const handleNoteClick = async (note) => {
    setSelectedNote(note);
    setComments([]); // Xóa comment cũ để hiện loading
    try {
      const res = await axios.get(`${API_BASE_URL}/get-comments/${note.id}`);
      setComments(res.data);
    } catch (error) { console.error("Lỗi tải bình luận"); }
  };

  // Gửi bình luận mới
  const submitComment = async () => {
    if (!newComment.trim() || !selectedNote) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/post-comment`, {
        message_id: selectedNote.id,
        content: newComment
      });
      
      if (res.data.status === 'blocked') {
        alert("⚠️ " + res.data.message);
      } else {
        setNewComment('');
        // Tải lại danh sách comment ngay lập tức
        const updated = await axios.get(`${API_BASE_URL}/get-comments/${selectedNote.id}`);
        setComments(updated.data);
      }
    } catch (error) { alert("Lỗi gửi bình luận"); }
  };

  useEffect(() => { if (activeTab === 'wall') fetchMessages(); }, [activeTab]);


  // --- HÀM TÍNH TOÁN VISUAL (GIAO DIỆN LỘN XỘN TỐI ƯU MOBILE) ---

  // 1. Xác định kích thước giấy dựa trên số lượng tin
  const getSizeClass = () => {
    const count = wallMessages.length;
    // Ngưỡng số lượng để đổi size - Càng nhiều càng bé lại
    if (count < 5) return 'note-lg'; // Dưới 5 tin -> Rất to
    if (count < 15) return 'note-md'; // 5-15 tin -> Vừa
    return 'note-sm'; // Trên 15 tin -> Bé
  };

  // 2. Tạo vị trí và góc xoay ngẫu nhiên (Responsive)
  const getVisualProps = (id) => {
    const safeId = id || Math.random().toString();
    const seed = safeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // TỐI ƯU MOBILE: Giảm biên độ dao động
    const rotationRange = isMobile ? 10 : 50; // Mobile: xoay ít (10 deg), PC: xoay nhiều (50 deg)
    const translateRange = isMobile ? 10 : 60; // Mobile: lệch ít (10px), PC: lệch nhiều (60px)

    // Góc xoay
    const rotation = (seed % rotationRange) - (rotationRange / 2); 
    
    // Vị trí lệch
    const translateX = (seed % translateRange) - (translateRange / 2); 
    const translateY = (seed % translateRange) - (translateRange / 2); 
    
    // Xoay băng dính ngẫu nhiên
    const tapeRotation = (seed % 10) - 5;

    // Random lớp (z-index)
    const zIndexBase = seed % 10;

    const stickerIndex = seed % STICKERS.length;

    return {
      rotation,
      sticker: STICKERS[stickerIndex],
      transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`,
      tapeRotation,
      zIndexBase
    };
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1><img src="https://cdn-icons-png.flaticon.com/512/763/763755.png" width="10%"/> EmoMap</h1>
        <p>Người bạn lắng nghe tâm hồn Gen Z</p>
      </header>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'survey' ? 'active' : ''}`} onClick={() => setActiveTab('survey')}>
          <Heart size={18} /> Trò chuyện
        </button>
        <button className={`tab-btn ${activeTab === 'wall' ? 'active' : ''}`} onClick={() => setActiveTab('wall')}>
          <MessageSquare size={18} /> Note Tâm sự 
        </button>
      </div>

      <main className="content-area">
        <AnimatePresence mode='wait'>
          {activeTab === 'survey' ? (
            
            // --- GIAO DIỆN CHATBOX ---
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chat-interface">
              <div className="messages-list">
                {messages.map((msg) => (
                  <motion.div 
                    key={msg.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`message-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}
                  >
                    {/* AVATAR BOT: Chỉ hiện nếu tin nhắn là của Bot */}
                    {msg.sender === 'bot' && (
                      <div className="avatar"><img src="https://cdn-icons-png.flaticon.com/512/763/763755.png" width="100%"/></div> 
                    )}
                    
                    <div className={`bubble ${msg.sender} ${msg.type === 'advice_card' ? 'advice-bubble' : ''}`}>
                      <p className="msg-text">{msg.text}</p>
                      
                      {msg.type === 'select_avatar' && !msg.submitted && (
                        <div className="avatar-grid">
                          {AVATAR_LIST.map((ava, idx) => (
                            <button key={idx} onClick={() => {
                              msg.submitted = true;
                              handleAvatarSelect(ava);
                            }}>
                              {ava}
                            </button>
                          ))}
                        </div>
                      )}

                      {msg.type === 'input_name' && !msg.submitted && (
                        <InfoForm onSubmit={(n, c, g) => {
                          msg.submitted = true;
                          handleInfoSubmit(n, c, g);
                        }} />
                      )}

                      {msg.type === 'rating' && !msg.submitted && (
                        <div className="rating-grid">
                          {RATING_OPTIONS.map((opt) => (
                            <button key={opt.score} className="rating-btn" onClick={() => {
                              msg.submitted = true;
                              handleRating(opt, msg.data);
                            }}>
                              <span className="rating-icon">{opt.icon}</span>
                              <span className="rating-label">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {msg.type === 'text_input' && !msg.submitted && (
                         <InputSection onSubmit={(text) => {
                            msg.submitted = true;
                            submitFullSurvey(text);
                         }} />
                      )}
                    </div>

                    {/* AVATAR USER: Chỉ hiện nếu tin nhắn là của User */}
                    {msg.sender === 'user' && (
                      <div className="avatar user-avatar">{userAvatar || '👤'}</div>
                    )}
                  </motion.div>
                ))}
                
                {isTyping && (
                  <div className="message-row bot-row">
                    <div className="avatar"><img src="https://cdn-icons-png.flaticon.com/512/763/763755.png" width="100%" /></div>
                    <div className="bubble bot typing">
                      <span>.</span><span>.</span><span>.</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          ) : (
            
            // --- GIAO DIỆN TƯỜNG (MESSY WALL) ---
            <motion.div key="wall" className="wall-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="wall-input">
                <input type="text" placeholder="Viết lên tường..." value={newMessage} onChange={e => setNewMessage(e.target.value)} />
                <button onClick={postMessage} disabled={isLoading}>Dán</button>
              </div>
              
              <div className="sticky-wall">
                {wallMessages.map(msg => {
                  const visual = getVisualProps(msg.id);
                  const sizeClass = getSizeClass(); // Tính toán kích thước chung

                  return (
                    <motion.div 
                      key={msg.id} 
                      className={`sticky-note ${sizeClass}`} 
                      style={{
                        backgroundColor: getNoteColor(msg.sentiment_color),
                        transform: visual.transform, // Xoay và lệch
                        zIndex: visual.zIndexBase // Random z-index
                      }}
                      initial={{ scale: 0 }} 
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.15, zIndex: 9999, rotate: 0, transition: { duration: 0.1 } }}
                      onClick={() => handleNoteClick(msg)} // Bấm vào để xem comment
                    >
                      {/* Băng dính cũng xoay nhẹ ngẫu nhiên */}
                      <div className="tape" style={{ transform: `translateX(-50%) rotate(${visual.tapeRotation}deg)` }}></div>
                      
                      {/* Sticker trang trí */}
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

        {/* --- MODAL BÌNH LUẬN --- */}
        <AnimatePresence>
          {selectedNote && (
            <motion.div 
              className="modal-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedNote(null)}
            >
              <motion.div 
                className="note-modal"
                initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 50 }}
                onClick={(e) => e.stopPropagation()}
                style={{ backgroundColor: getNoteColor(selectedNote.sentiment_color) }}
              >
                <button className="close-btn" onClick={() => setSelectedNote(null)}><X size={20} /></button>
                
                <div className="modal-note-content">
                  <h3>Lời tâm sự:</h3>
                  <p>"{selectedNote.content}"</p>
                  <span className="modal-date">{new Date(selectedNote.created_at).toLocaleString('vi-VN')}</span>
                </div>

                <div className="comments-section">
                  <h4>Bình luận ({comments.length})</h4>
                  <div className="comments-list">
                    {comments.length === 0 ? (
                      <p className="no-comment">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                    ) : (
                      comments.map(cmt => (
                        <div key={cmt.id} className="comment-item">
                          <p>{cmt.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="comment-input-area">
                    <input 
                      type="text" 
                      placeholder="Viết bình luận an ủi..." 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && submitComment()}
                    />
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

// --- SUB COMPONENTS ---

function InfoForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [cls, setCls] = useState('');
  return (
    <div className="mini-form">
      <input placeholder="Tên cậu là gì?" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Lớp (VD: 12A1)" value={cls} onChange={e => setCls(e.target.value)} />
      <select id="gender-select">
         <option value="Nam">Nam</option>
         <option value="Nữ">Nữ</option>
         <option value="Khác">Khác</option>
      </select>
      <button onClick={() => {
        const gender = document.getElementById('gender-select').value;
        if(cls) onSubmit(name, cls, gender);
        else alert("Nhập lớp đi cậu ơi!");
      }}>Tiếp tục</button>
    </div>
  );
}

function InputSection({ onSubmit }) {
  const [txt, setTxt] = useState('');
  return (
    <div className="mini-input">
      <textarea rows="3" placeholder="Chia sẻ với mình nhé..." value={txt} onChange={e => setTxt(e.target.value)}></textarea>
      <button onClick={() => txt && onSubmit(txt)}><Send size={16}/></button>
    </div>
  );
}

const getNoteColor = (c) => {
    // Bảng màu Pastel
    const colors = { yellow: '#fef08a', blue: '#bae6fd', red: '#fecaca', purple: '#e9d5ff', green: '#bbf7d0', gray: '#e5e7eb', pink: '#f8b6f6ff' };
    return colors[c] || colors.yellow;
};

export default StudentApp;