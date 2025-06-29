import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import LandingPage from "@/components/LandingPage"
import LoginPage from "@/components/LoginPage"
import RegisterPage from "@/components/RegisterPage"
import Dashboard from "@/components/Dashboard"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  )
}