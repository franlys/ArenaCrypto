const { GoogleGenerativeAI } = require('@google/generative-ai');

async function diagnose() {
  const apiKey = 'AIzaSyA7GP9WP-rIEfBVrMcqQ0fPx0yfElzGFx0';
  console.log("Diagnosing with 'gemini-2.0-flash'...");
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const result = await model.generateContent("Say 'Ready'");
    console.log("SUCCESS:", result.response.text());
  } catch (err) {
    console.error("FAIL:", err.message);
  }
}

diagnose();
