import React, { useState, useEffect, useMemo } from 'react';
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
import { Users, Activity, AlertTriangle, Filter } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

// --- CẤU HÌNH API ---
const API_BASE_URL = "https://emomap-backend.onrender.com"; 

export default function AdminDashboard() {
  const [data, setData] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all'); 
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Lấy dữ liệu
  const fetchData = async () => {
    setLoading(true);
    try {
      const [surveysRes, questionsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/all-surveys`),
        axios.get(`${API_BASE_URL}/admin/questions`)
      ]);
      console.log("Surveys:", surveysRes.data);
      console.log("Questions:", questionsRes.data);
      setData(surveysRes.data || []);
      setAllQuestions(questionsRes.data || []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

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
      if (timeFilter === 'today') return itemDate >= startOfDay;
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
        end.setHours(23, 59, 59, 999);
        return itemDate >= start && itemDate <= end;
      }
      return true;
    });
  }, [data, timeFilter, customStart, customEnd]);

  // --- TÍNH ĐIỂM TRUNG BÌNH ---
  const questionStats = useMemo(() => {
    if (allQuestions.length === 0) return { labels: [], scores: [] };

    const stats = {};
    // Khởi tạo stats cho TẤT CẢ câu hỏi (để luôn hiện trên biểu đồ)
    allQuestions.forEach(q => {
      stats[q.id] = { total: 0, count: 0, text: q.question_text };
    });

    // Duyệt qua bài làm để cộng điểm
    filteredData.forEach(response => {
      const metrics = response.metrics || {};
      Object.keys(metrics).forEach(qId => {
        if (stats[qId]) {
          stats[qId].total += parseInt(metrics[qId]);
          stats[qId].count += 1;
        }
      });
    });

    // Map ra mảng, nếu chưa có ai trả lời thì để điểm là 0
    const labels = allQuestions.map(q => q.question_text.length > 40 ? q.question_text.substring(0, 40) + "..." : q.question_text);
    const scores = allQuestions.map(q => stats[q.id].count > 0 ? (stats[q.id].total / stats[q.id].count).toFixed(1) : 0);

    return { labels, scores };
  }, [allQuestions, filteredData]);

  // Biểu đồ Cột Ngang
  const barChartData = {
    labels: questionStats.labels,
    datasets: [{
      label: 'Mức độ trung bình (1-5)',
      data: questionStats.scores,
      backgroundColor: 'rgba(99, 102, 241, 0.7)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 1,
      borderRadius: 4,
      barThickness: 20, // Độ dày cột
    }],
  };

  const barChartOptions = {
    indexAxis: 'y', 
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { min: 0, max: 5 } },
    plugins: { legend: { position: 'top' } }
  };

  // Biểu đồ Xu hướng
  const lineChartData = {
    labels: filteredData.slice(0, 15).reverse().map(d => new Date(d.created_at).toLocaleDateString('vi-VN')),
    datasets: [{
      label: 'Cảm xúc chung',
      data: filteredData.slice(0, 15).reverse().map(d => {
         const s = Object.values(d.metrics||{}); 
         return s.length > 0 ? (s.reduce((a,b)=>a+parseInt(b),0)/s.length).toFixed(1) : 0;
      }),
      borderColor: '#ec4899',
      backgroundColor: 'rgba(236, 72, 153, 0.2)',
      fill: true,
      tension: 0.4,
    }]
  };

  const getRiskStudents = () => {
    return filteredData.filter(item => {
      const scores = Object.values(item.metrics || {});
      if (scores.length === 0) return false;
      const avg = scores.reduce((a, b) => a + parseInt(b), 0) / scores.length;
      return avg > 3.5; 
    });
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="header-title">
          <h1>📊 Báo cáo Bạo lực học đường</h1>
          <p>Dữ liệu cập nhật thời gian thực</p>
        </div>
        <button onClick={fetchData} className="refresh-btn">
          {loading ? 'Đang tải...' : 'Làm mới dữ liệu'}
        </button>
      </header>

      {/* FILTER BAR */}
      <div className="filter-bar">
        <div className="filter-group">
          <Filter size={18} className="filter-icon" />
          <span className="filter-label">Thời gian:</span>
          <button className={`filter-btn ${timeFilter === 'today' ? 'active' : ''}`} onClick={() => setTimeFilter('today')}>Hôm nay</button>
          <button className={`filter-btn ${timeFilter === 'week' ? 'active' : ''}`} onClick={() => setTimeFilter('week')}>7 Ngày</button>
          <button className={`filter-btn ${timeFilter === 'all' ? 'active' : ''}`} onClick={() => setTimeFilter('all')}>Tất cả</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="icon-box blue"><Users size={24} color="white" /></div>
          <div><h3>Lượt tham gia</h3><p className="stat-num">{filteredData.length}</p></div>
        </div>
        <div className="stat-card">
          <div className="icon-box green"><Activity size={24} color="white" /></div>
          <div><h3>Câu hỏi hệ thống</h3><p className="stat-num">{allQuestions.length}</p></div>
        </div>
        <div className="stat-card">
          <div className="icon-box red"><AlertTriangle size={24} color="white" /></div>
          <div><h3>Báo động (Avg &gt; 3.5)</h3><p className="stat-num risk-text">{getRiskStudents().length} HS</p></div>
        </div>
      </div>

      <div className="charts-section" style={{ gridTemplateColumns: '1fr' }}> 
        <div className="chart-box" style={{ height: '700px' }}>
          <div className="chart-header">
            <h3>🧩 Phân tích 18 tiêu chí</h3>
            <p>{allQuestions.length === 0 ? "⚠️ Chưa tải được danh sách câu hỏi. Vui lòng kiểm tra API /admin/questions" : "Điểm trung bình của từng vấn đề"}</p>
          </div>
          <div className="chart-canvas-container" style={{ height: '100%' }}>
             <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>
      </div>
      
      <div className="charts-section" style={{ marginTop: '20px' }}>
         <div className="chart-box">
            <div className="chart-header"><h3>📈 Xu hướng theo thời gian</h3></div>
            <div className="chart-canvas-container">
              <Line data={lineChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
         </div>
      </div>

      <div className="risk-section">
        <div className="section-header">
          <h3>🚨 Danh sách cần quan tâm</h3>
          <span className="badge-count">{getRiskStudents().length}</span>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Học sinh</th>
                <th>Lớp</th>
                <th>Mức độ TB</th>
                <th>Lời tâm sự</th>
              </tr>
            </thead>
            <tbody>
              {getRiskStudents().length > 0 ? (
                getRiskStudents().map((st) => {
                  const scores = Object.values(st.metrics || {});
                  const avg = scores.length > 0 ? (scores.reduce((a, b) => a + parseInt(b), 0) / scores.length).toFixed(1) : 0;
                  return (
                    <tr key={st.id}>
                      <td>{new Date(st.created_at).toLocaleString('vi-VN')}</td>
                      <td style={{fontWeight: 'bold'}}>{st.student_name || "Ẩn danh"}</td>
                      <td>{st.student_class}</td>
                      <td><span className="badge-risk">{avg}/5</span></td>
                      <td className="note-cell" title={st.open_ended_answer}>
                        {st.open_ended_answer}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', padding: '30px', color: '#888'}}>
                    Không có học sinh nào ở mức báo động.
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