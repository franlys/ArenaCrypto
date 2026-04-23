import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin for sensitive operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { submission_id } = await req.json();

    if (!submission_id) {
      return NextResponse.json({ error: "Missing submission_id" }, { status: 400 });
    }

    // 1. Fetch submission data
    const { data: submission, error: subError } = await supabaseAdmin
      .from("submissions")
      .select(`
        id, 
        evidence_url,
        player_id,
        match:matches (
          id,
          status,
          player1_id,
          player2_id
        )
      `)
      .eq("id", submission_id)
      .single();

    if (subError || !submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // @ts-ignore
    const matchId = Array.isArray(submission.match) ? submission.match[0]?.id : submission.match?.id;

    if (!matchId) {
      return NextResponse.json({ error: "Match not found for this submission" }, { status: 404 });
    }

    // 2. Mark match as 'disputed' to flag it for manual admin review
    const { error: updateError } = await supabaseAdmin
      .from("matches")
      .update({ 
        status: "disputed",
        updated_at: new Date().toISOString()
      })
      .eq("id", matchId);

    if (updateError) {
      console.error("[validate-evidence] Match update error:", updateError);
    }

    // 3. Update submission status to 'manual_review'
    await supabaseAdmin
      .from("submissions")
      .update({ ai_status: "manual_review" })
      .eq("id", submission_id);

    return NextResponse.json({ 
      success: true, 
      message: "Evidence received. Match flagged for manual arbitration.",
      arbitration_status: "pending"
    });

  } catch (err: any) {
    console.error("[validate-evidence] Server Error:", err.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
