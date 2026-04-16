import React, { useState, useRef, useEffect } from "react"
import { createTestWithNumber, submitAnswer, getTestScore, evaluateTextAnswer } from "../services/api"
import { CheckCircle, XCircle, ArrowLeft, ArrowRight } from "lucide-react"
import EmotionCapture from "./EmotionCapture"

function TestPanel({ topic, testNumber = 1, studentId, onTestComplete, onStartTest, learningMaterial = null }) {

  const [testSessionId, setTestSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [feedback, setFeedback] = useState({})
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [testFinished, setTestFinished] = useState(false)
  const [testResults, setTestResults] = useState(null)
  const [textAnswer, setTextAnswer] = useState("")
  const [evaluating, setEvaluating] = useState(false)
  const textInputRef = useRef(null)

  // Start test automatically on mount
  useEffect(() => {
    const startTestAutomatically = async () => {
      try {
        setLoading(true)
        // Test 1 = easy, Test 2+ = medium
        const difficulty = testNumber === 1 ? "easy" : "medium"
        const data = await createTestWithNumber(topic, difficulty, testNumber, studentId, learningMaterial)
        setTestSessionId(data.sessionId)
        setQuestions(data.questions)
        setStarted(true)
        setCurrentIndex(0)
        if (onStartTest) onStartTest(data.sessionId)
      } catch (error) {
        console.error("Error starting test:", error)
      } finally {
        setLoading(false)
      }
    }
    startTestAutomatically()
  }, [])

  const startTest = async () => {
    setLoading(true)
    const data = await createTestWithNumber(topic, "easy", testNumber, studentId)

    setTestSessionId(data.sessionId)
    setQuestions(data.questions)
    setStarted(true)

    if (onStartTest) onStartTest(data.sessionId)
    setLoading(false)
  }

  const handleMCQAnswer = async (idx) => {
    const result = await submitAnswer(testSessionId, currentIndex, idx)

    setAnswers({ ...answers, [currentIndex]: idx })
    setFeedback({ ...feedback, [currentIndex]: result })
  }

  const handleTextAnswerSubmit = async () => {
    if (!textAnswer.trim()) {
      alert("Please enter an answer")
      return
    }

    setEvaluating(true)
    try {
      const q = questions[currentIndex]
      const evaluation = await evaluateTextAnswer(
        testSessionId,
        currentIndex,
        topic,
        q.question,
        textAnswer
      )

      setAnswers({ ...answers, [currentIndex]: textAnswer })
      setFeedback({ ...feedback, [currentIndex]: {
        isCorrect: evaluation.isCorrect,
        feedback: evaluation.feedback,
        score: evaluation.score
      }})
    } catch (error) {
      alert("Failed to evaluate answer: " + error.message)
    } finally {
      setEvaluating(false)
    }
  }

  const handleKeyDown = (e) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      if (!evaluating && textAnswer.trim()) {
        handleTextAnswerSubmit()
      }
    }
  }

  const isAnswered = currentIndex in answers

  // Auto-focus text input when rendering text question
  useEffect(() => {
    const q = questions[currentIndex]
    if (q && (q.question_type === 'text') && textInputRef.current && !isAnswered) {
      textInputRef.current.focus()
    }
  }, [currentIndex, questions, isAnswered])

  const next = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setTextAnswer("")
    }
  }

  const previous = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setTextAnswer("")
    }
  }

  const finish = async () => {
    const res = await getTestScore(testSessionId)
    // Round average score to 2 decimal places
    if (res.averageScore) {
      res.averageScore = Math.round(res.averageScore * 100) / 100
    }
    setTestResults(res)
    setTestFinished(true)
  }

  const handleBackButton = () => {
    onTestComplete(testResults, 'back')
  }

  const handleContinueButton = () => {
    onTestComplete(testResults, 'continue')
  }

  // Show loading while test is starting
  if (loading || !started || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading test...</p>
        </div>
      </div>
    )
  }

  // TEST FINISHED - SHOW RESULTS AND REVIEW
  if (testFinished && testResults) {
    const correctCount = testResults?.correct || 0
    const totalCount = testResults?.total || 0
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Score Display */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
            <div className="text-center mb-6">
              <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full mb-4">
                Test {testNumber} Complete
              </div>
              <h1 className="text-5xl font-bold text-gray-900 mb-2">
                {accuracy}%
              </h1>
              <p className="text-xl text-gray-600">
                You got {correctCount} out of {totalCount} questions correct
              </p>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600 mb-1">{correctCount}</p>
                <p className="text-sm text-green-700 font-semibold">Correct</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-600 mb-1">{totalCount - correctCount}</p>
                <p className="text-sm text-red-700 font-semibold">Incorrect</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 mb-1">{accuracy}%</p>
                <p className="text-sm text-blue-700 font-semibold">Accuracy</p>
              </div>
            </div>
          </div>

          {/* Answer Review */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Answer Review</h2>
            <div className="space-y-6">
              {questions.map((question, qIndex) => {
                const isAnsweredQuestion = qIndex in answers
                const feedbackObj = feedback[qIndex]
                const isCorrect = feedbackObj?.isCorrect
                const questionType = question.question_type || (question.options ? 'mcq' : 'text')
                const isTextQuestion = questionType === 'text' || !question.options
                const userAnswerIndex = answers[qIndex]

                return (
                  <div key={qIndex} className="border-l-4 border-blue-300 bg-blue-50 p-6 rounded-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-800 mb-2">
                          Question {qIndex + 1}: {question.question}
                        </h3>
                      </div>
                      <div className="ml-4">
                        {isCorrect ? (
                          <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                            <CheckCircle size={16} />
                            Correct
                          </div>
                        ) : isAnsweredQuestion && !isCorrect ? (
                          <div className="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                            <XCircle size={16} />
                            Wrong
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold">
                            Not Answered
                          </div>
                        )}
                      </div>
                    </div>

                    {isTextQuestion ? (
                      <div>
                        <p className="text-gray-700 mb-2"><span className="font-semibold">Your Answer:</span> {isAnsweredQuestion ? answers[qIndex] : "Not answered"}</p>
                        {feedbackObj && <p className="text-gray-700"><span className="font-semibold">Feedback:</span> {feedbackObj.feedback}</p>}
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-700 mb-3">
                          <span className="font-semibold">Your Answer:</span> {isAnsweredQuestion ? `${String.fromCharCode(65 + userAnswerIndex)}. ${question.options[userAnswerIndex]}` : "Not answered"}
                        </p>
                        {!isCorrect && isAnsweredQuestion && feedbackObj?.correctAnswer !== undefined && (
                          <div className="bg-green-100 border-l-4 border-green-500 p-4 rounded mt-3">
                            <p className="text-green-800">
                              <span className="font-semibold">Correct Answer:</span> {String.fromCharCode(65 + feedbackObj.correctAnswer)}. {question.options[feedbackObj.correctAnswer]}
                            </p>
                          </div>
                        )}
                        {feedbackObj?.explanation && (
                          <p className="text-gray-700 mt-3"><span className="font-semibold">Explanation:</span> {feedbackObj.explanation}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleBackButton}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
            <button
              onClick={handleContinueButton}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              Continue
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[currentIndex]
  // Detect question type: if it's missing question_type but has no options, treat as text
  const questionType = q.question_type || (q.options ? 'mcq' : 'text')
  const isTextQuestion = questionType === 'text' || !q.options
  const feedbackData = feedback[currentIndex]

  // TEXT QUESTION
  if (isTextQuestion) {
    return (
      <div>
        <EmotionCapture sessionId={testSessionId} isTestActive={started} />
        <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
        <div className="mb-4">
          <h3 className="mb-4 font-semibold text-lg">
            Question {currentIndex + 1} of {questions.length}
          </h3>
          <p className="text-gray-700 mb-6">{q.question}</p>
        </div>

        {!isAnswered ? (
          <div>
            <div className="mb-2 flex justify-between items-center">
              <label className="text-sm font-medium text-gray-600">
                Your Answer
              </label>
              <span className="text-sm text-gray-500">
                {textAnswer.length} characters
              </span>
            </div>

            <textarea
              ref={textInputRef}
              value={textAnswer}
              onChange={(e) => {
                // Limit to one short line: 150 characters
                const text = e.target.value.slice(0, 150);
                setTextAnswer(text);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a short answer (max 150 characters)..."
              className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              rows="2"
              disabled={evaluating}
              autoFocus
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleTextAnswerSubmit}
                disabled={evaluating || !textAnswer.trim()}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold transition-colors"
              >
                {evaluating ? "Evaluating..." : "Submit Answer"}
              </button>

              <button
                onClick={() => setTextAnswer("")}
                disabled={evaluating || !textAnswer.trim()}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-semibold transition-colors"
              >
                Clear
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              {textAnswer.length}/150 characters | Press Ctrl+Enter to submit
            </p>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-lg bg-gray-50 border-2 border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              {feedbackData.isCorrect ? (
                <CheckCircle className="text-green-600" size={24} />
              ) : (
                <XCircle className="text-red-600" size={24} />
              )}
              <span className="font-semibold text-lg">
                {feedbackData.isCorrect ? "Correct!" : "Needs Improvement"}
              </span>
            </div>

            <div className="mb-4 p-3 bg-white rounded border-l-4 border-blue-500">
              <p className="text-gray-700 text-sm font-medium mb-1">Your Answer:</p>
              <p className="text-gray-600">{answers[currentIndex]}</p>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 font-medium mb-1">Feedback:</p>
              <p className="text-gray-600">{feedbackData.feedback}</p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700">
                Score: <span className="text-lg font-bold text-blue-600">{(feedbackData.score * 100).toFixed(0)}%</span>
              </span>
            </div>
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={currentIndex < questions.length - 1 ? next : finish}
                className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                {currentIndex < questions.length - 1 ? (
                  <>
                    Next
                    <ArrowRight size={20} />
                  </>
                ) : (
                  "Submit Test"
                )}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    )
  }

  // MCQ QUESTION
  return (
    <div>
      <EmotionCapture sessionId={testSessionId} isTestActive={started} />
      <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h3 className="mb-4 font-semibold text-lg">
          Question {currentIndex + 1} of {questions.length}
        </h3>
        <p className="text-gray-700 font-medium">{q.question}</p>
      </div>

      <div className="space-y-3 mb-6">
        {q.options && q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleMCQAnswer(i)}
            disabled={isAnswered}
            className="w-full text-left p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            <span className="inline-block mr-3 font-bold text-blue-600">
              {String.fromCharCode(65 + i)}.
            </span>
            {opt}
          </button>
        ))}
      </div>

      {isAnswered && (
        <div className="p-4 rounded-lg bg-gray-50 border-2 border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            {feedbackData?.isCorrect ? (
              <CheckCircle className="text-green-600" size={24} />
            ) : (
              <XCircle className="text-red-600" size={24} />
            )}
            <span className="font-semibold text-lg">
              {feedbackData?.isCorrect ? "Correct!" : "Incorrect"}
            </span>
          </div>
          
          <p className="text-gray-700 mb-4">{feedbackData?.explanation || ""}</p>
          
          <div className="flex gap-3 mt-4">
            <button
              onClick={previous}
              disabled={currentIndex === 0}
              className="flex-1 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={20} />
              Previous
            </button>
            <button
              onClick={currentIndex < questions.length - 1 ? next : finish}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {currentIndex < questions.length - 1 ? (
                <>
                  Next
                  <ArrowRight size={20} />
                </>
              ) : (
                "Submit Test"
              )}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default TestPanel