import React, { useState, useEffect } from "react"
import { Plus, Trash2, AlertCircle, CheckCircle, Loader } from "lucide-react"

function StudentManagement({ adminId, onStudentAdded }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showForm, setShowForm] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    date_of_birth: "",
  })

  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchStudents()
  }, [adminId])

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
    } catch (err) {
      setError(err.message)
      console.error("Error fetching students:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!formData.name.trim()) {
      setError("Student name is required")
      return
    }

    if (!formData.date_of_birth) {
      setError("Date of birth is required")
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/students/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify({
            admin_id: adminId,
            name: formData.name,
            date_of_birth: formData.date_of_birth,
          }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to add student")
      }

      const data = await response.json()

      setSuccess(`Student "${formData.name}" added successfully!`)
      setFormData({ name: "", date_of_birth: "" })
      setShowForm(false)

      if (onStudentAdded) {
        onStudentAdded(data)
      }

      // Refresh student list
      await fetchStudents()
    } catch (err) {
      setError(err.message || "Failed to add student")
      console.error("Error adding student:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm("Are you sure you want to delete this student?")) {
      return
    }

    try {
      setDeleting(studentId)

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/students/${studentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error("Failed to delete student")
      }

      setSuccess("Student deleted successfully!")
      await fetchStudents()
    } catch (err) {
      setError(err.message || "Failed to delete student")
      console.error("Error deleting student:", err)
    } finally {
      setDeleting(null)
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

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Student Management</h2>
          <p className="text-gray-600 mt-1">
            Add and manage students for personalized learning paths
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow font-medium"
        >
          <Plus size={20} />
          Add New Student
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-green-800 font-medium">{success}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Add Student Form */}
      {showForm && (
        <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Add New Student</h3>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-md transition-shadow disabled:opacity-50 font-medium flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Student"
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Students List */}
      {loading && !showForm ? (
        <div className="flex justify-center items-center py-12">
          <Loader className="animate-spin text-blue-600" size={32} />
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="text-gray-400 mb-3">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 12H9m4 0a4 4 0 110-8 4 4 0 010 8zm6 0a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p className="text-gray-600 font-medium mb-2">No students yet</p>
          <p className="text-gray-500 text-sm mb-6">
            Add your first student to get started with personalized learning
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus size={18} />
            Add First Student
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white rounded-lg border border-gray-200 p-6 flex justify-between items-start hover:shadow-md transition-shadow"
            >
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {student.name}
                </h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Date of Birth:</span>{" "}
                    {new Date(student.date_of_birth).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Age:</span>{" "}
                    {calculateAge(student.date_of_birth)} years
                  </div>
                  <div>
                    <span className="font-medium">Added:</span>{" "}
                    {new Date(student.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteStudent(student.id)}
                disabled={deleting === student.id}
                className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete student"
              >
                {deleting === student.id ? (
                  <Loader size={20} className="animate-spin" />
                ) : (
                  <Trash2 size={20} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default StudentManagement
