import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import LandingPage from "@/components/LandingPage"
import LoginPage from "@/components/LoginPage"
import RegisterPage from "@/components/RegisterPage"
import Dashboard from "@/components/Dashboard"
import WalletsPage from "@/components/WalletsPage"
import SavingsGoalsPage from "./components/SavingsGoalsPage"
import { AuthProvider } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/wallets" element={
            <ProtectedRoute>
              <WalletsPage />
            </ProtectedRoute>
          } />
          <Route path="/goals" element={
            <ProtectedRoute>
              <SavingsGoalsPage />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  )
}