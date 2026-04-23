const { GoogleGenerativeAI } = require('@google/generative-ai');

async function diagnose() {
  const apiKey = 'AIzaSyCSBRxUFhh4JPwS1fUyhaMe3xSrHk2G6wY';
  console.log("Diagnosing with 'gemini-flash-latest'...");
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const result = await model.generateContent("Say 'System Online'");
    console.log("SUCCESS:", result.response.text());
  } catch (err) {
    console.error("FAIL:", err.message);
  }
}

diagnose();
