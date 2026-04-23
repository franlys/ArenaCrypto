async function testVision() {
  const key = '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';
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  console.log("Testing OpenRouter with NVIDIA Nemotron (Free) + Vision...");
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-nano-12b-v2-vl:free',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Hi' },
              {
                type: 'image_url',
                image_url: {
                  url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
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
