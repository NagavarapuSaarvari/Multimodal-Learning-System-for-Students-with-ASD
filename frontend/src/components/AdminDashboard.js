import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  BarChart3,
  TrendingUp,
  Award,
  Target,
  Clock,
  AlertCircle,
  Loader,
  Upload,
  BookOpen,
} from "lucide-react"
import { getStudentStats } from "../services/api"
import StudentSwitcher from "./StudentSwitcher"

function AdminDashboard({ adminId, onSelectStudent }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentStats, setStudentStats] = useState({})
  const [studentHistories, setStudentHistories] = useState({})
  const [statsLoading, setStatsLoading] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    fetchStudents()
  }, [adminId])

  useEffect(() => {
    if (selectedStudent && onSelectStudent) {
      onSelectStudent(selectedStudent)
    }
  }, [selectedStudent, onSelectStudent])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:8000"}/students/${adminId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch students")
      }

      const data = await response.json()
      setStudents(data.students || [])

      // Fetch stats for each student - now from REAL API
      if (data.students && data.students.length > 0) {
        setSelectedStudent(data.students[0])
        data.students.forEach((student) => {
          fetchStudentStats(student.id)
        })
      }
    } catch (err) {
      setError(err.message)
      console.error("Error fetching students:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentStats = async (studentId) => {
    try {
      setStatsLoading((prev) => ({ ...prev, [studentId]: true }))
      const stats = await getStudentStats(studentId)
      
      if (stats) {
        setStudentStats((prev) => ({
          ...prev,
          [studentId]: {
            totalTests: stats.totalTests || 0,
            averageScore: stats.averageScore || 0,
            topicsCovered: stats.topicsCovered || 0,
            lastActivity: stats.lastActivity ? new Date(stats.lastActivity) : null,
            maxScore: stats.maxScore || 0,
          },
        }))
      }

      // Also fetch dashboard data which includes test history
      const dashboardResponse = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:8000"}/students/${studentId}/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      )

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json()
        console.log(`[Dashboard] Received data for student ${studentId}:`, dashboardData)
        if (dashboardData.history) {
          console.log(`[Dashboard] Setting history with ${dashboardData.history.length} items`)
          setStudentHistories((prev) => ({
            ...prev,
            [studentId]: dashboardData.history,
          }))
        } else {
          console.log(`[Dashboard] No history found in response`)
        }
      } else {
        console.error(`[Dashboard] Failed to fetch dashboard data: ${dashboardResponse.status}`)
      }
    } catch (err) {
      console.error("Error fetching student stats:", err)
      // Set default values on error
      setStudentStats((prev) => ({
        ...prev,
        [studentId]: {
          totalTests: 0,
          averageScore: 0,
          topicsCovered: 0,
          lastActivity: null,
          maxScore: 0,
        },
      }))
    } finally {
      setStatsLoading((prev) => ({ ...prev, [studentId]: false }))
    }
  }

  const calculateAge = (dateOfBirth) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--
    }
    return age
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">
          Monitor and track your students' learning progress
        </p>
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 font-medium mb-2">No students yet</p>
          <p className="text-gray-500 text-sm">
            Add students to view their learning progress and analytics
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Student Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Students</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedStudent?.id === student.id
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                        : "bg-gray-50 text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <div className="font-medium text-sm">{student.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content - Stats */}
          <div className="lg:col-span-3">
            {selectedStudent && (
              <>
                {/* Student Header */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {selectedStudent.name}
                      </h3>
                      <div className="flex gap-6 mt-2 text-sm text-gray-600">
                        <span>
                          <strong>DOB:</strong>{" "}
                          {new Date(selectedStudent.date_of_birth).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {selectedStudent.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => {
                        onSelectStudent(selectedStudent)
                        navigate("/upload")
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <Upload size={18} />
                      Upload Documents
                    </button>
                    <button
                      onClick={() => {
                        onSelectStudent(selectedStudent)
                        navigate("/learn")
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                    >
                      <BookOpen size={18} />
                      Start Learning
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">Tests Completed</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">
                          {studentStats[selectedStudent.id]?.totalTests || 0}
                        </p>
                      </div>
                      <Award className="text-blue-600 text-opacity-10 w-10 h-10" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">Average Score</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">
                          {studentStats[selectedStudent.id]?.averageScore || 0}%
                        </p>
                      </div>
                      <TrendingUp className="text-green-600 text-opacity-10 w-10 h-10" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">Topics Covered</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">
                          {studentStats[selectedStudent.id]?.topicsCovered || 0}
                        </p>
                      </div>
                      <Target className="text-purple-600 text-opacity-10 w-10 h-10" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">Last Active</p>
                        <p className="text-sm font-bold text-gray-900 mt-2">
                          {studentStats[selectedStudent.id]?.lastActivity
                            ? Math.floor(
                                (Date.now() -
                                  new Date(
                                    studentStats[selectedStudent.id].lastActivity
                                  ).getTime()) /
                                  (1000 * 60 * 60 * 24)
                              ) + " days ago"
                            : "No activity"}
                        </p>
                      </div>
                      <Clock className="text-orange-600 text-opacity-10 w-10 h-10" />
                    </div>
                  </div>
                </div>

                {/* Test History */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className="text-xl font-bold text-gray-900 mb-4">Test History</h4>
                  
                  {studentHistories[selectedStudent.id] ? (
                    studentHistories[selectedStudent.id].length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
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
                            {studentHistories[selectedStudent.id].map((test, idx) => (
                              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 text-gray-900 font-medium">{test.topic}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    test.score >= 75 ? 'bg-green-100 text-green-800' :
                                    test.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {test.score}%
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-gray-600">Test {test.testNumber}</td>
                                <td className="py-3 px-4 text-gray-600 capitalize">{test.difficulty}</td>
                                <td className="py-3 px-4 text-gray-500 text-xs">
                                  {new Date(test.date).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-6">No tests taken yet</p>
                    )
                  ) : (
                    <p className="text-gray-500 text-center py-6">Loading test history...</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
