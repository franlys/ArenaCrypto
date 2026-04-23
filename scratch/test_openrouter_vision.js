async function testVision() {
  const key = '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';
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  console.log("Testing OpenRouter with Gemma 3 27B (Free) + Vision...");
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemma-3-27b-it:free',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What is in this image?' },
              {
                type: 'image_url',
                image_url: {
                  url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Google_Gemini_logo.svg/2560px-Google_Gemini_logo.svg.png'
                }
              }
            ]
          }
        ]
      })
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("OpenRouter Vision Error:", e.message);
  }
}

testVision();
