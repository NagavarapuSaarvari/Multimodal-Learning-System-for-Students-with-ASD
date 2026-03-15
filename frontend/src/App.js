import React, { useState } from "react";
import Header from "./components/Header";
import DocumentUpload from "./components/DocumentUpload";
import TopicForm from "./components/TopicForm";
import ResultCard from "./components/ResultCard";
import TestPanel from "./components/TestPanel";
import { generateLearningMaterial } from "./services/api";
import "./App.css";

function App() {

  const [material, setMaterial] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [revisionStarted, setRevisionStarted] = useState(false);
  const [loadingMaterial, setLoadingMaterial] = useState(false);
  const [error, setError] = useState("");

  const handleTopicSubmit = async (topicInput, selectedDifficulty = "easy") => {
    try {
      setError("");
      setLoadingMaterial(true);
      setTopic(topicInput);
      setDifficulty(selectedDifficulty);
      setTestStarted(false);
      setTestCompleted(false);
      setRevisionStarted(false);

      const data = await generateLearningMaterial(topicInput, selectedDifficulty);
      setMaterial(data.material);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate learning material");
    } finally {
      setLoadingMaterial(false);
    }
  };

  const startTest = () => {
    setTestStarted(true);
  };

  const handleTestComplete = (results) => {
    setTestCompleted(true);
    setTestResults(results);
    setTestStarted(false);
  };

  const startRevisionTest = () => {
    setRevisionStarted(true);
    setTestCompleted(false);
    setTestResults(null);
  };

  const handleRevisionComplete = (results) => {
    setTestCompleted(true);
    setTestResults(results);
    setRevisionStarted(false);
  };

  const resetAll = () => {
    setMaterial("");
    setTopic("");
    setDifficulty("easy");
    setTestStarted(false);
    setTestCompleted(false);
    setTestResults(null);
    setRevisionStarted(false);
  };

  return (

    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">

      <Header />

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Document Upload */}
        {!testStarted && !testCompleted && !revisionStarted && (
          <DocumentUpload />
        )}

        {/* Topic Form - Only show if not in test/revision mode */}
        {!testStarted && !testCompleted && !revisionStarted && (
          <TopicForm onSubmit={handleTopicSubmit} loading={loadingMaterial} />
        )}

        {/* Learning Material - Show before test */}
        {material && !testStarted && !testCompleted && !revisionStarted && (
          <>
            <ResultCard material={material} />

            <div className="text-center mt-8 space-y-3">
              <button
                onClick={startTest}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-semibold text-lg shadow-lg"
              >
                📝 Take Test
              </button>
              <p className="text-sm text-gray-600">
                Test yourself on this material to reinforce your learning
              </p>
            </div>
          </>
        )}

        {/* Test Panel */}
        {testStarted && (
          <TestPanel
            topic={topic}
            difficulty={difficulty}
            onTestComplete={handleTestComplete}
          />
        )}

        {/* Test Results - Show after first test */}
        {testCompleted && testResults && !revisionStarted && (
          <div className="space-y-6">
            <div className="bg-white border-2 border-blue-400 shadow-xl rounded-xl p-8">
              <h2 className="text-3xl font-bold text-blue-600 mb-6 text-center">
                Test Results
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 text-center">
                  <p className="text-gray-600 text-sm font-medium">Score</p>
                  <p className="text-4xl font-bold text-blue-600 mt-2">
                    {testResults.score}%
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 text-center">
                  <p className="text-gray-600 text-sm font-medium">Accuracy</p>
                  <p className="text-4xl font-bold text-green-600 mt-2">
                    {(testResults.accuracy * 100).toFixed(0)}%
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 text-center">
                  <p className="text-gray-600 text-sm font-medium">Correct Answers</p>
                  <p className="text-4xl font-bold text-purple-600 mt-2">
                    {testResults.correctAnswers}/{testResults.totalQuestions}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Next Steps:</h3>
                <ul className="text-gray-700 space-y-2 list-disc list-inside">
                  <li>Current Difficulty: <span className="font-semibold capitalize">{testResults.difficulty}</span></li>
                  <li>Recommended Next Difficulty: <span className="font-semibold capitalize">{testResults.nextDifficulty || "medium"}</span></li>
                  {testResults.accuracy > 0.8 && (
                    <li className="text-green-700">✓ Great job! You're ready for a harder test.</li>
                  )}
                  {testResults.accuracy < 0.5 && (
                    <li className="text-orange-700">📚 Review the material and take a revision test to strengthen your understanding.</li>
                  )}
                </ul>
              </div>

              <div className="space-y-3 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleTopicSubmit(topic, testResults.nextDifficulty || "medium")}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
                >
                  📚 Get Deeper Study Material
                </button>
                <button
                  onClick={startRevisionTest}
                  className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  🔄 Revision Test
                </button>
                <button
                  onClick={resetAll}
                  className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-semibold"
                >
                  ↻ Start Over
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Revision Test Panel */}
        {revisionStarted && (
          <TestPanel
            topic={topic}
            difficulty={testResults?.nextDifficulty || difficulty}
            onTestComplete={handleRevisionComplete}
          />
        )}

      </main>

    </div>

  );

}

export default App;