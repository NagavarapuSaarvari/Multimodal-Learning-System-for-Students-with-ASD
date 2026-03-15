import React, { useState } from "react"
import { createTest, submitAnswer, getTestScore } from "../services/api"
import { CheckCircle, XCircle } from "lucide-react"

function TestPanel({ topic, difficulty = "easy", onTestComplete }) {

  const [testSessionId, setTestSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [feedback, setFeedback] = useState({})
  const [loading, setLoading] = useState(false)
  const [testStarted, setTestStarted] = useState(false)
  const [testCompleted, setTestCompleted] = useState(false)
  const [scoreData, setScoreData] = useState(null)
  const [error, setError] = useState("")

  const startTest = async () => {
    try {
      setLoading(true)
      setError("")
      
      console.log(`[TestPanel] Starting test - Topic: "${topic}", Difficulty: "${difficulty}"`)
      console.log(`[TestPanel] Calling createTest API...`)
      
      const data = await createTest(topic, difficulty)
      
      console.log(`[TestPanel] Test created successfully!`)
      console.log(`[TestPanel] Session ID:`, data.sessionId)
      console.log(`[TestPanel] Number of questions:`, data.questions.length)
      console.log(`[TestPanel] Questions:`, data.questions)
      
      setTestSessionId(data.sessionId)
      setQuestions(data.questions)
      setTestStarted(true)
      setCurrentIndex(0)
      setAnswers({})
      setFeedback({})
      
      console.log(`[TestPanel] Test UI initialized successfully`)
    } catch (err) {
      const errorMsg = err.message || "Failed to start test"
      console.error(`[TestPanel] ERROR starting test:`, err)
      console.error(`[TestPanel] Error message:`, errorMsg)
      console.error(`[TestPanel] Error stack:`, err.stack)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = async (selectedIndex) => {
    try {
      setLoading(true)
      
      // Use question index (0-based) as question identifier
      const questionIndex = currentIndex + 1  // Database questions are 1-indexed
      console.log(`[TestPanel] Submitting answer - Session: ${testSessionId}, Question Index: ${questionIndex}, Answer: ${selectedIndex}`)
      
      // Submit answer and get feedback
      const result = await submitAnswer(testSessionId, questionIndex, selectedIndex)
      console.log(`[TestPanel] Answer submitted - Is Correct: ${result.isCorrect}`)
      
      // Store the answer
      setAnswers(prev => ({
        ...prev,
        [currentIndex]: selectedIndex
      }))
      
      // Store feedback
      setFeedback(prev => ({
        ...prev,
        [currentIndex]: result
      }))
    } catch (err) {
      console.error("Failed to submit answer:", err)
      setError("Failed to submit answer")
    } finally {
      setLoading(false)
    }
  }

  const goToNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      finishTest()
    }
  }

  const finishTest = async () => {
    try {
      setLoading(true)
      const results = await getTestScore(testSessionId)
      setScoreData(results)
      setTestCompleted(true)
      
      if (onTestComplete) {
        onTestComplete(results)
      }
    } catch (err) {
      console.error("Failed to get score:", err)
      setError("Failed to get score")
    } finally {
      setLoading(false)
    }
  }

  const resetTest = () => {
    setTestStarted(false)
    setTestCompleted(false)
    setTestSessionId(null)
    setQuestions([])
    setCurrentIndex(0)
    setAnswers({})
    setFeedback({})
    setScoreData(null)
    setError("")
  }

  // Show start screen
  if (!testStarted) {
    return (
      <div className="max-w-2xl mx-auto mt-10 px-4">
        <div className="bg-white border border-blue-200 shadow-lg rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">
            Ready to Test Your Knowledge?
          </h2>
          <p className="text-gray-600 mb-2">
            Topic: <span className="font-semibold">{topic}</span>
          </p>
          <p className="text-gray-600 mb-6">
            Difficulty: <span className="font-semibold capitalize">{difficulty}</span>
          </p>
          <p className="text-gray-600 mb-6">
            This test has 10 questions. You'll get instant feedback on your answers.
          </p>
          <button
            onClick={startTest}
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400"
          >
            {loading ? "Starting..." : "Start Test"}
          </button>
        </div>
      </div>
    )
  }

  // Show completion screen
  if (testCompleted && scoreData) {
    const percentage = Math.round((scoreData.correctAnswers / scoreData.totalQuestions) * 100)
    const nextDifficultyLabel = scoreData.nextDifficulty || difficulty
    
    return (
      <div className="max-w-2xl mx-auto mt-10 px-4">
        <div className="bg-white border border-blue-200 shadow-lg rounded-xl p-8 text-center space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-blue-600 mb-2">
              Test Completed!
            </h2>
            <p className="text-lg text-gray-700">
              Great job! Here's how you did:
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
            <div className="text-5xl font-bold text-blue-600 mb-2">
              {percentage}%
            </div>
            <p className="text-lg text-gray-700">
              {scoreData.correctAnswers} out of {scoreData.totalQuestions} correct
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-gray-800 mb-3">Summary:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• <span className="font-medium">Accuracy:</span> {(scoreData.accuracy * 100).toFixed(1)}%</li>
              <li>• <span className="font-medium">Current Difficulty:</span> <span className="capitalize">{scoreData.difficulty}</span></li>
              <li>• <span className="font-medium">Recommended Next Difficulty:</span> <span className="capitalize">{nextDifficultyLabel}</span></li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={resetTest}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Take Another Test
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show test question
  if (questions.length === 0) {
    return <div className="text-center text-gray-600">Loading...</div>
  }

  const currentQuestion = questions[currentIndex]
  const currentFeedback = feedback[currentIndex]
  const currentAnswer = answers[currentIndex]
  const isAnswered = currentIndex in answers
  const isCorrect = isAnswered && currentFeedback?.isCorrect

  const progress = Math.round((currentIndex / questions.length) * 100)

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4 space-y-6 pb-10">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Question Card */}
      <div className="bg-white border border-blue-200 shadow-lg rounded-xl p-8 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-6">
            {currentQuestion.question}
          </h3>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              let buttonClass = "w-full text-left p-4 border-2 rounded-lg transition font-medium"
              let borderClass = "border-gray-300"
              let bgClass = "bg-white hover:bg-gray-50"
              let textClass = "text-gray-800"

              if (isAnswered) {
                if (idx === currentFeedback.correctAnswer) {
                  borderClass = "border-green-500"
                  bgClass = "bg-green-50"
                  textClass = "text-green-800"
                } else if (idx === currentAnswer && !isCorrect) {
                  borderClass = "border-red-500"
                  bgClass = "bg-red-50"
                  textClass = "text-red-800"
                } else {
                  borderClass = "border-gray-300 opacity-50"
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => !isAnswered && handleAnswer(idx)}
                  disabled={isAnswered || loading}
                  className={`${buttonClass} ${borderClass} ${bgClass} ${textClass} disabled:cursor-default flex items-center gap-3`}
                >
                  <span className="flex-1">{option}</span>
                  {isAnswered && idx === currentFeedback.correctAnswer && (
                    <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                  )}
                  {isAnswered && idx === currentAnswer && !isCorrect && (
                    <XCircle size={20} className="text-red-600 flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Feedback */}
        {isAnswered && (
          <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-100 border border-green-300' : 'bg-orange-100 border border-orange-300'}`}>
            <div className="flex items-start gap-2 mb-2">
              {isCorrect ? (
                <>
                  <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <h4 className="font-semibold text-green-800">Correct!</h4>
                </>
              ) : (
                <>
                  <XCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                  <h4 className="font-semibold text-orange-800">Not quite right</h4>
                </>
              )}
            </div>
            <p className={`text-sm ${isCorrect ? 'text-green-700' : 'text-orange-700'}`}>
              {currentFeedback.explanation}
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        {isAnswered && (
          <button
            onClick={goToNextQuestion}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400"
          >
            {currentIndex === questions.length - 1 ? "Finish Test" : "Next Question"}
          </button>
        )}
      </div>
    </div>
  )
}

export default TestPanel