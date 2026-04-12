import React, { useState, useRef, useEffect } from "react"
import { createTestWithNumber, submitAnswer, getTestScore, evaluateTextAnswer } from "../services/api"
import { CheckCircle, XCircle } from "lucide-react"

function TestPanel({ topic, testNumber = 1, onTestComplete, onStartTest }) {

  const [testSessionId, setTestSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [feedback, setFeedback] = useState({})
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [textAnswer, setTextAnswer] = useState("")
  const [evaluating, setEvaluating] = useState(false)
  const textInputRef = useRef(null)

  const startTest = async () => {
    setLoading(true)
    const data = await createTestWithNumber(topic, "easy", testNumber)

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
    } else {
      finish()
    }
  }

  const finish = async () => {
    const res = await getTestScore(testSessionId)
    onTestComplete(res)
  }

  // START SCREEN
  if (!started) {
    return (
      <div className="text-center mt-20">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">
          Ready to Test Your Knowledge?
        </h2>

        <p className="mb-6">
          Topic: <b>{topic}</b>
        </p>

        <button
          onClick={startTest}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg"
        >
          {loading ? "Starting..." : "Start Test"}
        </button>
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
              onChange={(e) => setTextAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer here... (Use Ctrl+Enter or Cmd+Enter to submit)"
              className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              rows="6"
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
              💡 Tip: Press Ctrl+Enter (or Cmd+Enter on Mac) to submit your answer
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

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Score: <span className="text-lg font-bold text-blue-600">{(feedbackData.score * 100).toFixed(0)}%</span>
              </span>
            </div>
            
            <button
              onClick={next}
              className="mt-4 w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {currentIndex < questions.length - 1 ? "Next Question" : "Finish Test"}
            </button>
          </div>
        )}
      </div>
    )
  }

  // MCQ QUESTION
  return (
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
          
          <button
            onClick={next}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {currentIndex < questions.length - 1 ? "Next Question" : "Finish Test"}
          </button>
        </div>
      )}
    </div>
  )
}

export default TestPanel