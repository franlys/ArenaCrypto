const { GoogleGenerativeAI } = require('@google/generative-ai');

async function diagnose() {
  const apiKey = 'AIzaSyA7GP9WP-rIEfBVrMcqQ0fPx0yfElzGFx0';
  console.log("Diagnosing NEWEST API Key...");
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Probando con 1.5 flash también
    
    console.log("Testing generation with 'gemini-1.5-flash'...");
    const result = await model.generateContent("Say 'Victory'");
    console.log("SUCCESS:", result.response.text());
  } catch (err) {
    console.error("FAIL:", err.message);
  }
}

diagnose();
