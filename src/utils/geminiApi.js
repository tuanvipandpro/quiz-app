// src/utils/geminiApi.js
import userService from '../services/userService';

// Storage key for API key (fallback for non-logged in users)
const STORAGE_KEY = 'gemini_api_key';

/**
 * Get API key from Firestore (if user is logged in) or localStorage
 * @param {string|null} uid - User ID (optional)
 * @returns {Promise<string|null>}
 */
export async function getApiKey(uid = null) {
  // If user is logged in, get from Firestore
  if (uid) {
    try {
      const apiKey = await userService.getGeminiApiKey(uid);
      if (apiKey) {
        return apiKey;
      }
    } catch (error) {
      console.error('Error getting API key from Firestore:', error);
    }
  }
  
  // Fallback to localStorage
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Save API key to Firestore (if user is logged in) and localStorage
 * @param {string} apiKey - API key to save
 * @param {string|null} uid - User ID (optional)
 * @returns {Promise<void>}
 */
export async function saveApiKey(apiKey, uid = null) {
  // Save to localStorage as fallback
  localStorage.setItem(STORAGE_KEY, apiKey);
  
  // If user is logged in, save to Firestore
  if (uid) {
    try {
      await userService.saveGeminiApiKey(uid, apiKey);
    } catch (error) {
      console.error('Error saving API key to Firestore:', error);
    }
  }
}

/**
 * Remove API key from Firestore (if user is logged in) and localStorage
 * @param {string|null} uid - User ID (optional)
 * @returns {Promise<void>}
 */
export async function clearApiKey(uid = null) {
  // Remove from localStorage
  localStorage.removeItem(STORAGE_KEY);
  
  // If user is logged in, clear from Firestore
  if (uid) {
    try {
      await userService.clearGeminiApiKey(uid);
    } catch (error) {
      console.error('Error clearing API key from Firestore:', error);
    }
  }
}

/**
 * Check if API key exists
 * @param {string|null} uid - User ID (optional)
 * @returns {Promise<boolean>}
 */
export async function hasApiKey(uid = null) {
  const apiKey = await getApiKey(uid);
  return !!apiKey;
}

// Available models with fallback order
const MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemma-3-27b'
];

// Helper function to call a specific model
async function callModelAPI(modelName, content, apiKey) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: content
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`API error: ${response.status}`);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return response.json();
}

export async function getExplanation(question, options, correctAnswer, uid = null) {
  const API_KEY = await getApiKey(uid);
  
  // If no API key is available, throw a special error
  if (!API_KEY) {
    const error = new Error('API key is required');
    error.code = 'NO_API_KEY';
    throw error;
  }
  
  // Format the question and options for better context
  let content = `Hãy giải thích câu hỏi này và lý do tại sao đáp án được đánh dấu là chính xác. Định dạng câu trả lời của bạn bằng markdown có cấu trúc tốt với các tiêu đề, gạch đầu dòng, khối code khi cần thiết và tổ chức rõ ràng:
    
Câu hỏi: ${question}

Các lựa chọn:
`;
  
  // Add each option
  Object.entries(options).forEach(([key, value]) => {
    const isCorrect = correctAnswer.includes(key) ? " (Đáp án đúng)" : "";
    content += `${key}. ${value}${isCorrect}\n`;
  });
  
  content += `\nHãy cung cấp một lời giải thích rõ ràng, mang tính giáo dục về lý do tại sao đáp án đúng là chính xác và tại sao các lựa chọn khác là sai. Sử dụng các khái niệm và nguyên tắc để hỗ trợ lời giải thích của bạn. Hãy giữ nguyên các thuật ngữ chuyên ngành quan trọng trong câu trả lời.`;

  let lastError = null;
  let attemptCount = 0;
  
  // Try each model with retry logic
  for (const modelName of MODELS) {
    try {
      attemptCount++;
      console.log(`Attempting to use model: ${modelName} (attempt ${attemptCount})`);
      
      const data = await callModelAPI(modelName, content, API_KEY);
      
      // Extract the explanation text from response
      const explanationText = data.candidates[0].content.parts[0].text;
      
      // Add model information to the response
      const modelInfo = `\n\n---\n*Câu trả lời được tạo bởi model: **${modelName}***`;
      
      return explanationText + modelInfo;
    } catch (error) {
      console.error(`Error with model ${modelName}:`, error);
      lastError = error;
      
      // Check if we've exceeded max attempts
      if (attemptCount >= 3) {
        console.error('Max retry attempts reached (3)');
        break;
      }
      
      // If it's a rate limit error (429) or server error (500-503), try next model
      if (error.status === 429 || (error.status >= 500 && error.status <= 503)) {
        console.log(`Rate limit or server error with ${modelName}, trying next model...`);
        continue;
      }
      
      // For other errors, try next model
      console.log(`Error with ${modelName}, trying next model...`);
      continue;
    }
  }
  
  // If all models failed
  console.error("All models failed after attempts:", attemptCount);
  return `Xin lỗi, không thể tạo giải thích lúc này sau ${attemptCount} lần thử. Vui lòng thử lại sau.\n\nLỗi: ${lastError?.message || 'Unknown error'}`;
}