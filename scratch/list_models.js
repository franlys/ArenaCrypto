async function listModels() {
  const key = 'AIzaSyCSBRxUFhh4JPwS1fUyhaMe3xSrHk2G6wY';
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  console.log("Listing models...");
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Models Available:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("List error:", e.message);
  }
}

listModels();
