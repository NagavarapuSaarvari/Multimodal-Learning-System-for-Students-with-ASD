import React, { useState } from "react"
import { LogOut, Menu, X, BookOpen, Users, BarChart3, Upload, BookMarked } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"

function Navbar({ user, selectedStudent, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    onLogout()
    setMobileMenuOpen(false)
    navigate("/login")
  }

  const handleDashboard = () => {
    navigate("/dashboard")
    setMobileMenuOpen(false)
  }

  const handleStudents = () => {
    navigate("/students")
    setMobileMenuOpen(false)
  }

  const handleUpload = () => {
    navigate("/upload")
    setMobileMenuOpen(false)
  }

  const handleLearn = () => {
    navigate("/learn")
    setMobileMenuOpen(false)
  }

  const handleHome = () => {
    navigate("/dashboard")
    setMobileMenuOpen(false)
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center cursor-pointer gap-3" onClick={handleHome}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <BookOpen size={24} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900">LearnHub</h1>
              <p className="text-xs text-gray-600">
                {selectedStudent ? `Learning: ${selectedStudent.name}` : "Admin Dashboard"}
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {user && (
              <>
                <div className="flex items-center gap-6">
                  <button
                    onClick={handleDashboard}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                      isActive("/dashboard")
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <BarChart3 size={18} />
                    Dashboard
                  </button>
                  <button
                    onClick={handleStudents}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                      isActive("/students")
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Users size={18} />
                    Students
                  </button>

                  {/* Learning Navigation - Only if student selected */}
                  {selectedStudent && (
                    <>
                      <div className="border-l border-gray-300"></div>
                      <button
                        onClick={handleUpload}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                          isActive("/upload")
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <Upload size={18} />
                        Upload
                      </button>
                      <button
                        onClick={handleLearn}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                          isActive("/learn")
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <BookMarked size={18} />
                        Learn
                      </button>
                    </>
                  )}
                </div>

                <div className="border-l border-gray-200 pl-6 flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">Admin</p>
                    </div>
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-10 h-10 rounded-full border-2 border-blue-600 shadow-sm"
                      title={user.name}
                    />
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                    title="Logout"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            {user && (
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full border-2 border-blue-600"
              />
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && user && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
            <button
              onClick={handleDashboard}
              className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/dashboard")
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <BarChart3 size={18} />
              Dashboard
            </button>
            <button
              onClick={handleStudents}
              className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/students")
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Users size={18} />
              Students
            </button>

            {/* Learning Navigation - Mobile */}
            {selectedStudent && (
              <>
                <div className="border-t border-gray-200 my-2"></div>
                <button
                  onClick={handleUpload}
                  className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive("/upload")
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Upload size={18} />
                  Upload Documents
                </button>
                <button
                  onClick={handleLearn}
                  className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive("/learn")
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <BookMarked size={18} />
                  Learn & Test
                </button>
              </>
            )}

            <div className="px-4 py-3 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
