import React, { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import Navbar from "./components/Navbar"
import DocumentUpload from "./components/DocumentUpload"
import LearnPage from "./components/LearnPage"
import Dashboard from "./components/Dashboard"
import LoginPage from "./components/LoginPage"
import StudentManagement from "./components/StudentManagement"
import AdminDashboard from "./components/AdminDashboard"
import "./App.css"

function App() {
  const [user, setUser] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    const token = localStorage.getItem("accessToken")
    const adminId = localStorage.getItem("adminId")

    if (storedUser && token) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        
        // Set admin ID if not already set
        if (!adminId) {
          localStorage.setItem("adminId", userData.id)
        }
      } catch (error) {
        console.error("Error parsing stored user:", error)
        localStorage.removeItem("user")
        localStorage.removeItem("accessToken")
        localStorage.removeItem("adminId")
      }
    }

    setLoading(false)
  }, [])

  const handleLoginSuccess = (userData) => {
    setUser(userData)
    localStorage.setItem("adminId", userData.id)
  }

  const handleLogout = () => {
    setUser(null)
    setSelectedStudent(null)
    localStorage.removeItem("user")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("adminId")
    localStorage.removeItem("selectedStudent")
  }

  const handleSelectStudent = (student) => {
    setSelectedStudent(student)
    localStorage.setItem("selectedStudent", JSON.stringify(student))
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
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50">
        {user && (
          <Navbar
            user={user}
            selectedStudent={selectedStudent}
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
                  <Navigate to="/dashboard" replace />
                ) : (
                  <LoginPage onLoginSuccess={handleLoginSuccess} />
                )
              }
            />

            {/* Protected Routes */}
            {user ? (
              <>
                {/* Admin Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <div className="min-h-screen bg-gray-50 py-8">
                      <AdminDashboard 
                        adminId={user.id}
                        onSelectStudent={handleSelectStudent}
                      />
                    </div>
                  }
                />
                <Route
                  path="/students"
                  element={
                    <div className="min-h-screen bg-gray-50 py-8">
                      <StudentManagement 
                        adminId={user.id}
                        onStudentAdded={(student) => handleSelectStudent(student)}
                      />
                    </div>
                  }
                />

                {/* Learning Routes - Only if student is selected */}
                {selectedStudent ? (
                  <>
                    <Route path="/upload" element={<DocumentUpload />} />
                    <Route path="/learn" element={<LearnPage />} />
                  </>
                ) : null}

                <Route path="/" element={<Navigate to="/dashboard" replace />} />
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