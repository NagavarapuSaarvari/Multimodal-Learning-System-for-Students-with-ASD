import React, { useState, useEffect } from "react";
import { uploadDocument, getDocuments, deleteDocument } from "../services/api";
import { UploadCloud, FileText, Trash2 } from "lucide-react";

function DocumentUpload() {

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
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

  const handleUpload = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError("");
      await uploadDocument(file);
      alert("Document uploaded successfully");
      setFile(null);
      fetchDocuments(); // Refresh list
    } catch (err) {
      console.error(err);
      setError(err.message || "Upload failed");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-2">
            Upload Learning Materials
          </h2>
          <p className="text-gray-600 text-lg">
            Add PDF documents to build your personalized learning database
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="flex flex-col">
            <div className="bg-white shadow-lg border border-blue-200 rounded-xl overflow-hidden flex flex-col h-full">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 flex items-center gap-3">
                <UploadCloud size={24} />
                <div>
                  <h3 className="text-2xl font-bold">Upload Documents</h3>
                  <p className="text-blue-100 text-sm">Add PDF files for AI analysis</p>
                </div>
              </div>

              <div className="p-8 flex-1 flex flex-col">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-6">
                    <p className="font-semibold mb-1">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                )}

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
            </div>
          </div>

          {/* Documents List */}
          <div className="flex flex-col">
            <div className="bg-white shadow-lg border border-green-200 rounded-xl overflow-hidden flex flex-col h-full">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 flex items-center gap-3">
                <FileText size={24} />
                <div>
                  <h3 className="text-2xl font-bold">Uploaded Documents</h3>
                  <p className="text-green-100 text-sm">
                    {loadingDocs ? "Loading..." : `${documents.length} document${documents.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                {loadingDocs ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-gray-500">Loading documents...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-gray-500 text-center">
                      No documents uploaded yet.<br />
                      <span className="text-sm">Start by uploading a PDF file.</span>
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
                          <FileText size={20} className="text-blue-600 flex-shrink-0" />
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
                          title="Delete document"
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
