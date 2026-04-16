import React, { useState, useEffect } from "react"
import TopicForm from "./TopicForm"
import ResultCard from "./ResultCard"
import TestPanel from "./TestPanel"
import EmotionCapture from "./EmotionCapture"
import SourceDocuments from "./SourceDocuments"
import { generateLearningMaterial, getNextTestInfo } from "../services/api"
import { AlertCircle, Clock, BookOpen } from "lucide-react"
import { useNavigate } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function LearnPage() {
  const [material, setMaterial] = useState("")
  const [topic, setTopic] = useState("")
  const [testStarted, setTestStarted] = useState(false)
  const [testCompleted, setTestCompleted] = useState(false)
  const [testResults, setTestResults] = useState(null)
  const [loadingMaterial, setLoadingMaterial] = useState(false)
  const [error, setError] = useState("")
  const [testSessionId, setTestSessionId] = useState(null)
  const [testNumber, setTestNumber] = useState(1)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const navigate = useNavigate()

  // Update page title when topic changes
  useEffect(() => {
    if (topic) {
      document.title = `${topic} - Learning Material`
    } else {
      document.title = "Learning Module"
    }
  }, [topic])

  useEffect(() => {
    // Check if student is selected
    const student = JSON.parse(localStorage.getItem("selectedStudent") || "null")
    if (!student) {
      setError("Please select a student from the dashboard first")
      // Redirect after 2 seconds
      setTimeout(() => navigate("/dashboard"), 2000)
      return
    }
    setSelectedStudent(student)
  }, [navigate])

  const handleTopicSubmit = async (topicInput) => {
    try {
      setError("")
      setLoadingMaterial(true)
      setTopic(topicInput)
      setTestStarted(false)
      setTestCompleted(false)
      setTestResults(null)

      const testInfo = await getNextTestInfo(topicInput)

      if (testInfo.testCompleted) {
        setError("All tests completed for this topic.")
        return
      }

      setTestNumber(testInfo.testNumber)

      const data = await generateLearningMaterial(topicInput, "easy")
      setMaterial(data.material)
    } catch (err) {
      setError(err.message || "Failed to generate material")
    } finally {
      setLoadingMaterial(false)
    }
  }

  const handleStartTest = (sessionId) => {
    setTestSessionId(sessionId)
    setTestStarted(true)
  }

  const handleTestComplete = (results, action = 'continue') => {
    setTestResults(results)
    setTestCompleted(true)
    setTestStarted(false)

    // Handle action
    if (action === 'back') {
      // Go back to dashboard immediately
      setTimeout(() => {
        navigate("/dashboard")
      }, 500)
      return
    }

    // 'continue' action: prepare next test or regenerate material
    if (action === 'continue') {
      if (testNumber === 1) {
        // After test 1, generate material with medium difficulty and show test 2
        resetForNextTest()
      } else {
        // After test 2+, go back to topic input
        resetAll()
      }
    }
  }

  const resetForNextTest = async () => {
    setTestCompleted(false)
    setTestResults(null)

    // Move to test 2 with medium difficulty
    setTestNumber(2)
    
    // Regenerate material for test 2 (slightly higher difficulty)
    try {
      setLoadingMaterial(true)
      const data = await generateLearningMaterial(topic, "medium")
      setMaterial(data.material)
      // Auto-start test 2 after showing material
      setTimeout(() => setTestStarted(true), 1000)
    } catch (err) {
      setError("Failed to prepare for test 2: " + err.message)
    } finally {
      setLoadingMaterial(false)
    }
  }

  const resetAll = () => {
    setMaterial("")
    setTopic("")
    setTestStarted(false)
    setTestCompleted(false)
    setTestResults(null)
    setError("")
    setTestNumber(1)
  }

  // ✅ TEST SCREEN (FULL SCREEN)
  if (testStarted) {
    return (
      <TestPanel
        topic={topic}
        testNumber={testNumber}
        studentId={selectedStudent?.id}
        learningMaterial={material}
        onTestComplete={handleTestComplete}
        onStartTest={handleStartTest}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {!testStarted && <EmotionCapture sessionId={testSessionId} isTestActive={false} />}

      <div className="w-full">
        {/* Error */}
        {error && (
          <div className="mx-auto max-w-full p-4 bg-red-50 border-b border-red-200 flex gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Topic Input */}
        {!material && (
          <div className="max-w-2xl mx-auto px-6 py-12">
            <TopicForm onSubmit={handleTopicSubmit} loading={loadingMaterial} />
          </div>
        )}

        {/* LEARNING MATERIAL - FULL PAGE */}
        {material && !testCompleted && (
          <div className="w-full">
            {/* Material Section */}
            <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-gradient-to-b from-blue-50 to-white min-h-screen">
              {/* Header */}
              <div className="mb-8 text-center">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">{topic}</h1>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Clock size={16} />
                  <span>Estimated reading time: 5-7 minutes</span>
                </div>
              </div>

              {/* Learning Material - Full Width Styled Markdown */}
              <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 lg:p-12 mb-8">
                <style>{`
                  .markdown-content {
                    max-width: 100%;
                  }
                  .markdown-content h1 {
                    font-size: 2.5em;
                    font-weight: bold;
                    margin: 1.5em 0 0.5em 0;
                    color: #1f2937;
                    border-bottom: 3px solid #2563eb;
                    padding-bottom: 0.5em;
                  }
                  .markdown-content h2 {
                    font-size: 2em;
                    font-weight: bold;
                    margin: 1.5em 0 0.7em 0;
                    color: #2563eb;
                    border-left: 4px solid #3b82f6;
                    padding-left: 1em;
                  }
                  .markdown-content h3 {
                    font-size: 1.4em;
                    font-weight: bold;
                    margin: 1.2em 0 0.6em 0;
                    color: #3b82f6;
                  }
                  .markdown-content h4 {
                    font-size: 1.2em;
                    font-weight: bold;
                    margin: 1em 0 0.5em 0;
                    color: #1e40af;
                  }
                  .markdown-content p {
                    margin: 1.2em 0;
                    line-height: 1.9;
                    color: #374151;
                    font-size: 1.08em;
                  }
                  .markdown-content ul {
                    margin: 1.2em 0;
                    padding-left: 2.5em;
                    list-style-type: none;
                  }
                  .markdown-content ul li {
                    margin: 0.9em 0;
                    color: #374151;
                    line-height: 1.8;
                    font-size: 1.06em;
                  }
                  .markdown-content ul li:before {
                    content: "✓ ";
                    color: #10b981;
                    font-weight: bold;
                    margin-right: 1em;
                    font-size: 1.1em;
                  }
                  .markdown-content ol {
                    margin: 1.2em 0;
                    padding-left: 2.5em;
                    list-style-type: none;
                    counter-reset: item;
                  }
                  .markdown-content ol li {
                    margin: 0.9em 0;
                    color: #374151;
                    line-height: 1.8;
                    font-size: 1.06em;
                    counter-increment: item;
                  }
                  .markdown-content ol li:before {
                    content: counter(item) ". ";
                    color: #2563eb;
                    font-weight: bold;
                    margin-right: 1em;
                    font-size: 1.1em;
                  }
                  .markdown-content strong {
                    font-weight: bold;
                    color: #1f2937;
                  }
                  .markdown-content em {
                    font-style: italic;
                    color: #4b5563;
                  }
                  .markdown-content code {
                    background-color: #f3f4f6;
                    border-radius: 0.3em;
                    padding: 0.3em 0.6em;
                    font-family: 'Monaco', 'Courier New', monospace;
                    color: #dc2626;
                    font-size: 0.96em;
                  }
                  .markdown-content pre {
                    background-color: #1f2937;
                    color: #f3f4f6;
                    padding: 1.5em;
                    border-radius: 0.5em;
                    overflow-x: auto;
                    margin: 1.5em 0;
                    border-left: 4px solid #3b82f6;
                  }
                  .markdown-content pre code {
                    background-color: transparent;
                    color: #f3f4f6;
                    padding: 0;
                  }
                  .markdown-content blockquote {
                    border-left: 5px solid #3b82f6;
                    padding: 1em 1.5em;
                    margin: 1.5em 0;
                    color: #4b5563;
                    background-color: #eff6ff;
                    border-radius: 0.5em;
                    font-style: italic;
                    font-size: 1.05em;
                  }
                  .markdown-content hr {
                    margin: 2.5em 0;
                    border: none;
                    border-top: 2px solid #e5e7eb;
                  }
                  .markdown-content table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 2em 0;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5em;
                    overflow: hidden;
                  }
                  .markdown-content table thead {
                    background-color: #f0f4ff;
                  }
                  .markdown-content table th,
                  .markdown-content table td {
                    padding: 1em;
                    text-align: left;
                    border-bottom: 1px solid #e5e7eb;
                  }
                  .markdown-content table th {
                    font-weight: bold;
                    color: #1f2937;
                    background-color: #f0f4ff;
                  }
                  .markdown-content table tbody tr:nth-child(even) {
                    background-color: #f9fafb;
                  }
                  .markdown-content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.5em;
                    margin: 1.5em 0;
                  }
                `}</style>
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {material}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Source Documents */}
              <div className="w-full">
                <SourceDocuments topic={topic} />
              </div>
            </div>

            {/* Start Test Button */}
            <div className="w-full text-center py-8 sm:py-12 bg-white border-t sticky bottom-0 z-10">
              <div className="px-4">
                <button
                  onClick={() => setTestStarted(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 sm:px-12 py-3 sm:py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold text-base sm:text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto mb-3"
                >
                  <BookOpen size={20} />
                  Start Test
                </button>
                <p className="text-gray-500 text-sm">Ready to test your knowledge? Click above to begin.</p>
              </div>
            </div>
          </div>
        )}

        {/* Test results are now handled in TestPanel with Back/Continue buttons */}
      </div>
    </div>
  )
}

export default LearnPage