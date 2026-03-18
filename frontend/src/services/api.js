const API_BASE = "http://localhost:8000";

// Document Management
export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Upload failed");
  }
  
  return await response.json();
};

export const getDocuments = async () => {
  const response = await fetch(`${API_BASE}/documents`);
  
  if (!response.ok) {
    throw new Error("Failed to fetch documents");
  }
  
  return await response.json();
};

export const deleteDocument = async (docId) => {
  const response = await fetch(`${API_BASE}/documents/${docId}`, {
    method: "DELETE",
  });
  
  if (!response.ok) {
    throw new Error("Failed to delete document");
  }
  
  return await response.json();
};

// Learning Material
export const generateLearningMaterial = async (topic, difficulty = "easy") => {
  const response = await fetch(
    `${API_BASE}/learn?topic=${encodeURIComponent(topic)}&difficulty=${difficulty}`
  );
  
  if (!response.ok) {
    throw new Error("Failed to generate learning material");
  }
  
  return await response.json();
};

// Test Management
export const createTest = async (topic, difficulty = "easy") => {
  try {
    const response = await fetch(
      `${API_BASE}/test/create?topic=${encodeURIComponent(topic)}&difficulty=${difficulty}`,
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
    console.error("createTest error:", error);
    throw error;
  }
};

export const submitAnswer = async (testSessionId, questionIndex, userAnswer) => {
  try {
    console.log(`[API] Submitting answer - Session: ${testSessionId}, Question Index: ${questionIndex}, Answer: ${userAnswer}`);
    const response = await fetch(
      `${API_BASE}/test/answer?test_session_id=${testSessionId}&question_index=${questionIndex}&user_answer=${userAnswer}`,
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
  const response = await fetch(
    `${API_BASE}/test/score?test_session_id=${testSessionId}`
  );
  
  if (!response.ok) {
    throw new Error("Failed to get test score");
  }
  
  return await response.json();
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