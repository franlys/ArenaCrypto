async function testOpenRouter() {
  const key = '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';
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  console.log("Testing OpenRouter with Gemini 1.5 Flash (Free)...");
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://arenacrypto.com', // Optional
        'X-Title': 'ArenaCrypto' // Optional
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5-free',
        messages: [{ role: 'user', content: 'Say "OpenRouter Connected"' }]
      })
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("OpenRouter Error:", e.message);
  }
}

testOpenRouter();
