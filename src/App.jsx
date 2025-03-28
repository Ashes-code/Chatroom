// import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SignUp from "./signup";
import Login from "./login";
import Dashboard from "./dashboard";

function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignUp />} />
        <Route path="/Chatroom/login" element={<Login />} />
        <Route path="/Chatroom/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  )
}

export default App
