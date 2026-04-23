async function testRaw() {
  const key = 'AIzaSyCSBRxUFhh4JPwS1fUyhaMe3xSrHk2G6wY';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  
  console.log("Fetching raw from Google...");
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response Body:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Fetch error:", e.message);
  }
}

testRaw();
