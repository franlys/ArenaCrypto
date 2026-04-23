const { GoogleGenerativeAI } = require('@google/generative-ai');

async function diagnose() {
  const apiKey = 'AIzaSyCSBRxUFhh4JPwS1fUyhaMe3xSrHk2G6wY'; // Nueva llave
  console.log("Diagnosing NEW API Key...");
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log("Testing generation with 'gemini-1.5-flash'...");
    try {
      const result = await model.generateContent("Say 'Ready'");
      console.log("SUCCESS:", result.response.text());
    } catch (e) {
      console.error("FAIL:", e.message);
    }
  } catch (err) {
    console.error("CRITICAL ERROR:", err.message);
  }
}

diagnose();
