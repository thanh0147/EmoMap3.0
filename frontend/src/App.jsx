import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StudentApp from './StudentApp';
import AdminDashboard from './AdminDashboard';

// App.jsx bây giờ chỉ đóng vai trò định tuyến (Điều hướng)
// - Vào trang chủ (/) -> Hiện giao diện Học sinh
// - Vào /admin -> Hiện giao diện Quản lý

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StudentApp />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;