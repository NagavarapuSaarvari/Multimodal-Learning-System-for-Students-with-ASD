import React, { useState } from "react"
import { BookOpen } from "lucide-react"

function TopicForm({ onSubmit, loading = false }) {

  const [topic, setTopic] = useState("")
  const [difficulty, setDifficulty] = useState("easy")

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!topic.trim()) return

    onSubmit(topic, difficulty)
  }

  return (

    <div className="max-w-3xl mx-auto mt-10 px-4">

      <div className="bg-white border border-blue-200 shadow-lg rounded-xl p-6">

        <h2 className="text-lg font-semibold text-blue-600 mb-6 flex items-center gap-2">
          <BookOpen size={20} />
          Generate Learning Material
        </h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Enter a topic to learn about..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
            />

            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">
              Difficulty Level:
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={loading}
              className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 text-sm"
            >
              <option value="easy">Easy (Basics)</option>
              <option value="medium">Medium (Intermediate)</option>
              <option value="hard">Hard (Advanced)</option>
            </select>
          </div>

        </form>

      </div>

    </div>

  )

}

export default TopicForm