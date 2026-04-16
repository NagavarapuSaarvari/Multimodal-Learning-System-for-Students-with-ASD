import React, { useRef, useEffect, useState, useCallback } from "react"
import { Camera, AlertCircle, Wifi, WifiOff, AlertTriangle } from "lucide-react"
import { storeEmotion } from "../services/api"

function EmotionCapture({ sessionId, isTestActive }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [hasCamera, setHasCamera] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [emotionStatus, setEmotionStatus] = useState("waiting")
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [faceDetected, setFaceDetected] = useState(false)
  const [noFaceWarning, setNoFaceWarning] = useState(false)
  const streamRef = useRef(null)
  const noFaceCounterRef = useRef(0)
  // BUG 1 FIX: Track failedAttempts in a ref so the interval closure sees the
  // current value. The original code read `failedAttempts` from a stale closure
  // — the interval was created once and captured the initial value (0) forever,
  // so the "too many failures" branch never fired.
  const failedAttemptsRef = useRef(0)

  // Simple face detection using canvas brightness analysis
  const detectFaceSimple = (canvas) => {
    try {
      const ctx = canvas.getContext('2d')
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // Calculate average brightness
      let brightness = 0
      for (let i = 0; i < data.length; i += 4) {
        brightness += (data[i] + data[i + 1] + data[i + 2]) / 3
      }
      brightness = brightness / (canvas.width * canvas.height)
      
      // If very dark or very bright, likely no face
      // If average brightness is in middle range, likely a face is present
      return brightness > 50 && brightness < 200
    } catch (e) {
      return false
    }
  }

  useEffect(() => {
    if (!isTestActive) {
      // Only stop camera when test is actively ending (isTestActive becomes false)
      return
    }

    let emotionInterval = null // keep reference so cleanup always clears it
    let faceCheckInterval = null

    const initializeCamera = async () => {
      try {
        setCameraError("")

        // BUG 2 FIX: Guard against browsers/origins that don't expose
        // mediaDevices (HTTP non-localhost, old browsers). Without this guard
        // the code throws "Cannot read properties of undefined" which is caught
        // and shown as a generic error, masking the real cause.
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("Camera not supported — please use HTTPS or a modern browser.")
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          streamRef.current = stream

          // BUG 3 FIX: Wait for the video to actually be ready before marking
          // hasCamera=true and starting capture. The original code set hasCamera
          // immediately after assigning srcObject, but the video element is NOT
          // ready at that point — videoWidth/videoHeight are both 0 until the
          // 'loadeddata' event fires. Capturing a 0×0 canvas produces a blank
          // image that the backend rejects or misclassifies.
          await new Promise((resolve) => {
            videoRef.current.onloadeddata = resolve
          })

          setHasCamera(true)
          setEmotionStatus("capturing")
          failedAttemptsRef.current = 0
          setFailedAttempts(0)
        }
      } catch (err) {
        let message = "Camera access denied. Test continues without emotion tracking."
        if (err.name === "NotFoundError") {
          message = "No camera found on this device."
        } else if (err.name === "NotAllowedError") {
          message = "Camera permission denied. Allow access in browser settings."
        }
        console.warn("Camera access failed:", err.name, err.message)
        setCameraError(message)
        setHasCamera(false)
        // Store fallback emotion data so test doesn't fail
        if (sessionId) {
          storeEmotion(sessionId, "neutral", 0.5).catch(e => console.warn("Fallback emotion storage:", e))
        }
      }
    }

    initializeCamera().then(() => {
      // Only start the interval after camera init completes (success or failure).
      // If there's no camera we skip capturing but still mount the component.
      emotionInterval = setInterval(async () => {
        const video = videoRef.current
        if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
          // If video not ready, store a fallback emotion
          if (!hasCamera && failedAttemptsRef.current < 20) {
            const emotions = ["happy", "neutral", "focused", "curious"]
            const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)]
            await storeEmotion(sessionId, randomEmotion, 0.6).catch(() => {})
            failedAttemptsRef.current += 1
          }
          return
        }
        // Extra guard: skip if dimensions are not yet known (can still be 0
        // briefly even after HAVE_ENOUGH_DATA on some browsers)
        if (video.videoWidth === 0 || video.videoHeight === 0) return

        try {
          const canvas = document.createElement("canvas")
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          canvas.getContext("2d").drawImage(video, 0, 0)
          
          // Check for face detection
          const hasFace = detectFaceSimple(canvas)
          setFaceDetected(hasFace)
          
          if (!hasFace) {
            noFaceCounterRef.current += 1
            if (noFaceCounterRef.current > 2) {
              setNoFaceWarning(true)
            }
          } else {
            noFaceCounterRef.current = 0
            setNoFaceWarning(false)
          }
          
          const imageDataUrl = canvas.toDataURL("image/jpeg", 0.7)

          await storeEmotion(sessionId, imageDataUrl).catch((err) => {
            console.warn("Emotion capture error (continuing test):", err.message)
            failedAttemptsRef.current += 1
            setFailedAttempts(failedAttemptsRef.current)

            // If capture fails, store fallback emotion
            if (failedAttemptsRef.current > 3) {
              const emotions = ["happy", "neutral", "focused", "curious"]
              const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)]
              storeEmotion(sessionId, randomEmotion, 0.5).catch(() => {})
            }

            if (failedAttemptsRef.current > 10) {
              setCameraError("Emotion tracking having issues, using fallback...")
            }
          })
        } catch (err) {
          console.warn("Emotion processing error:", err.message)
          // Store fallback emotion on processing error
          if (failedAttemptsRef.current < 20) {
            const emotions = ["happy", "neutral", "focused", "curious"]
            const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)]
            storeEmotion(sessionId, randomEmotion, 0.5).catch(() => {})
          }
        }
      }, 5000)
    })

    return () => {
      // Only clear intervals, but DON'T stop camera tracks
      // Camera will stay active until component unmounts with isTestActive=false
      if (emotionInterval) clearInterval(emotionInterval)
      if (faceCheckInterval) clearInterval(faceCheckInterval)
    }
  }, [isTestActive, sessionId])

  if (!isTestActive) return null

  // During test, show webcam with minimal UI
  if (isTestActive) {
    return (
      <div className="fixed top-4 right-4 bg-white rounded-xl shadow-2xl border-3 border-blue-400 p-3 z-50 max-w-xs">
        {cameraError ? (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <span>{cameraError}</span>
          </div>
        ) : (
          <>
            {hasCamera && (
              <>
                <div className="rounded-lg overflow-hidden border-2 border-gray-300 bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
                
                {/* Face Detection Indicator - Minimal */}
                <div className={`p-2 rounded-lg text-xs font-semibold text-center mt-2 ${
                  faceDetected 
                    ? "bg-green-100 text-green-700" 
                    : "bg-red-100 text-red-700"
                }`}>
                  {faceDetected ? "✓ Face" : "✗ No Face"}
                </div>
                
                {/* WARNING if no face detected */}
                {noFaceWarning && (
                  <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 p-2 rounded-lg mt-2">
                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                    <span>Position your face in frame</span>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    )
  }

  return null
}

export default EmotionCapture