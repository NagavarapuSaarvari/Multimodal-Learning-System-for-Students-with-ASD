import React from "react"
import { ExternalLink, FileText, Youtube, CheckCircle } from "lucide-react"

function SourceDocuments({ topic }) {
  // Mock data - will be replaced with actual API data
  const [sources, setSources] = React.useState([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    fetchSources()
  }, [topic])

  const fetchSources = async () => {
    try {
      setLoading(true)
      // Get documents used for this topic
      const token = localStorage.getItem("accessToken")
      const response = await fetch(`${process.env.REACT_APP_API_URL}/documents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSources(data.documents || [])
      }
    } catch (err) {
      console.error("Error fetching sources:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading sources...</div>
  }

  if (sources.length === 0) {
    return null
  }

  return (
    <div className="mt-12 border-t-2 border-gray-200 pt-8">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">
        <CheckCircle className="inline mr-2 text-green-600" size={24} />
        Sources Used for Learning Material
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sources.map((doc) => (
          <a
            key={doc.id}
            href={doc.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-lg hover:border-blue-400 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg flex-shrink-0 ${
                doc.file_type === "youtube"
                  ? "bg-red-100"
                  : "bg-blue-100"
              }`}>
                {doc.file_type === "youtube" ? (
                  <Youtube className={doc.file_type === "youtube" ? "text-red-600" : "text-blue-600"} size={24} />
                ) : (
                  <FileText className="text-blue-600" size={24} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {doc.file_type === "youtube" ? (doc.youtube_title || doc.filename) : doc.filename}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {doc.file_type === "youtube" ? "📺 YouTube Video" : "📄 PDF Document"}
                </p>
                <div className="flex items-center gap-2 mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Open Source
                  <ExternalLink size={14} />
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
        <p>
          <strong>💡 How RAG works:</strong> The learning material above was generated using AI-powered semantic search (Retrieval Augmented Generation) across all your uploaded documents. Both PDFs and YouTube transcripts are analyzed together to provide personalized learning content.
        </p>
      </div>
    </div>
  )
}

export default SourceDocuments
