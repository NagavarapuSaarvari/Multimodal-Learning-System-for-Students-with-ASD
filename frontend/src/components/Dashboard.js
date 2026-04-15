import React, { useState, useEffect } from "react"
import { BarChart3, TrendingUp, Award, Target, Clock, AlertCircle } from "lucide-react"

function Dashboard({ user }) {
  const [performance, setPerformance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState("scores")

  useEffect(() => {
    // Fetch performance data from backend
    fetchPerformanceData()
  }, [])

  const fetchPerformanceData = async () => {
    try {
      setLoading(true)
      // TODO: Implement backend endpoint to fetch performance metrics
      // const response = await fetch(`/api/performance?userId=${user.id}`)
      // const data = await response.json()
      
      // Mock data for now
      const mockData = {
        totalTests: 2,
        completedTests: 2,
        averageScore: 75,
        trends: [
          { test: 1, score: 65, difficulty: "easy" },
          { test: 2, score: 85, difficulty: "medium" }
        ],
        emotionalData: [
          { test: 1, focused: 40, confused: 15, bored: 10, happy: 35 },
          { test: 2, focused: 55, confused: 10, bored: 5, happy: 30 }
        ],
        topicsPerformance: [
          { topic: "Mathematics", avgScore: 78, testsCompleted: 2 },
          { topic: "Science", avgScore: 72, testsCompleted: 1 }
        ],
        strengths: ["Multiple Choice Questions", "Math Concepts"],
        areasForImprovement: ["Essay Writing", "Complex Analysis"]
      }
      
      setPerformance(mockData)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching performance data:", error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your performance data...</p>
        </div>
      </div>
    )
  }

  const testProgress = (performance.completedTests / 3) * 100

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Dashboard</h1>
          <p className="text-gray-600">Track your learning progress and growth</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Average Score */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium">Average Score</p>
              <BarChart3 className="text-blue-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{performance.averageScore}%</p>
            <p className="text-sm text-gray-500 mt-1">Overall Performance</p>
          </div>

          {/* Tests Completed */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium">Tests Completed</p>
              <Award className="text-teal-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {performance.completedTests}/{3}
            </p>
            <p className="text-sm text-gray-500 mt-1">Out of 3 required tests</p>
          </div>

          {/* Learning Streak */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium">Improvement</p>
              <TrendingUp className="text-green-600" size={24} />
            </div>
            {performance.trends.length >= 2 && (
              <>
                <p className="text-3xl font-bold text-gray-900">
                  +{performance.trends[1].score - performance.trends[0].score}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Since last test</p>
              </>
            )}
          </div>

          {/* Time Spent */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium">Est. Learning Time</p>
              <Clock className="text-purple-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">~4h</p>
            <p className="text-sm text-gray-500 mt-1">Total study time</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Test Progress</h2>
            <span className="text-2xl font-bold text-blue-600">{testProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-teal-500 h-full transition-all duration-500"
              style={{ width: `${testProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-4 text-sm text-gray-600">
            <span>Test 1 ✓</span>
            {performance.completedTests >= 2 && <span>Test 2 ✓</span>}
            {performance.completedTests < 2 && <span>Test 2 (0%)</span>}
            {performance.completedTests >= 3 && <span>Test 3 ✓</span>}
            {performance.completedTests < 3 && <span>Test 3 (0%)</span>}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Test Scores Trend */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Score Progression</h2>
            <div className="flex items-end justify-around h-64 gap-4">
              {performance.trends.map((trend, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1">
                  <div className="relative w-full">
                    <div
                      className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all hover:from-blue-700 hover:to-blue-500 cursor-pointer"
                      style={{ height: `${(trend.score / 100) * 180}px` }}
                    ></div>
                    <div className="absolute top-0 left-0 right-0 flex justify-center -translate-y-8">
                      <span className="text-lg font-bold text-blue-600">{trend.score}%</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mt-4">Test {idx + 1}</p>
                  <p className="text-xs text-gray-500">{trend.difficulty}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Areas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Insights</h2>

            {/* Strengths */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Target size={16} className="text-green-600" />
                Your Strengths
              </p>
              <div className="space-y-2">
                {performance.strengths.map((strength, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-gray-700">{strength}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Areas for Improvement */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-orange-600" />
                Areas to Focus
              </p>
              <div className="space-y-2">
                {performance.areasForImprovement.map((area, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    <span className="text-gray-700">{area}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Topics Performance */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Performance by Topic</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {performance.topicsPerformance.map((topic, idx) => (
              <div
                key={idx}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900">{topic.topic}</h3>
                  <span className="text-2xl font-bold text-blue-600">{topic.avgScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${topic.avgScore}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {topic.testsCompleted} test{topic.testsCompleted !== 1 ? "s" : ""} completed
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation */}
        {performance.completedTests < 3 && (
          <div className="mt-8 bg-blue-50 border-l-4 border-blue-600 p-6 rounded-lg">
            <p className="text-blue-900 font-semibold mb-2">
              Keep Going! 🎉
            </p>
            <p className="text-blue-800">
              You've completed {performance.completedTests} out of 3 tests. Continue with the next test to complete your learning journey and see more detailed insights.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
