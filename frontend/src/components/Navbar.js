import React, { useState } from "react"
import { LogOut, BarChart3, Menu, X, BookOpen, Upload } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"

function Navbar({ user, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    onLogout()
    setMobileMenuOpen(false)
  }

  const handleDashboard = () => {
    navigate("/dashboard")
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
    navigate("/upload")
    setMobileMenuOpen(false)
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo & Tagline */}
          <div className="flex items-center cursor-pointer" onClick={handleHome}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Learning Pro</h1>
                <p className="text-xs text-gray-600 font-medium">Personalized AI-Powered Learning for Students with ASD</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {user && (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUpload}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      isActive("/upload")
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Upload size={18} />
                    Upload
                  </button>
                  <button
                    onClick={handleLearn}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      isActive("/learn")
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <BookOpen size={18} />
                    Learn
                  </button>
                </div>

                <div className="border-l border-gray-200 pl-6 flex items-center gap-4">
                  <button
                    onClick={handleDashboard}
                    className={`flex items-center gap-2 transition-colors font-medium ${
                      isActive("/dashboard")
                        ? "text-blue-600"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                  >
                    <BarChart3 size={20} />
                    Dashboard
                  </button>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-10 h-10 rounded-full border-2 border-blue-600 cursor-pointer hover:border-teal-500 transition-colors"
                      title={user.name}
                    />
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
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
          <div className="md:hidden border-t border-gray-200 py-4 space-y-3">
            <button
              onClick={handleUpload}
              className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/upload")
                  ? "bg-blue-600 text-white"
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
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <BookOpen size={18} />
              Learn & Test
            </button>
            <button
              onClick={handleDashboard}
              className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/dashboard")
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <BarChart3 size={18} />
              Dashboard
            </button>
            <div className="px-4 py-2 border-t border-gray-200">
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
