import React from "react"
import { GraduationCap } from "lucide-react"

const Header = () => {

  return (

    <header className="w-full bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg">

      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col items-center text-center text-white">

        <div className="flex items-center gap-3 mb-2">

          <GraduationCap size={34} />

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            AI Learning System
          </h1>

        </div>

        <p className="text-blue-100 text-lg md:text-xl">
          Personalized AI Tutor for Students
        </p>

      </div>

    </header>

  )

}

export default Header