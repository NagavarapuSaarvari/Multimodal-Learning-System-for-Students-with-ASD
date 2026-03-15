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
    <div className="space-y-6 mt-8">
      {/* Upload Section */}
      <div className="flex justify-center px-4">
        <div className="w-full max-w-xl bg-white shadow-lg border border-blue-200 rounded-xl">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-xl p-4 flex items-center gap-2">
            <UploadCloud size={20} />
            <h2 className="text-xl font-semibold">Upload Learning Material</h2>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Select PDF File
              </label>
              <input
                type="file"
                accept=".pdf"
                className="w-full border border-gray-300 rounded-md p-3 cursor-pointer hover:border-blue-500"
                onChange={handleFileChange}
              />

              {file && (
                <div className="flex items-center gap-2 text-blue-600 text-sm bg-blue-50 p-2 rounded">
                  <FileText size={16} />
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-md transition font-semibold"
            >
              {loading ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="flex justify-center px-4">
        <div className="w-full max-w-xl bg-white shadow-lg border border-blue-200 rounded-xl">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-xl p-4 flex items-center gap-2">
            <FileText size={20} />
            <h2 className="text-xl font-semibold">Uploaded Documents</h2>
          </div>

          <div className="p-6">
            {loadingDocs ? (
              <p className="text-gray-500">Loading documents...</p>
            ) : documents.length === 0 ? (
              <p className="text-gray-500 text-center">No documents uploaded yet</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <FileText size={18} className="text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-800">{doc.filename}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition"
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
  );
}

export default DocumentUpload;