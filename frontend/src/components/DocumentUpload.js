import React, { useState, useEffect } from "react";
import { uploadDocument, uploadYouTube, getDocuments, deleteDocument } from "../services/api";
import { UploadCloud, FileText, Trash2, Youtube, Link as LinkIcon, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";import toast from "react-hot-toast";
function DocumentUpload() {

  const [file, setFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [activeTab, setActiveTab] = useState("pdf"); // "pdf" or "youtube"
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if student is selected
    const student = JSON.parse(localStorage.getItem("selectedStudent") || "null");
    if (!student) {
      setError("Please select a student from the dashboard first");
      return;
    }
    setSelectedStudent(student);
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const data = await getDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load documents");
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError("");
    
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
        setError("Only PDF files are allowed");
        setFile(null);
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
        setError("File size must be less than 50MB");
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const validateYoutubeUrl = (url) => {
    const youtubeRegex = /(youtube|youtu|youtube-nocookie)\.(com|be)/i;
    return youtubeRegex.test(url);
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!selectedStudent) {
      setError("Please select a student first");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await uploadDocument(file);
      toast.success("Document uploaded successfully");
      setFile(null);
      fetchDocuments(); // Refresh list
    } catch (err) {
      console.error(err);
      const errorMsg = err.message || "Upload failed";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleYoutubeUpload = async () => {
    if (!youtubeUrl.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }
    if (!selectedStudent) {
      setError("Please select a student first");
      return;
    }

    if (!validateYoutubeUrl(youtubeUrl)) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await uploadYouTube(youtubeUrl);
      toast.success("YouTube video added successfully");
      setYoutubeUrl("");
      fetchDocuments(); // Refresh list
    } catch (err) {
      console.error(err);
      const errorMsg = err.message || "YouTube upload failed";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        await deleteDocument(docId);
        fetchDocuments();
      } catch (err) {
        console.error(err);
        setError("Failed to delete document");
      }
    }
  };

  const getDocumentIcon = (doc) => {
    if (doc.filename.includes("YouTube")) {
      return <Youtube size={20} className="text-red-600" />;
    }
    return <FileText size={20} className="text-blue-600" />;
  };

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* No Student Selected Warning */}
        {!selectedStudent && (
          <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-4">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">No Student Selected</h3>
              <p className="text-yellow-800 text-sm mb-3">
                You need to select a student from the dashboard before uploading documents.
              </p>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium text-sm"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Upload Learning Materials
          </h1>
          <p className="text-gray-600 text-lg">
            Add PDFs and YouTube videos to build your personalized learning database. <br/>
            YouTube transcripts and PDF content are used together with AI to create your learning materials.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Upload Section */}
          <div className="flex flex-col">
            <div className="bg-white border border-gray-300 rounded-2xl overflow-hidden flex flex-col h-full shadow-lg">
              <div className="bg-blue-600 text-white p-8 flex items-center gap-3">
                <UploadCloud size={28} />
                <div>
                  <h3 className="text-2xl font-bold">Upload Documents</h3>
                  <p className="text-blue-100 text-sm">PDFs & YouTube Videos</p>
                </div>
              </div>

              {/* Tab Selection */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => {
                    setActiveTab("pdf");
                    setError("");
                  }}
                  className={`flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 transition ${
                    activeTab === "pdf"
                      ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <FileText size={18} />
                  PDF File
                </button>
                <button
                  onClick={() => {
                    setActiveTab("youtube");
                    setError("");
                  }}
                  className={`flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 transition ${
                    activeTab === "youtube"
                      ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <Youtube size={18} />
                  YouTube
                </button>
              </div>

              <div className="p-8 flex-1 flex flex-col">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-6">
                    <p className="font-semibold mb-1">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {activeTab === "pdf" ? (
                  <div className="space-y-6 flex-1">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Select PDF File
                      </label>
                      <input
                        type="file"
                        accept=".pdf"
                        className="w-full border-2 border-dashed border-blue-300 rounded-lg p-8 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition file:hidden bg-blue-50 text-center"
                        onChange={handleFileChange}
                      />
                      <p className="text-sm text-gray-500 mt-2 text-center">Click to browse or drag & drop</p>
                    </div>

                    {file && (
                      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <FileText size={20} className="text-blue-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 text-sm">{file.name}</p>
                          <p className="text-xs text-gray-600">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded-lg">
                      <p className="font-semibold mb-2">Supported formats:</p>
                      <ul className="space-y-1">
                        <li>• PDF files up to 50MB</li>
                      </ul>
                    </div>

                    <button
                      onClick={handleUpload}
                      disabled={!file || loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 text-white py-3 rounded-lg transition font-semibold text-lg shadow-lg hover:shadow-xl"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⏳</span>
                          Uploading...
                        </span>
                      ) : (
                        "Upload Document"
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 flex-1">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        YouTube URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => {
                          setYoutubeUrl(e.target.value);
                          setError("");
                        }}
                        className="w-full border-2 border-blue-300 rounded-lg p-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                      <p className="text-sm text-gray-500 mt-2">Paste a YouTube video link</p>
                    </div>

                    {youtubeUrl && (
                      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <Youtube size={20} className="text-red-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{youtubeUrl}</p>
                          <p className="text-xs text-gray-600">Ready for processing</p>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded-lg">
                      <p className="font-semibold mb-2">Supported formats:</p>
                      <ul className="space-y-1">
                        <li>• YouTube video URLs (with captions/transcripts)</li>
                        <li>• Short links (youtu.be) or full links</li>
                      </ul>
                    </div>

                    <button
                      onClick={handleYoutubeUpload}
                      disabled={!youtubeUrl.trim() || loading}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-400 text-white py-3 rounded-lg transition font-semibold text-lg shadow-lg hover:shadow-xl"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⏳</span>
                          Processing...
                        </span>
                      ) : (
                        "Add YouTube Video"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="flex flex-col">
            <div className="bg-white border border-gray-300 rounded-2xl overflow-hidden flex flex-col h-full shadow-lg">
              <div className="bg-green-600 text-white p-8 flex items-center gap-3">
                <LinkIcon size={28} />
                <div>
                  <h3 className="text-2xl font-bold">Your Materials</h3>
                  <p className="text-green-100 text-sm">
                    {loadingDocs ? "Loading..." : `${documents.length} item${documents.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                {loadingDocs ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-gray-500">Loading materials...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-gray-500 text-center">
                      No materials uploaded yet.<br />
                      <span className="text-sm">Start by uploading a PDF or YouTube video.</span>
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getDocumentIcon(doc)}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">
                              {doc.filename}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                          title="Delete material"
                        >
                          <Trash2 size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


export default DocumentUpload
