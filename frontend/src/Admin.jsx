import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { Users, Activity, AlertTriangle, Calendar } from 'lucide-react';

// Đăng ký các thành phần biểu đồ
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const API_BASE_URL = "https://emomap-backend.onrender.com"; 

// Bản đồ câu hỏi để hiển thị trên biểu đồ
const QUESTION_LABELS = [
  "Vui vẻ/Tích cực", "Ngủ ngon", "Tập trung", "Hài lòng ngoại hình", 
  "Có bạn thân", "Thầy cô thấu hiểu", "Gia đình ủng hộ", "Lạc quan tương lai"
];

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- 1. LOGIC ĐĂNG NHẬP ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') { // Mật khẩu demo
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert("Sai mật khẩu!");
    }
  };

  // --- 2. LẤY DỮ LIỆU TỪ SERVER ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/all-surveys`);
      setData(res.data);
    } catch (error) {
      console.error("Lỗi tải dữ liệu", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. XỬ LÝ SỐ LIỆU CHO BIỂU ĐỒ ---
  
  // Tính điểm trung bình của 8 khía cạnh
  const calculateCategoryAverages = () => {
    const totals = Array(8).fill(0);
    const counts = Array(8).fill(0);

    data.forEach(item => {
      // Metrics lưu dạng { "an-uuid": 4, "another-uuid": 2... } 
      // Do ID câu hỏi là random UUID, ta cần map theo thứ tự index nếu có thể, 
      // hoặc ở đây ta giả định metrics lưu theo key q1, q2... nếu backend trả về chuẩn.
      // Để đơn giản cho demo, ta sẽ lấy values của object metrics
      const scores = Object.values(item.metrics || {});
      scores.forEach((score, index) => {
        if (index < 8) {
          totals[index] += parseInt(score);
          counts[index]++;
        }
      });
    });

    return totals.map((sum, i) => counts[i] ? (sum / counts[i]).toFixed(1) : 0);
  };

  // Lọc danh sách học sinh cần hỗ trợ (Điểm trung bình < 2.5)
  const getRiskStudents = () => {
    return data.filter(item => {
      const scores = Object.values(item.metrics || {});
      const avg = scores.reduce((a, b) => a + parseInt(b), 0) / scores.length;
      return avg < 2.5;
    });
  };

  // --- CẤU HÌNH BIỂU ĐỒ ---
  const barChartData = {
    labels: QUESTION_LABELS,
    datasets: [
      {
        label: 'Điểm trung bình (Thang 1-5)',
        data: calculateCategoryAverages(),
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
      },
    ],
  };

  const lineChartData = {
    labels: data.slice(0, 10).reverse().map(d => new Date(d.created_at).toLocaleDateString('vi-VN')), // 10 ngày gần nhất
    datasets: [
      {
        label: 'Cảm xúc chung',
        data: data.slice(0, 10).reverse().map(d => {
           const s = Object.values(d.metrics||{}); 
           return s.reduce((a,b)=>a+parseInt(b),0)/s.length;
        }),
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236, 72, 153, 0.5)',
        tension: 0.3,
      }
    ]
  };
/*
  // --- GIAO DIỆN ---
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <form onSubmit={handleLogin} className="login-box">
          <h2>🔐 Khu vực Giáo viên</h2>
          <input 
            type="password" 
            placeholder="Nhập mật khẩu quản trị" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Truy cập Dashboard</button>
        </form>
      </div>
    );
  }
*/
  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>📊 Emo Buddy Dashboard</h1>
        <button onClick={() => window.location.reload()} className="refresh-btn">Làm mới dữ liệu</button>
      </header>

      {/* THẺ THỐNG KÊ (STATS CARDS) */}
      <div className="stats-grid">
        <div className="stat-card">
          <Users size={30} color="#6366f1" />
          <div>
            <h3>Tổng số khảo sát</h3>
            <p className="stat-num">{data.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <Activity size={30} color="#10b981" />
          <div>
            <h3>Điểm TB toàn trường</h3>
            <p className="stat-num">
              {(calculateCategoryAverages().reduce((a,b)=>parseFloat(a)+parseFloat(b),0)/8).toFixed(1)}/5.0
            </p>
          </div>
        </div>
        <div className="stat-card risk">
          <AlertTriangle size={30} color="#ef4444" />
          <div>
            <h3>Cần hỗ trợ (SOS)</h3>
            <p className="stat-num">{getRiskStudents().length} HS</p>
          </div>
        </div>
      </div>

      <div className="charts-section">
        {/* BIỂU ĐỒ CỘT: CHI TIẾT VẤN ĐỀ */}
        <div className="chart-box">
          <h3>🧩 Phân tích khía cạnh tâm lý</h3>
          <Bar data={barChartData} options={{ responsive: true, scales: { y: { min: 0, max: 5 } } }} />
        </div>

        {/* BIỂU ĐỒ ĐƯỜNG: XU HƯỚNG */}
        <div className="chart-box">
          <h3>📈 Xu hướng cảm xúc gần đây</h3>
          <Line data={lineChartData} />
        </div>
      </div>

      {/* DANH SÁCH RỦI RO */}
      <div className="risk-section">
        <h3>🚨 Danh sách cần quan tâm đặc biệt</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Học sinh</th>
                <th>Lớp</th>
                <th>Điểm TB</th>
                <th>Lời tâm sự</th>
              </tr>
            </thead>
            <tbody>
              {getRiskStudents().map((st) => {
                const scores = Object.values(st.metrics || {});
                const avg = (scores.reduce((a, b) => a + parseInt(b), 0) / scores.length).toFixed(1);
                return (
                  <tr key={st.id}>
                    <td>{new Date(st.created_at).toLocaleDateString('vi-VN')}</td>
                    <td>{st.student_name || "Ẩn danh"}</td>
                    <td>{st.student_class}</td>
                    <td><span className="badge-risk">{avg}</span></td>
                    <td className="note-cell">{st.open_ended_answer}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}