import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Quan trọng: Phải import file CSS này thì mới có giao diện

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
function toggleChat() {
  var chatWindow = document.getElementById("myChatWindow");
  var btn = document.querySelector(".chat-btn-float");

  if (chatWindow.style.display === "none" || chatWindow.style.display === "") {
      chatWindow.style.display = "flex"; // Hiện chat box
      btn.innerHTML = "✖"; // Đổi icon nút thành dấu X
  } else {
      chatWindow.style.display = "none"; // Ẩn chat box
      btn.innerHTML = "💬"; // Đổi icon nút về lại chat
  }
}