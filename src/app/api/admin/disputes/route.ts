
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch matches that need attention
    const { data: matches, error: matchError } = await supabaseAdmin
      .from("matches")
      .select(`
        id, stake_amount, status, player1_id, player2_id, created_at,
        player1:profiles!player1_id(username),
        player2:profiles!player2_id(username)
      `)
      .in("status", ["disputed", "validating", "evidence_pending"])
      .order("created_at", { ascending: false });

    if (matchError) throw matchError;
    if (!matches || matches.length === 0) return NextResponse.json([]);

    // 2. Fetch all submissions for these matches
    const matchIds = matches.map(m => m.id);
    const { data: subs, error: subError } = await supabaseAdmin
      .from("submissions")
      .select("*")
      .in("match_id", matchIds);

    if (subError) throw subError;

    // 3. Combine
    const combined = matches.map(m => {
      const relatedSubs = subs?.filter(s => s.match_id === m.id) || [];
      return {
        ...m,
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
