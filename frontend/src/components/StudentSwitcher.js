import React, { useEffect, useState } from "react"
import { Users, ChevronDown } from "lucide-react"

function StudentSwitcher({ students, selectedStudent, onSelectStudent, loading }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Users size={18} className="text-blue-600" />
        <span className="font-medium text-gray-900">
          {selectedStudent?.name || "Select a student"}
        </span>
        <ChevronDown
          size={18}
          className={`text-gray-600 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {loading ? (
            <div className="p-4 text-center text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : students && students.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto">
              {students.map((student) => (
                <li key={student.id}>
                  <button
                    onClick={() => {
                      onSelectStudent(student)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between ${
                      selectedStudent?.id === student.id
                        ? "bg-blue-100 text-blue-900 font-semibold"
                        : "text-gray-700"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-xs text-gray-600">
                        Age: {student.age || "N/A"}
                      </p>
                    </div>
                    {selectedStudent?.id === student.id && (
                      <span className="text-blue-600 font-bold">✓</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-600">
              No students found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default StudentSwitcher
