import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StudentApp from './Student';
import AdminDashboard from './Admin';
import LandingPage from './LandingPage';
import LandingPage3D from './LandingPage3D';

// App.jsx bây giờ chỉ đóng vai trò định tuyến (Điều hướng)
// - Vào trang chủ (/) -> Hiện giao diện Học sinh
// - Vào /admin -> Hiện giao diện Quản lý

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage3D/>} />
        <Route path="/student" element={<StudentApp />} />
        <Route path="/admin" element={<AdminDashboard/>} />
      </Routes>
    </Router>
  );
}

export default App;