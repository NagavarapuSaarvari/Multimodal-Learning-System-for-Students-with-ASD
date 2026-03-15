import React from "react"

function QuestionCard({ question, onAnswer }) {

  if (!question) return null

  const options = question.options || []

  return (

    <div className="bg-white shadow-lg rounded-xl p-6 border border-blue-200">

      <h3 className="text-xl font-semibold text-gray-800 mb-6 leading-relaxed">
        {question.question}
      </h3>

      <div className="grid gap-3">

        {options.map((option, index) => (

          <button
            key={index}
            onClick={() => onAnswer(option)}
            className="w-full text-left px-4 py-3 border border-blue-300 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-500 transition duration-200 font-medium text-gray-700"
          >
            {option}
          </button>

        ))}

      </div>

    </div>

  )

}

export default QuestionCard