
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch non-resolved submissions
    const { data: subs, error: subError } = await supabaseAdmin
      .from("submissions")
      .select("id, evidence_url, ai_status, player_id, created_at, match_id")
      .neq("ai_status", "resolved")
      .order("created_at", { ascending: false });

    if (subError) throw subError;
    if (!subs || subs.length === 0) return NextResponse.json([]);

    // 2. Fetch associated matches
    const matchIds = Array.from(new Set(subs.map(s => s.match_id)));
    const { data: matches, error: matchError } = await supabaseAdmin
      .from("matches")
      .select(`
        id, stake_amount, status, player1_id, player2_id,
        player1:profiles!player1_id(username),
        player2:profiles!player2_id(username)
      `)
      .in("id", matchIds);

    if (matchError) throw matchError;

    // 3. Combine
    const combined = (matches ?? []).map(m => {
      const relatedSubs = subs.filter(s => s.match_id === m.id);
      return {
        ...m,
        // Normalize player objects (profiles joins can return arrays in some versions)
        player1: Array.isArray(m.player1) ? m.player1[0] : m.player1,
        player2: Array.isArray(m.player2) ? m.player2[0] : m.player2,
        submissions: relatedSubs
      };
    });

    return NextResponse.json(combined);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
