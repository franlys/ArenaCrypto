async function checkKey() {
  const key = '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';
  const url = 'https://openrouter.ai/api/v1/auth/key';
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    const data = await res.json();
    console.log("Key Status:", res.status);
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Check Error:", e.message);
  }
}

checkKey();
