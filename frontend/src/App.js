import React, { useState } from "react"
import Header from "./components/Header"
import Navbar from "./components/Navbar"
import DocumentUpload from "./components/DocumentUpload"
import LearnPage from "./components/LearnPage"
import "./App.css"

function App() {
  const [currentPage, setCurrentPage] = useState("upload")

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navbar currentPage={currentPage} onPageChange={setCurrentPage} />

      <main>
        {currentPage === "upload" && <DocumentUpload />}
        {currentPage === "learn" && <LearnPage />}
      </main>
    </div>
  )
}

export default App