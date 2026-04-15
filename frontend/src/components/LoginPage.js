import React, { useState, useEffect } from "react"
import { AlertCircle, Loader, BookOpen, Users, BarChart3, Sparkles } from "lucide-react"

function LoginPage({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID

  useEffect(() => {
    // Load Google Sign-In script
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = initializeGoogleSignIn
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  const initializeGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleSignIn,
      })
      window.google.accounts.id.renderButton(
        document.getElementById("google_signin_button"),
        {
          theme: "outline",
          size: "large",
          width: "100%",
          locale: "en",
        }
      )
    }
  }

  const handleGoogleSignIn = async (response) => {
    try {
      setLoading(true)
      setError("")

      // Send token to backend
      const backendResponse = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/google/callback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: response.credential,
          }),
        }
      )

      if (!backendResponse.ok) {
        throw new Error("Authentication failed")
      }

      const data = await backendResponse.json()

      // Clear ALL old data from localStorage first
      localStorage.removeItem("accessToken")
      localStorage.removeItem("user")
      localStorage.removeItem("adminId")
      localStorage.removeItem("selectedStudent")

      // Store new tokens and user info (with UUID from backend)
      localStorage.setItem("accessToken", data.access_token)
      localStorage.setItem("user", JSON.stringify(data.user))
      localStorage.setItem("adminId", data.user.id)  // This is now the UUID from backend

      console.log("Login successful, admin ID:", data.user.id)

      // Call parent callback
      onLoginSuccess(data.user)
    } catch (err) {
      setError(err.message || "Failed to sign in. Please try again.")
      console.error("Sign-in error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left Column - Features */}
          <div className="text-white hidden md:block">
            <h2 className="text-4xl font-bold mb-6">Adaptive Learning for Every Student</h2>
            <p className="text-gray-300 mb-8 text-lg">Empower students with ASD through personalized, emotion-aware interactive learning experiences.</p>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center">
                  <BookOpen size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Intelligent Content Delivery</h3>
                  <p className="text-gray-300 text-sm">Personalized learning paths adapted to each student's pace</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Emotion-Aware Learning</h3>
                  <p className="text-gray-300 text-sm">Real-time emotion detection to optimize learning engagement</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-400 to-teal-400 rounded-lg flex items-center justify-center">
                  <Users size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Admin Control</h3>
                  <p className="text-gray-300 text-sm">Manage multiple students and track progress in real-time</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-400 to-red-400 rounded-lg flex items-center justify-center">
                  <BarChart3 size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Advanced Analytics</h3>
                  <p className="text-gray-300 text-sm">Comprehensive insights into learning patterns and performance</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Login Form */}
          <div>
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              {/* Logo */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <BookOpen size={32} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">LearnHub</h1>
                <p className="text-gray-500 text-sm">Adaptive Learning Platform for All</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-red-800 font-medium text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-900 text-sm font-medium">
                  Admins can manage multiple students and track their personalized learning progress.
                </p>
              </div>

              {/* Google Sign-In Button */}
              <div className="mb-6">
                {loading ? (
                  <div className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-medium shadow-md">
                    <Loader size={20} className="animate-spin" />
                    Signing you in...
                  </div>
                ) : (
                  <div id="google_signin_button" className="w-full flex justify-center"></div>
                )}
              </div>

              {/* Footer Text */}
              <p className="text-center text-gray-500 text-xs">
                By signing in with Google, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
