import React, { useState } from "react"
import TopicForm from "./TopicForm"
import ResultCard from "./ResultCard"
import TestPanel from "./TestPanel"
import EmotionCapture from "./EmotionCapture"
import SourceDocuments from "./SourceDocuments"
import { generateLearningMaterial, getNextTestInfo } from "../services/api"
import { AlertCircle } from "lucide-react"

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

  const handleTestComplete = (results) => {
    setTestResults(results)
    setTestCompleted(true)
    setTestStarted(false)
  }

  const resetForNextTest = () => {
    setTestCompleted(false)
    setTestResults(null)
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
        onTestComplete={handleTestComplete}
        onStartTest={handleStartTest}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <EmotionCapture sessionId={testSessionId} isTestActive={testStarted} />

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
            <div className="px-8 py-12 max-w-6xl mx-auto">
              <div className="bg-white">
                <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">{topic}</h1>
                <div className="prose prose-lg max-w-none">
                  <div className="bg-blue-50 border-l-4 border-blue-600 p-8 rounded-r-xl text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {material}
                  </div>
                </div>
              </div>

              {/* Source Documents */}
              <SourceDocuments topic={topic} />
            </div>

            {/* Start Test Button */}
            <div className="text-center py-12 bg-gradient-to-t from-gray-50 to-white border-t">
              <button
                onClick={() => setTestStarted(true)}
                className="bg-blue-600 text-white px-12 py-4 rounded-lg hover:bg-blue-700 font-semibold text-lg transition-colors shadow-md"
              >
                Start Test {testNumber}/3
              </button>
              <p className="text-gray-500 mt-4">Review the material above, then test your knowledge</p>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {testCompleted && testResults && (
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="bg-white p-12 rounded-2xl shadow-2xl text-center max-w-2xl">
              <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${
                testResults.score >= 70 ? "bg-green-100" : "bg-blue-100"
              }`}>
                <span className={`text-3xl font-bold ${
                  testResults.score >= 70 ? "text-green-600" : "text-blue-600"
                }`}>{testResults.score}%</span>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Test {testNumber} Complete!
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                You answered {testResults.correctAnswers} out of {testResults.totalQuestions} questions correctly
              </p>

              {testNumber < 3 ? (
                <button
                  onClick={resetForNextTest}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Continue to Test {testNumber + 1}
                </button>
              ) : (
                <button
                  onClick={resetAll}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold"
                >
                  All Tests Complete! 🎉
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LearnPage