// import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SignUp from "./signup";
import Login from "./login";
import Dashboard from "./dashboard";
import AuthWrapper from "./authWrapper";

function App() {

  return (
    <Router>
      <AuthWrapper>
        <Routes>
          <Route path="/" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </AuthWrapper>
    </Router>
  )
}

export default App
