import React from "react"

const Header = () => {
  return (
    <header className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col items-center justify-center text-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Multimodal Learning System
            </h1>
            <p className="text-blue-100 text-lg mt-2">
              Personalized AI-Powered Learning for Students with ASD
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header