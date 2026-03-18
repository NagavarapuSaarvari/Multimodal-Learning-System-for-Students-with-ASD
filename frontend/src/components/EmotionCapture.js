import React, { useRef, useEffect, useState } from "react"
import { Camera, AlertCircle } from "lucide-react"
import { storeEmotion } from "../services/api"

function EmotionCapture({ sessionId, isTestActive }) {
  const videoRef = useRef(null)
  const [hasCamera, setHasCamera] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [emotionStatus, setEmotionStatus] = useState("waiting")
  const captureIntervalRef = useRef(null)

  useEffect(() => {
    if (!isTestActive) return

    let videoRefCurrent = null

    const initializeCamera = async () => {
      try {
        setCameraError("")
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          },
          audio: false
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRefCurrent = videoRef.current
          setHasCamera(true)
          setEmotionStatus("capturing")
        }
      } catch (err) {
        console.warn("Camera access failed:", err)
        setCameraError("Camera access denied. Studies will continue without emotion tracking.")
        setHasCamera(false)
      }
    }

    initializeCamera()

    // Capture emotion every 5 seconds during test
    const emotionInterval = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        try {
          const canvas = document.createElement("canvas")
          canvas.width = videoRef.current.videoWidth
          canvas.height = videoRef.current.videoHeight
          const context = canvas.getContext("2d")
          context.drawImage(videoRef.current, 0, 0)
          const imageDataUrl = canvas.toDataURL("image/jpeg")

          // Send to backend for emotion detection
          await storeEmotion(sessionId, imageDataUrl)
        } catch (err) {
          console.warn("Emotion capture error:", err)
        }
      }
    }, 5000)

    return () => {
      if (videoRefCurrent && videoRefCurrent.srcObject) {
        const tracks = videoRefCurrent.srcObject.getTracks()
        tracks.forEach(track => track.stop())
      }
      clearInterval(emotionInterval)
    }
  }, [isTestActive, sessionId])

  if (!isTestActive) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border-2 border-blue-200 p-3 max-w-xs">
      {cameraError ? (
        <div className="flex items-start gap-2 text-sm text-amber-700">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Camera size={14} className="text-blue-600" />
            <span className="text-xs font-semibold text-gray-600">Emotion Tracking</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              emotionStatus === "capturing" 
                ? "bg-green-100 text-green-700" 
                : "bg-gray-100 text-gray-600"
            }`}>
              {emotionStatus === "capturing" ? "Active" : "Ready"}
            </span>
          </div>
          {hasCamera && (
            <div className="rounded-md overflow-hidden border border-gray-200" style={{ maxWidth: "150px" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            {hasCamera ? "Your emotions are being tracked for better insights." : "Camera is disabled."}
          </p>
        </>
      )}
    </div>
  )
}

export default EmotionCapture
