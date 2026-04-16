import React from "react"
import { AlertCircle, CheckCircle, ArrowRight } from "lucide-react"

function TestReview({ results, onContinue }) {
  const correctCount = results?.correct || 0
  const totalCount = results?.total || 0
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
  const mistakes = results?.mistakes || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full mb-4">
            Test 1 Review
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Your Score: {accuracy}%
          </h1>
          <p className="text-gray-600 text-lg">
            You got {correctCount} out of {totalCount} questions correct
          </p>
        </div>

        {/* Performance Card */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 text-center">
              <p className="text-4xl font-bold text-green-600 mb-2">{correctCount}</p>
              <p className="text-green-700 font-semibold">Correct Answers</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 text-center">
              <p className="text-4xl font-bold text-red-600 mb-2">{totalCount - correctCount}</p>
              <p className="text-red-700 font-semibold">Mistakes</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 text-center">
              <p className="text-4xl font-bold text-blue-600 mb-2">{accuracy}%</p>
              <p className="text-blue-700 font-semibold">Accuracy</p>
            </div>
          </div>
        </div>

        {/* Mistakes Review */}
        {mistakes.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <AlertCircle className="text-red-600" size={24} />
              Questions You Missed
            </h2>

            <div className="space-y-6">
              {mistakes.map((mistake, idx) => (
                <div key={idx} className="border-l-4 border-red-600 bg-red-50 p-6 rounded-r-lg">
                  <div className="mb-4">
                    <p className="font-semibold text-gray-900 mb-2">
                      Question {mistake.questionNumber}: {mistake.question}
                    </p>
                    {mistake.options && (
                      <div className="ml-4 space-y-2">
                        {mistake.options.map((option, optIdx) => (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-lg ${
                              optIdx === mistake.userAnswerIndex
                                ? "bg-red-200 border-2 border-red-600 font-semibold"
                                : optIdx === mistake.correctAnswerIndex
                                ? "bg-green-200 border-2 border-green-600 font-semibold"
                                : "bg-gray-100"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {optIdx === mistake.userAnswerIndex && (
                                <span className="text-red-600 font-bold">✗ Your answer:</span>
                              )}
                              {optIdx === mistake.correctAnswerIndex && (
                                <span className="text-green-600 font-bold">✓ Correct answer:</span>
                              )}
                              {optIdx !== mistake.userAnswerIndex && optIdx !== mistake.correctAnswerIndex && (
                                <span className="text-gray-600">○</span>
                              )}
                              <span>{option}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {mistake.explanation && (
                    <div className="mt-4 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Why this matters:</p>
                      <p className="text-blue-700">{mistake.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Message */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-md p-8 mb-8">
          <h3 className="text-xl font-bold mb-3">Before Test 2</h3>
          <p className="text-lg mb-4">
            {accuracy >= 80
              ? "Excellent work! You've mastered this material. Test 2 will be slightly more challenging."
              : accuracy >= 60
              ? "Good effort! Review the mistakes above and you'll be ready for Test 2."
              : "Keep trying! Review the explanations above carefully, then test your understanding again in Test 2."}
          </p>
          <p className="text-white/90">
            The next test may adjust in difficulty based on your performance and understanding level.
          </p>
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={onContinue}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-12 py-4 rounded-lg hover:from-green-700 hover:to-emerald-700 font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
          >
            Start Test 2 <ArrowRight size={20} />
          </button>
          <p className="text-gray-600 mt-4">Click above to continue to your second test</p>
        </div>
      </div>
    </div>
  )
}

export default TestReview
