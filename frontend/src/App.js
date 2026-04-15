import React, { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Navbar from "./components/Navbar"
import DocumentUpload from "./components/DocumentUpload"
import LearnPage from "./components/LearnPage"
import Dashboard from "./components/Dashboard"
import LoginPage from "./components/LoginPage"
import "./App.css"

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    const token = localStorage.getItem("accessToken")

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error("Error parsing stored user:", error)
        localStorage.removeItem("user")
        localStorage.removeItem("accessToken")
      }
    }

    setLoading(false)
  }, [])

  const handleLoginSuccess = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("user")
    localStorage.removeItem("accessToken")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {user && (
          <Navbar
            user={user}
            onLogout={handleLogout}
          />
        )}

        <main>
          <Routes>
            {/* Login Route */}
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to="/upload" replace />
                ) : (
                  <LoginPage onLoginSuccess={handleLoginSuccess} />
                )
              }
            />

            {/* Protected Routes */}
            {user ? (
              <>
                <Route path="/upload" element={<DocumentUpload />} />
                <Route path="/learn" element={<LearnPage />} />
                <Route path="/dashboard" element={<Dashboard user={user} />} />
                <Route path="/" element={<Navigate to="/upload" replace />} />
              </>
            ) : (
              <Route path="*" element={<Navigate to="/login" replace />} />
            )}
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App