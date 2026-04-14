import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "../supabase";

/**
 * ARENACRYPTO: AI Evidence Auditor (The Cerebro)
 * Uses Gemini 1.5 Vision to automatically validate game results.
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function auditMatchResult(matchId: string, imageUrl: string, gameId: string) {
  console.log(`[AI AUDITOR] Starting audit for Match ${matchId} (${gameId})...`);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 1. Prepare Prompt based on game
    const prompt = `
      You are the official ArenaCrypto referee. 
      Analyze this screenshot from the game "${gameId}".
      Identify:
      1. Who won the match? (Give me the exact username/ID seen on screen).
      2. What was the final score/result?
      3. Is this a real victory screen or a fake/menu screen?

      Respond strictly in JSON format:
      {
        "winner_detected": "username or 'none'",
        "score": "string",
        "is_valid_victory": boolean,
        "confidence": number (0-1),
        "reasoning": "short explanation"
      }
    `;

    // 2. Load image and analyze (In a real edge function, you'd fetch the image data first)
    // For now, this is the logic structure:
    /*
    const imageResp = await fetch(imageUrl).then(res => res.arrayBuffer());
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: Buffer.from(imageResp).toString("base64"), mimeType: "image/jpeg" } }
    ]);
    const response = JSON.parse(result.response.text());
    */

    // MOCK SUCCESS FOR DEV:
    const mockResponse = {
      winner_detected: "current_player",
      score: "1 - 0",
      is_valid_victory: true,
      confidence: 0.98,
      reasoning: "Clear victory screen with player name highlighted."
    };

    if (mockResponse.is_valid_victory) {
      await resolveMatch(matchId, mockResponse.winner_detected);
    }

    return mockResponse;
  } catch (err) {
    console.error("[AI AUDITOR] Critical Error:", err);
    throw err;
  }
}

async function resolveMatch(matchId: string, winnerName: string) {
  // Logic to update matches table and trigger payout
  const { error } = await supabase
    .from('matches')
    .update({ 
      status: 'completed',
      completed_at: new Date().toISOString()
      // winner_id would be mapped from winnerName
    })
    .eq('id', matchId);

  if (error) throw error;
  console.log(`[AI AUDITOR] Match ${matchId} resolved. Winner: ${winnerName}`);
}
