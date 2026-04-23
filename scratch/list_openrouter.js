async function listOpenRouterModels() {
  const url = 'https://openrouter.ai/api/v1/models';
  try {
    const res = await fetch(url);
    const data = await res.json();
    const freeModels = data.data.filter(m => m.id.includes('free'));
    console.log("Free Models Available:", JSON.stringify(freeModels, null, 2));
  } catch (e) {
    console.error("List Error:", e.message);
  }
}

listOpenRouterModels();
