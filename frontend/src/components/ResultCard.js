import React from "react"
import ReactMarkdown from "react-markdown"
import { ExternalLink, Video } from "lucide-react"

function ResultCard({ material }) {

  if (!material) return null

  // Split material and video recommendations
  const parts = material.split("---")
  const mainMaterial = parts[0]
  const videoSection = parts.length > 1 ? parts.slice(1).join("---") : null

  return (

    <div className="max-w-4xl mx-auto mt-10 px-4 space-y-6">

      {/* Main Learning Material */}
      <div className="bg-white shadow-lg border border-blue-200 rounded-xl overflow-hidden">

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 text-lg font-semibold">
          📚 Learning Material
        </div>

        <div className="p-8 prose prose-sm max-w-none overflow-auto max-h-96">
          <ReactMarkdown
            components={{
              h1: ({node, children}) => <h1 className="text-2xl font-bold text-gray-800 mt-4 mb-2">{children}</h1>,
              h2: ({node, children}) => <h2 className="text-xl font-bold text-gray-800 mt-3 mb-2">{children}</h2>,
              h3: ({node, children}) => <h3 className="text-lg font-semibold text-gray-800 mt-2 mb-1">{children}</h3>,
              p: ({node, ...props}) => <p className="text-gray-700 mb-3 leading-relaxed" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-inside text-gray-700 mb-3 space-y-1" {...props} />,
              li: ({node, ...props}) => <li className="ml-2" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-400 bg-blue-50 px-4 py-2 my-3 italic text-gray-700" {...props} />,
              code: ({node, ...props}) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800" {...props} />,
              pre: ({node, ...props}) => <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-auto mb-3" {...props} />,
            }}
          >
            {mainMaterial}
          </ReactMarkdown>
        </div>

      </div>

      {/* Video Resources */}
      {videoSection && (
        <div className="bg-white shadow-lg border border-green-200 rounded-xl overflow-hidden">

          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 text-lg font-semibold flex items-center gap-2">
            <Video size={20} />
            Video Resources
          </div>

          <div className="p-8 space-y-4">
            <ReactMarkdown
              components={{
                h2: ({node, children}) => <h2 className="text-lg font-bold text-gray-800 mt-2 mb-3">{children}</h2>,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-4" {...props} />,
                li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold text-blue-600" {...props} />,
                p: ({node, ...props}) => <p className="text-gray-600 text-sm" {...props} />,
                a: ({node, href, ...props}) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                  >
                    {props.children}
                    <ExternalLink size={14} />
                  </a>
                ),
              }}
            >
              {videoSection}
            </ReactMarkdown>
          </div>

        </div>
      )}

    </div>

  )

}

export default ResultCard