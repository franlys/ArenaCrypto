const { GoogleGenerativeAI } = require('@google/generative-ai');

async function diagnose() {
  const apiKey = 'AIzaSyAabRb7W5E8uYiB5ZrQV7lI0nlIXXFjI6k'; // La llave de tu .env
  console.log("Diagnosing API Key...");
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Intentar listar modelos (esto requiere permisos de API)
    // El SDK no tiene un listModels directo fácil, así que intentaremos una llamada mínima
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log("Testing minimal generation with 'gemini-1.5-flash'...");
    try {
      const result = await model.generateContent("test");
      console.log("SUCCESS: Gemini 1.5 Flash is working!");
    } catch (e) {
      console.error("FAIL: Gemini 1.5 Flash error:", e.message);
    }

    console.log("\nTesting minimal generation with 'gemini-pro' (Text only)...");
    try {
      const textModel = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await textModel.generateContent("Hi");
      console.log("SUCCESS: Gemini Pro (Text) is working!");
    } catch (e) {
      console.error("FAIL: Gemini Pro error:", e.message);
    }

  } catch (err) {
    console.error("CRITICAL ERROR during diagnosis:", err.message);
  }
}

diagnose();
