// src/utils/geminiApi.js

// Replace with your actual API key or use environment variable
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;

export async function getExplanation(question, options, correctAnswer) {
  try {
    // Format the question and options for better context
    let content = `Please explain this question and why the marked answer is correct. Format your response in well-structured markdown with headings, bullet points, code blocks where relevant, and clear organization:
    
Question: ${question}

Options:
`;
    
    // Add each option
    Object.entries(options).forEach(([key, value]) => {
      const isCorrect = correctAnswer.includes(key) ? " (Correct Answer)" : "";
      content += `${key}. ${value}${isCorrect}\n`;
    });
    
    content += `\nProvide a clear, educational explanation of why the correct answer is right and why the other options are incorrect. Use concepts and principles to support your explanation.`;

    // Call Gemini API directly
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + API_KEY, {
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