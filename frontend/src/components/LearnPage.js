import React, { useState } from "react"
import TopicForm from "./TopicForm"
import ResultCard from "./ResultCard"
import TestPanel from "./TestPanel"
import EmotionCapture from "./EmotionCapture"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-6">
      <EmotionCapture sessionId={testSessionId} isTestActive={testStarted} />

      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-800 mb-2">
            Adaptive Learning System
          </h2>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle size={20} className="text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Topic Input */}
        {!material && (
          <TopicForm onSubmit={handleTopicSubmit} loading={loadingMaterial} />
        )}

        {/* MATERIAL FULL WIDTH */}
        {material && !testCompleted && (
          <div className="w-full">
            <ResultCard material={material} topic={topic} />

            {/* ✅ ONLY BUTTON */}
            <div className="mt-10 flex justify-center">
              <button
                onClick={() => setTestStarted(true)}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Start Test
              </button>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {testCompleted && testResults && (
          <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              Test {testNumber} Completed
            </h2>

            <p className="mb-4">
              Score: {testResults.score}% ({testResults.correctAnswers}/
              {testResults.totalQuestions})
            </p>

            {testNumber < 3 ? (
              <button
                onClick={resetForNextTest}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg"
              >
                Start Next Test
              </button>
            ) : (
              <button
                onClick={resetAll}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg"
              >
                New Topic
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default LearnPage