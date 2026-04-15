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

function AdminDashboard({ adminId, onSelectStudent }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentStats, setStudentStats] = useState({})
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
        `${process.env.REACT_APP_API_URL}/students/${adminId}`,
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

      // Fetch stats for each student
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
      // Mock data for now - in real implementation, fetch from backend
      setStudentStats((prev) => ({
        ...prev,
        [studentId]: {
          totalTests: Math.floor(Math.random() * 10),
          averageScore: Math.floor(Math.random() * 50) + 50,
          topicsStudied: Math.floor(Math.random() * 15) + 1,
          lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        },
      }))
    } catch (err) {
      console.error("Error fetching student stats:", err)
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
                    <div className={`text-xs ${
                      selectedStudent?.id === student.id
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}>
                      Age: {calculateAge(student.date_of_birth)}
                    </div>
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
                          <strong>Age:</strong> {calculateAge(selectedStudent.date_of_birth)} years
                        </span>
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
                          {studentStats[selectedStudent.id]?.topicsStudied || 0}
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
                          {studentStats[selectedStudent.id]?.lastActive
                            ? Math.floor(
                                (Date.now() -
                                  new Date(
                                    studentStats[selectedStudent.id].lastActive
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

                {/* Performance Chart Placeholder */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <BarChart3 size={20} className="text-blue-600" />
                      Recent Performance
                    </h4>
                    <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-500">
                        Learning progress will appear here
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Target size={20} className="text-purple-600" />
                      Learning Goals
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            Math Proficiency
                          </span>
                          <span className="text-sm font-bold text-gray-900">65%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full"
                            style={{ width: "65%" }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            Reading Skills
                          </span>
                          <span className="text-sm font-bold text-gray-900">78%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-600 to-teal-600 h-2 rounded-full"
                            style={{ width: "78%" }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            Science Understanding
                          </span>
                          <span className="text-sm font-bold text-gray-900">52%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-orange-600 to-red-600 h-2 rounded-full"
                            style={{ width: "52%" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
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
