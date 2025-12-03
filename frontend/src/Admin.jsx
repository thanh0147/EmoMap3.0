import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  // const [isAuthenticated, setIsAuthenticated] = useState(false);
  // const [password, setPassword] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- 1. LOGIC ĐĂNG NHẬP ---
  /*const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') { // Mật khẩu demo
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert("Sai mật khẩu!");
    }
  };
 */

    // --- STATE BỘ LỌC ---
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', 'week', 'month', 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
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
    // TỰ ĐỘNG GỌI API KHI VÀO TRANG (Giúp đánh thức Server)
  useEffect(() => {
    fetchData();
  }, []);
// --- LOGIC LỌC DỮ LIỆU ---
  const filteredData = useMemo(() => {
    if (timeFilter === 'all') return data;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return data.filter(item => {
      const itemDate = new Date(item.created_at);

      if (timeFilter === 'today') {
        return itemDate >= startOfDay;
      }
      if (timeFilter === 'week') {
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(now.getDate() - 7);
        return itemDate >= oneWeekAgo;
      }
      if (timeFilter === 'month') {
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return itemDate >= oneMonthAgo;
      }
      if (timeFilter === 'custom') {
        if (!customStart || !customEnd) return true;
        const start = new Date(customStart);
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999); // Lấy hết ngày cuối
        return itemDate >= start && itemDate <= end;
      }
      return true;
    });
  }, [data, timeFilter, customStart, customEnd]);

  // --- TÍNH TOÁN SỐ LIỆU (Dựa trên filteredData) ---
  const calculateCategoryAverages = () => {
    const totals = Array(8).fill(0);
    const counts = Array(8).fill(0);

    filteredData.forEach(item => {
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
        borderRadius: 5,
      },
    ],
  };

  const lineChartData = {
    labels: data.slice(0, 15).reverse().map(d => new Date(d.created_at).toLocaleDateString('vi-VN')), // 10 ngày gần nhất
    datasets: [
      {
        label: 'Cảm xúc chung',
        data: data.slice(0, 15).reverse().map(d => {
           const s = Object.values(d.metrics||{}); 
           return s.reduce((a,b)=>a+parseInt(b),0)/s.length;
        }),
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236, 72, 153, 0.5)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  // --- GIAO DIỆN ---
  /*if (!isAuthenticated) {
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
        <div className="header-title">
          <h1>📊 Emo Buddy Dashboard</h1>
          <p>Theo dõi sức khỏe tinh thần học sinh</p>
        </div>
        <button onClick={fetchData} className="refresh-btn">
          {loading ? 'Đang tải...' : 'Làm mới dữ liệu'}
        </button>
      </header>

      {/* --- THANH CÔNG CỤ LỌC (FILTER BAR) --- */}
      <div className="filter-bar">
        <div className="filter-group">
          <Filter size={18} className="filter-icon" />
          <span className="filter-label">Thời gian:</span>
          
          <button 
            className={`filter-btn ${timeFilter === 'today' ? 'active' : ''}`} 
            onClick={() => setTimeFilter('today')}
          >Hôm nay</button>
          
          <button 
            className={`filter-btn ${timeFilter === 'week' ? 'active' : ''}`} 
            onClick={() => setTimeFilter('week')}
          >7 Ngày</button>
          
          <button 
            className={`filter-btn ${timeFilter === 'month' ? 'active' : ''}`} 
            onClick={() => setTimeFilter('month')}
          >30 Ngày</button>
          
          <button 
            className={`filter-btn ${timeFilter === 'all' ? 'active' : ''}`} 
            onClick={() => setTimeFilter('all')}
          >Tất cả</button>

          <button 
            className={`filter-btn ${timeFilter === 'custom' ? 'active' : ''}`} 
            onClick={() => setTimeFilter('custom')}
          >Tùy chỉnh</button>
        </div>

        {/* Bộ chọn ngày tùy chỉnh */}
        {timeFilter === 'custom' && (
          <div className="custom-date-picker">
            <input 
              type="date" 
              value={customStart} 
              onChange={(e) => setCustomStart(e.target.value)} 
            />
            <span>đến</span>
            <input 
              type="date" 
              value={customEnd} 
              onChange={(e) => setCustomEnd(e.target.value)} 
            />
          </div>
        )}
      </div>

      {/* --- THỐNG KÊ --- */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="icon-box blue"><Users size={24} color="white" /></div>
          <div>
            <h3>Số lượng khảo sát</h3>
            <p className="stat-num">{filteredData.length}</p>
            <span className="stat-desc">Trong khoảng thời gian này</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-box green"><Activity size={24} color="white" /></div>
          <div>
            <h3>Điểm TB Chung</h3>
            <p className="stat-num">
              {filteredData.length > 0 
                ? (calculateCategoryAverages().reduce((a,b)=>parseFloat(a)+parseFloat(b),0)/8).toFixed(1) 
                : 0}/5.0
            </p>
            <span className="stat-desc">Chỉ số sức khỏe tinh thần</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-box red"><AlertTriangle size={24} color="white" /></div>
          <div>
            <h3>Cần hỗ trợ (SOS)</h3>
            <p className="stat-num risk-text">{getRiskStudents().length} HS</p>
            <span className="stat-desc">Điểm trung bình dưới 2.5</span>
          </div>
        </div>
      </div>

      {/* --- BIỂU ĐỒ --- */}
      <div className="charts-section">
        <div className="chart-box">
          <div className="chart-header">
            <h3>🧩 Phân tích khía cạnh</h3>
            <p>Điểm trung bình theo từng nhóm câu hỏi</p>
          </div>
          <div className="chart-canvas-container">
             <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 5 } } }} />
          </div>
        </div>

        <div className="chart-box">
          <div className="chart-header">
            <h3>📈 Xu hướng cảm xúc</h3>
            <p>Diễn biến tâm lý theo thời gian thực</p>
          </div>
          <div className="chart-canvas-container">
            <Line data={lineChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* --- BẢNG CHI TIẾT --- */}
      <div className="risk-section">
        <div className="section-header">
          <h3>🚨 Danh sách cần quan tâm đặc biệt</h3>
          <span className="badge-count">{getRiskStudents().length}</span>
        </div>
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
              {getRiskStudents().length > 0 ? (
                getRiskStudents().map((st) => {
                  const scores = Object.values(st.metrics || {});
                  const avg = (scores.reduce((a, b) => a + parseInt(b), 0) / scores.length).toFixed(1);
                  return (
                    <tr key={st.id}>
                      <td>{new Date(st.created_at).toLocaleString('vi-VN')}</td>
                      <td style={{fontWeight: 'bold'}}>{st.student_name || "Ẩn danh"}</td>
                      <td>{st.student_class}</td>
                      <td><span className="badge-risk">{avg}</span></td>
                      <td className="note-cell" title={st.open_ended_answer}>
                        {st.open_ended_answer}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', padding: '30px', color: '#888'}}>
                    Tuyệt vời! Không có học sinh nào trong nhóm báo động đỏ trong khoảng thời gian này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}