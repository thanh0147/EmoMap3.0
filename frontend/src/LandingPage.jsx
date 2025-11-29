import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Shield } from 'lucide-react';
import StudentApp from './Student';
const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Background decoration */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <motion.div 
        className="landing-content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="logo-badge">🌱 Emo Buddy</div>
        
        <h1>Người bạn lắng nghe<br/>tâm hồn <span className="highlight">Gen Z</span></h1>
        
        <p className="subtitle">
          Một không gian an toàn để chia sẻ cảm xúc, giải tỏa áp lực và nhận lời khuyên từ người bạn AI thấu cảm. Hoàn toàn ẩn danh.
        </p>

        <div className="features-grid">
          <div className="feature-item">
            <div className="icon-box"><MessageCircle size={24} /></div>
            <span>Trò chuyện 1-1</span>
          </div>
          <div className="feature-item">
            <div className="icon-box"><Shield size={24} /></div>
            <span>Bảo mật tuyệt đối</span>
          </div>
          <div className="feature-item">
            <div className="icon-box"><Heart size={24} /></div>
            <span>Lời khuyên hữu ích</span>
          </div>
        </div>

        <motion.button 
          className="start-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/StudentApp')}
        >
          Bắt đầu chia sẻ ngay 🚀
        </motion.button>

        <div className="footer-note">
          Dành riêng cho học sinh trường THCS&THPT Sư Phạm
        </div>
      </motion.div>
    </div>
  );
};

export default LandingPage;