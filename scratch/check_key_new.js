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
