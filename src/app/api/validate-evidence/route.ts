import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS for server-side resolution
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
// The current SDK version usually uses v1 by default, but we'll stick to standard init.

// Structured prompt for eSports evidence validation
function buildPrompt(
  game: string,
  player1Username: string,
  player2Username: string
): string {
  return `You are an impartial eSports judge reviewing match evidence for ${game}.

PLAYER 1: "${player1Username}"
PLAYER 2: "${player2Username}"

Analyze the provided screenshot/image carefully. Look for:
- Victory/defeat screens, match result screens (e.g., "¡GANADOR!", "Victory", "Victory Royale")
- Final scoreboards, kill counts, match summary
- Player names or gamertags in the results (Check for banners OVER specific names)
- Scores, rankings, crowns (Clash Royale), or outcome indicators specific to ${game}

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "winner": "player1" | "player2" | "unclear",
  "confidence": <number between 0.0 and 1.0>,
  "reasoning": "<brief explanation of what you see in the image, e.g., 'Banner GANADOR is over Player 2 name with 3 crowns'> "
}

If the image is unclear, not a game screenshot, or you cannot determine the winner with confidence > 0.7, set winner to "unclear".`;
}

export async function POST(req: NextRequest) {
  try {
    const { submission_id } = await req.json();

    if (!submission_id) {
      return NextResponse.json({ error: "submission_id required" }, { status: 400 });
    }

    // 1. Fetch submission + match data (With Retries to prevent race conditions)
    let submission = null;
    let subError = null;

    for (let i = 0; i < 3; i++) {
      const result = await supabaseAdmin
        .from("submissions")
        .select(`
          *,
          match:matches(*)
        `)
        .eq("id", submission_id)
        .maybeSingle();
      
      if (result.data) {
        submission = result.data;
        break;
      }
      subError = result.error;
      if (i < 2) await new Promise(resolve => setTimeout(resolve, 800)); // Wait 800ms
    }

    if (!submission) {
      console.error("[validate-evidence] Submission not found:", submission_id, subError);
      return NextResponse.json({ 
        error: "Submission not found after retries", 
        details: subError?.message || "Record missing in database"
      }, { status: 404 });
    }

    const match = submission.match;

    if (!match || match.status === "resolved") {
      return NextResponse.json({ error: "Match already resolved or not found" }, { status: 400 });
    }

    // 2. Mark as processing
    await supabaseAdmin
      .from("submissions")
      .update({ ai_status: "processing" })
      .eq("id", submission_id);

    // 3. Download image from Supabase Storage
    const { data: fileData, error: fileError } = await supabaseAdmin
      .storage
      .from("evidence")
      .download(submission.evidence_url);

    if (fileError || !fileData) {
      await supabaseAdmin
        .from("submissions")
        .update({ ai_status: "failed" })
        .eq("id", submission_id);
      return NextResponse.json({ error: "Could not fetch evidence file" }, { status: 500 });
    }

    // 4. Convert to base64 for Gemini
    const buffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = (fileData.type || "image/jpeg") as string;

    // 5. Call Gemini Vision - Explicitly using v1 to avoid beta 404s
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });

    // Fallback usernames if match join is messy
    const p1Name = submission.match?.player1_id || "Player 1";
    const p2Name = submission.match?.player2_id || "Player 2";
    const gameId = submission.match?.game_id || "eSports Game";

    const result = await model.generateContent([
      buildPrompt(gameId, p1Name, p2Name),
      {
        inlineData: { data: base64, mimeType },
      },
    ]);

    const rawText = result.response.text().trim();

    // Parse JSON — strip any accidental markdown fences
    let aiData: { winner: string; confidence: number; reasoning: string };
    try {
      const jsonStr = rawText.replace(/```json\n?|\n?```/g, "").trim();
      aiData = JSON.parse(jsonStr);
    } catch {
      console.error("[validate-evidence] AI Response Parse Error:", rawText);
      await supabaseAdmin
        .from("submissions")
        .update({ ai_status: "failed", ai_data: { raw: rawText } })
        .eq("id", submission_id);
      return NextResponse.json({ error: "Failed to parse Gemini response", raw: rawText }, { status: 500 });
    }

    // 6. Store AI result in submission
    const winnerId =
      aiData.winner === "player1"
        ? submission.match?.player1_id
        : aiData.winner === "player2"
        ? submission.match?.player2_id
        : null;

    await supabaseAdmin
      .from("submissions")
      .update({
        ai_status:     "completed",
        ai_data:       aiData,
        ai_confidence: aiData.confidence,
      })
      .eq("id", submission_id);

    // 7. Auto-resolve if confident enough
    if (aiData.confidence >= 0.80 && winnerId) {
      await supabaseAdmin.rpc("resolve_match", {
        p_match_id:  match.id,
        p_winner_id: winnerId,
        p_ai_data:   aiData,
      });

      return NextResponse.json({
        resolved: true,
        winner:   aiData.winner,
        confidence: aiData.confidence,
        reasoning: aiData.reasoning,
      });
    }

    // 8. Low confidence → mark as disputed
    await supabaseAdmin
      .from("matches")
      .update({ status: "disputed" })
      .eq("id", match.id);

    return NextResponse.json({
      resolved:  false,
      disputed:  true,
      winner:    aiData.winner,
      confidence: aiData.confidence,
      reasoning: aiData.reasoning,
    });

  } catch (err: any) {
    console.error("[validate-evidence]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
