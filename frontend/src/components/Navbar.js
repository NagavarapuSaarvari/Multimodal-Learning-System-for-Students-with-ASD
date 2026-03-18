import React from "react"
import { BookOpen, FileText } from "lucide-react"

function Navbar({ currentPage, onPageChange }) {
  return (
    <nav className="bg-white shadow-md border-b-2 border-blue-100">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange("upload")}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
              currentPage === "upload"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <FileText size={20} />
            Upload Documents
          </button>
          
          <button
            onClick={() => onPageChange("learn")}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
              currentPage === "learn"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <BookOpen size={20} />
            Learn & Test
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
