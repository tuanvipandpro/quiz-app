// src/utils/geminiApi.js

// Replace with your actual API key or use environment variable
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;

export async function getExplanation(question, options, correctAnswer) {
  try {
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

    // Call Gemini API directly
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + API_KEY, {
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
        ],
        generationConfig: {
          temperature: 0.5,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the explanation text from response
    const explanationText = data.candidates[0].content.parts[0].text;
    return explanationText;
  } catch (error) {
    console.error("Error getting explanation:", error);
    return "Sorry, I couldn't generate an explanation at this time. Please try again later.";
  }
}