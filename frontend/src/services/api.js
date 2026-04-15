const API_BASE = "http://localhost:8000";

// Document Management
export const uploadDocument = async (file) => {
  const adminId = localStorage.getItem("adminId");
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch(`${API_BASE}/upload?admin_id=${adminId}`, {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Upload failed");
  }
  
  return await response.json();
};

export const getDocuments = async () => {
  const adminId = localStorage.getItem("adminId");
  const response = await fetch(`${API_BASE}/documents?admin_id=${adminId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    },
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch documents");
  }
  
  return await response.json();
};

export const deleteDocument = async (docId) => {
  const response = await fetch(`${API_BASE}/documents/${docId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    },
  });
  
  if (!response.ok) {
    throw new Error("Failed to delete document");
  }
  
  return await response.json();
};

export const uploadYouTube = async (youtubeUrl) => {
  const adminId = localStorage.getItem("adminId");
  const response = await fetch(
    `${API_BASE}/upload-youtube?youtube_url=${encodeURIComponent(youtubeUrl)}&admin_id=${adminId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "YouTube upload failed");
  }
  
  return await response.json();
};

// Learning Material
export const generateLearningMaterial = async (topic, difficulty = "easy") => {
  const selectedStudent = JSON.parse(localStorage.getItem("selectedStudent") || "{}");
  const response = await fetch(
    `${API_BASE}/learn?topic=${encodeURIComponent(topic)}&difficulty=${difficulty}&student_id=${selectedStudent.id}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error("Failed to generate learning material");
  }
  
  return await response.json();
};

// Test Management
export const createTest = async (topic, difficulty = "easy") => {
  try {
    const selectedStudent = JSON.parse(localStorage.getItem("selectedStudent") || "{}");
    const response = await fetch(
      `${API_BASE}/test/create?topic=${encodeURIComponent(topic)}&difficulty=${difficulty}&student_id=${selectedStudent.id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(errorData.detail || `Failed to create test: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("createTest error:", error);
    throw error;
  }
};

export const submitAnswer = async (testSessionId, questionIndex, userAnswer) => {
  try {
    const selectedStudent = JSON.parse(localStorage.getItem("selectedStudent") || "{}");
    console.log(`[API] Submitting answer - Session: ${testSessionId}, Question Index: ${questionIndex}, Answer: ${userAnswer}`);
    const response = await fetch(
      `${API_BASE}/test/answer?test_session_id=${testSessionId}&question_index=${questionIndex}&user_answer=${userAnswer}&student_id=${selectedStudent.id}`,
      {
        method: "POST",
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(errorData.detail || `Failed to submit answer: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`[API] Answer response received:`, result);
    return result;
  } catch (error) {
    console.error(`[API] submitAnswer error:`, error);
    throw error;
  }
};

export const getTestScore = async (testSessionId) => {
  try {
    const response = await fetch(
      `${API_BASE}/test/score?test_session_id=${testSessionId}`
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("getTestScore error:", error);
    throw error;
  }
};

export const createTestWithNumber = async (topic, difficulty = "easy", testNumber = 1) => {
  try {
    const response = await fetch(
      `${API_BASE}/test/create?topic=${encodeURIComponent(topic)}&difficulty=${difficulty}&test_number=${testNumber}`,
      {
        method: "POST",
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(errorData.detail || `Failed to create test: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("createTestWithNumber error:", error);
    throw error;
  }
};

export const storeEmotion = async (sessionId, imageDataOrEmotion, confidence = 0.0) => {
  try {
    // Check if it's image data (base64 string starting with 'data:') or emotion text
    if (typeof imageDataOrEmotion === 'string' && imageDataOrEmotion.startsWith('data:')) {
      // Send image for emotion detection
      const response = await fetch(
        `${API_BASE}/test/emotion/detect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            test_session_id: sessionId,
            image_data: imageDataOrEmotion
          })
        }
      );
      
      if (!response.ok) {
        console.warn("Failed to detect emotion from image");
      }
      
      return await response.json();
    } else {
      // Store emotion manually (fallback)
      const response = await fetch(
        `${API_BASE}/test/emotion?test_session_id=${sessionId}&emotion=${imageDataOrEmotion}&confidence=${confidence}`,
        {
          method: "POST",
        }
      );
      
      if (!response.ok) {
        console.warn("Failed to store emotion");
      }
      
      return await response.json();
    }
  } catch (error) {
    console.warn("storeEmotion error:", error);
    // Don't throw - emotion tracking is non-critical
  }
};

export const getNextTestInfo = async (topic) => {
  try {
    const response = await fetch(
      `${API_BASE}/test/next-info?topic=${encodeURIComponent(topic)}`
    );
    
    if (!response.ok) {
      throw new Error("Failed to get next test info");
    }
    
    return await response.json();
  } catch (error) {
    console.error("getNextTestInfo error:", error);
    throw error;
  }
};

// Emotion Analysis (Multimodal)
export const analyzeTextEmotion = async (testSessionId, answerText) => {
  try {
    const response = await fetch(
      `${API_BASE}/test/emotion/text?test_session_id=${testSessionId}&answer_text=${encodeURIComponent(answerText)}`,
      {
        method: "POST",
      }
    );
    
    if (!response.ok) {
      console.warn("Failed to analyze text emotion");
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.warn("analyzeTextEmotion error:", error);
    // Don't throw - emotion tracking is non-critical
    return null;
  }
};

export const getEmotionStats = async (testSessionId) => {
  try {
    const response = await fetch(
      `${API_BASE}/test/emotion/stats?test_session_id=${testSessionId}`
    );
    
    if (!response.ok) {
      console.warn("Failed to get emotion stats");
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.warn("getEmotionStats error:", error);
    return null;
  }
};

// Text Answer Evaluation
export const evaluateTextAnswer = async (testSessionId, questionIndex, topic, question, answer) => {
  try {
    const response = await fetch(
      `${API_BASE}/test/evaluate-text-answer?test_session_id=${testSessionId}&question_index=${questionIndex}&topic=${encodeURIComponent(topic)}&question=${encodeURIComponent(question)}&answer=${encodeURIComponent(answer)}`,
      {
        method: "POST",
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(errorData.detail || "Failed to evaluate answer");
    }
    
    return await response.json();
  } catch (error) {
    console.error("evaluateTextAnswer error:", error);
    throw error;
  }
};

export const submitTextAnswer = async (testSessionId, questionIndex, answerText) => {
  try {
    // First analyze emotion from the text
    await analyzeTextEmotion(testSessionId, answerText);
    
    // Then return the answer for later evaluation
    return {
      status: "submitted",
      questionIndex,
      answer: answerText,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error("submitTextAnswer error:", error);
    throw error;
  }
};