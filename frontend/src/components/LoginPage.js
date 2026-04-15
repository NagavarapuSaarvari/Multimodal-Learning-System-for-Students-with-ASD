import React, { useState, useEffect } from "react"
import { AlertCircle, Loader } from "lucide-react"

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
      document.head.removeChild(script)
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

      // Store tokens
      localStorage.setItem("accessToken", data.access_token)
      localStorage.setItem("user", JSON.stringify(data.user))

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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-3xl">AI</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning Pro</h1>
            <p className="text-gray-600">Personalized Learning for Students with ASD</p>
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

          {/* Google Sign-In Button */}
          <div className="mb-8">
            {loading ? (
              <div className="w-full bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-medium">
                <Loader size={20} className="animate-spin" />
                Signing in...
              </div>
            ) : (
              <div id="google_signin_button" className="w-full"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
