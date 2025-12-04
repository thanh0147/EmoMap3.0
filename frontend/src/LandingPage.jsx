import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, Shield, Heart, ChevronDown, Sparkles, 
  Activity, Zap, Lock, BarChart3, X
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null); // State lưu ảnh đang mở

  // Thanh tiến trình cuộn trang
  const { scrollYProgress } = useScroll({ target: containerRef });
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <div className="landing-wrapper" ref={containerRef}>
      <motion.div className="progress-bar" style={{ scaleX }} />

      {/* ============================================================
          TRANG 1: HERO SECTION (GIỚI THIỆU & TÍNH NĂNG)
      ============================================================ */}
      <section className="snap-section hero-section">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        
        <div className="content-box column">
          {/* Logo & Tiêu đề */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="center-text-group"
          >
            <div className="badge">✨ Dự án sàng lọc sớm bạo lực học đường 2025</div>
            <h1 className="hero-title">
              EmoMap <br />
              <span className="gradient-text">Người bạn thấu cảm</span>
            </h1>
            <p className="hero-subtitle">
              Nền tảng hỗ trợ sức khỏe tinh thần dành riêng cho Gen Z. 
              Nơi mọi cảm xúc được lắng nghe, mọi áp lực được chia sẻ mà không có sự phán xét.
            </p>
          </motion.div>

          {/* 3 Tính năng cốt lõi */}
          <div className="features-row">
            <motion.div 
              className="feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="icon-circle blue"><Zap size={24} /></div>
              <h3>Phản hồi tức thì</h3>
              <p>AI phân tích và đưa ra lời khuyên tâm lý ngay lập tức sau khi bạn chia sẻ.</p>
            </motion.div>

            <motion.div 
              className="feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="icon-circle purple"><Lock size={24} /></div>
              <h3>Ẩn danh tuyệt đối</h3>
              <p>Không lưu danh tính, không tracking. Bạn hoàn toàn tự do là chính mình.</p>
            </motion.div>

            <motion.div 
              className="feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="icon-circle green"><Heart size={24} /></div>
              <h3>Chữa lành cảm xúc</h3>
              <p>Kết nối với cộng đồng qua bức tường ẩn danh đầy màu sắc và tích cực.</p>
            </motion.div>
          </div>

          <motion.div 
            animate={{ y: [0, 10, 0] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="scroll-indicator"
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
          >
            <span>Khám phá Giao diện</span>
            <ChevronDown size={24} />
          </motion.div>
        </div>
      </section>

      {/* ============================================================
          TRANG 2: DEMO SHOWCASE (4 Ô ẢNH)
      ============================================================ */}
      <section className="snap-section demo-section alt-bg">
        <motion.div 
          className="content-box column"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ margin: "-100px" }}
        >
          <div className="landing-section-header">
            <div className="badge">📸 Trải nghiệm thực tế</div>
            <h2>Giao diện Hiện đại</h2>
            <p className="center-text">Thân thiện, dễ sử dụng trên mọi thiết bị.</p>
          </div>

          <div className="demo-grid-4">
            {/* Ô 1: Chatbot */}
            <div className="demo-card" onClick={() => setSelectedImage('/demo-chat.png')}>
              <div className="browser-header">
                <span className="dot red"></span><span className="dot yellow"></span><span className="dot green"></span>
              </div>
              <div className="image-placeholder" style={{ cursor: 'pointer' }}>
                {/* Thay src bằng đường dẫn ảnh trong thư mục public */}
                <img src="/demo-chat.png" alt="Giao diện Chatbot" onError={(e) => {e.target.style.display='none'; e.target.parentNode.classList.add('blue-bg')}} />
                {/* Fallback nếu ảnh lỗi */}
                <div className="fallback-icon"><MessageCircle size={40} color="#cbd5e1"/></div>
              </div>
              <div className="card-desc">Trò chuyện 1-1 với bác sĩ tâm lý AI</div>
            </div>

            {/* Ô 2: Khảo sát */}
            <div className="demo-card" onClick={() => setSelectedImage('/demo-survey.png')}>
              <div className="browser-header">
                <span className="dot red"></span><span className="dot yellow"></span><span className="dot green"></span>
              </div>
              <div className="image-placeholder" style={{ cursor: 'pointer' }}>
                <img src="/demo-survey.png" alt="Giao diện Khảo sát" onError={(e) => {e.target.style.display='none'; e.target.parentNode.classList.add('orange-bg')}} />
                <div className="fallback-icon"><Activity size={40} color="#cbd5e1"/></div>
              </div>
              <div className="card-desc">Đánh giá sức khỏe tinh thần qua Icon</div>
            </div>

            {/* Ô 3: Tường ẩn danh */}
            <div className="demo-card" onClick={() => setSelectedImage('/demo-wall.png')}>
              <div className="browser-header">
                <span className="dot red"></span><span className="dot yellow"></span><span className="dot green"></span>
              </div>
              <div className="image-placeholder" style={{ cursor: 'pointer' }}>
                <img src="/demo-wall.png" alt="Giao diện Tường" onError={(e) => {e.target.style.display='none'; e.target.parentNode.classList.add('purple-bg')}} />
                <div className="fallback-icon"><Sparkles size={40} color="#cbd5e1"/></div>
              </div>
              <div className="card-desc">Dán note chia sẻ</div>
            </div>

            {/* Ô 4: Dashboard */}
            <div className="demo-card" onClick={() => setSelectedImage('/demo-admin.png')}>
              <div className="browser-header">
                <span className="dot red"></span><span className="dot yellow"></span><span className="dot green"></span>
              </div>
              <div className="image-placeholder" style={{ cursor: 'pointer' }}>
                <img src="/demo-admin.png" alt="Giao diện Admin" onError={(e) => {e.target.style.display='none'; e.target.parentNode.classList.add('green-bg')}} />
                <div className="fallback-icon"><BarChart3 size={40} color="#cbd5e1"/></div>
              </div>
              <div className="card-desc">Thống kê & Báo cáo cho nhà trường</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ============================================================
          TRANG 3: BẮT ĐẦU HÀNH TRÌNH (CTA)
      ============================================================ */}
      <section className="snap-section cta-section">
        <motion.div 
          className="content-box center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="hero-title">Bạn đã sẵn sàng?</h1>
          <p className="hero-subtitle">
            Đừng để những lo âu kìm hãm bạn. Hãy để Emo Buddy lắng nghe và đồng hành cùng bạn ngay hôm nay.
          </p>
          
          <motion.button 
            className="start-btn-big"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/student')}
          >
            Bắt đầu Ngay <Heart size={28} fill="white" style={{marginLeft: '12px'}} />
          </motion.button>

          <div className="trust-badges">
            <span>🔒 Bảo mật 100%</span>
            <span>✨ Hoàn toàn miễn phí</span>
            <span>🤖 AI thế hệ mới</span>
          </div>
        </motion.div>
      </section>

      {/* ============================================================
          MODAL XEM ẢNH (POP-UP)
      ============================================================ */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px', cursor: 'zoom-out'
            }}
          >
            {/* Nút đóng */}
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                position: 'absolute', top: '20px', right: '20px',
                background: 'white', border: 'none', borderRadius: '50%',
                padding: '10px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={24} color="#333" />
            </button>

            {/* Ảnh phóng to */}
            <motion.img
              src={selectedImage}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                maxHeight: '90vh',
                maxWidth: '90vw',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                cursor: 'default'
              }}
              onClick={(e) => e.stopPropagation()} // Bấm vào ảnh không đóng modal
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LandingPage;