import React, { useState, useEffect } from "react"
import { BarChart3, TrendingUp, Award, Target, Calendar, AlertCircle } from "lucide-react"
import { fetchStudentDashboard } from "../services/api"

function Dashboard({ user }) {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const selectedStudent = JSON.parse(localStorage.getItem("selectedStudent") || "null")
      
      if (!selectedStudent || !selectedStudent.id) {
        setLoading(false)
        return
      }
      
      const data = await fetchStudentDashboard(selectedStudent.id)
      setDashboardData(data)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">No Data Yet</h1>
          <p className="text-gray-600">Start taking tests to see your dashboard metrics.</p>
        </div>
      </div>
    )
  }

  const metrics = dashboardData.metrics || {}
  const history = dashboardData.history || []

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning Dashboard</h1>
          <p className="text-gray-600">Track your progress and performance metrics</p>
        </div>

        {/* 5 Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {/* Metric 1: Total Tests */}
          <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium text-sm">Total Tests</p>
              <Award className="text-blue-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.totalTests || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Tests Completed</p>
          </div>

          {/* Metric 2: Average Score */}
          <div className="bg-white rounded-lg shadow p-6 border-t-4 border-green-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium text-sm">Avg Score</p>
              <BarChart3 className="text-green-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.averageScore || 0}%</p>
            <p className="text-xs text-gray-500 mt-1">Overall Average</p>
          </div>

          {/* Metric 3: Topics Covered */}
          <div className="bg-white rounded-lg shadow p-6 border-t-4 border-purple-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium text-sm">Topics</p>
              <Target className="text-purple-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.topicsCovered || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Unique Topics</p>
          </div>

          {/* Metric 4: Highest Score */}
          <div className="bg-white rounded-lg shadow p-6 border-t-4 border-yellow-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium text-sm">Best Score</p>
              <TrendingUp className="text-yellow-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.highestScore || 0}%</p>
            <p className="text-xs text-gray-500 mt-1">Peak Performance</p>
          </div>

          {/* Metric 5: Learning Days */}
          <div className="bg-white rounded-lg shadow p-6 border-t-4 border-pink-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium text-sm">Learning Days</p>
              <Calendar className="text-pink-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.learningDays || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Days Active</p>
          </div>
        </div>

        {/* Test History */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Past Test History</h2>
          
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No test history yet. Start taking tests to see your history here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Topic</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Score</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Test #</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Difficulty</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((test, idx) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-900">{test.topic}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            test.score >= 70
                              ? "bg-green-100 text-green-800"
                              : test.score >= 50
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {test.score}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">Test {test.testNumber}</td>
                      <td className="py-3 px-4 text-gray-700 capitalize">{test.difficulty}</td>
                      <td className="py-3 px-4 text-gray-500 text-sm">
                        {test.date ? new Date(test.date).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recommendation */}
        {metrics.totalTests === 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-lg">
            <p className="text-blue-900 font-semibold mb-2">Getting Started 🎓</p>
            <p className="text-blue-800">
              Start your learning journey by selecting a topic and taking your first test to see your metrics and progress here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
