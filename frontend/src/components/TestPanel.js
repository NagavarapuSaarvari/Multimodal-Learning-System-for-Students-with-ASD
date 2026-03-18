import React, { useState } from "react"
import { createTestWithNumber, submitAnswer, getTestScore } from "../services/api"
import { CheckCircle, XCircle } from "lucide-react"

function TestPanel({ topic, testNumber = 1, onTestComplete, onStartTest }) {

  const [testSessionId, setTestSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [feedback, setFeedback] = useState({})
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)

  const startTest = async () => {
    setLoading(true)
    const data = await createTestWithNumber(topic, "easy", testNumber)

    setTestSessionId(data.sessionId)
    setQuestions(data.questions)
    setStarted(true)

    if (onStartTest) onStartTest(data.sessionId)
    setLoading(false)
  }

  const handleAnswer = async (idx) => {
    const result = await submitAnswer(testSessionId, currentIndex, idx)

    setAnswers({ ...answers, [currentIndex]: idx })
    setFeedback({ ...feedback, [currentIndex]: result })
  }

  const next = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
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
  const isAnswered = currentIndex in answers
  const isCorrect = feedback[currentIndex]?.isCorrect

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <h3 className="mb-4 font-semibold">
        Question {currentIndex + 1}
      </h3>

      <p className="mb-6">{q.question}</p>

      {q.options.map((opt, i) => (
        <button
          key={i}
          onClick={() => handleAnswer(i)}
          disabled={isAnswered}
          className="block w-full border p-3 mb-2 rounded"
        >
          {opt}
        </button>
      ))}

      {isAnswered && (
        <div className="mt-4">
          {isCorrect ? (
            <CheckCircle className="text-green-600" />
          ) : (
            <XCircle className="text-red-600" />
          )}
          <p>{feedback[currentIndex]?.explanation}</p>

          <button
            onClick={next}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default TestPanel