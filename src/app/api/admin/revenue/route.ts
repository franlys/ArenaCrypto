// GET /api/admin/revenue          — todos los registros de revenue
// GET /api/admin/revenue?id=UUID  — torneo específico
//
// Seguridad: requiere header x-ac-secret (usado por PT para inter-servicio)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const acAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isAuthorized(req: NextRequest) {
  const secret = req.headers.get("x-ac-secret");
  return secret === process.env.AC_WEBHOOK_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("id");
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  // Primero recalcular revenue de todos los torneos con apuestas para tener datos frescos
  if (!tournamentId) {
    const { data: tournaments } = await acAdmin
      .from("tournament_bets")
      .select("pt_tournament_id")
      .neq("pt_tournament_id", null);

    if (tournaments) {
      const uniqueIds = Array.from(new Set(tournaments.map((t: any) => t.pt_tournament_id)));
      await Promise.all(
        uniqueIds.map((id) =>
          acAdmin.rpc("calculate_tournament_revenue", { p_pt_tournament_id: id })
        )
      );
    }
  }

  let query = acAdmin
    .from("kronix_revenue")
    .select("*")
    .order("period_end", { ascending: false });

  if (tournamentId) query = query.eq("pt_tournament_id", tournamentId);
  if (from) query = query.gte("period_end", from);
  if (to)   query = query.lte("period_end", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Volumen test por torneo (informativo — no cuenta para comisiones)
  const { data: testData } = await acAdmin
    .from("tournament_bets")
    .select("pt_tournament_id, amount")
    .eq("is_test", true)
    .neq("status", "canceled");

  const testVolumeByTournament: Record<string, number> = {};
  (testData ?? []).forEach((b: any) => {
    const tid = b.pt_tournament_id;
    testVolumeByTournament[tid] = (testVolumeByTournament[tid] ?? 0) + Number(b.amount);
  });

  const records = (data ?? []).map((r: any) => ({
    ...r,
    test_volume: testVolumeByTournament[r.pt_tournament_id] ?? 0,
  }));

  const summary = {
    total_tournaments:    records.length,
    total_real_volume:    records.reduce((s: number, r: any) => s + Number(r.total_volume), 0),
    total_kronix_volume:  records.reduce((s: number, r: any) => s + Number(r.kronix_volume), 0),
    total_commission:     records.reduce((s: number, r: any) => s + Number(r.commission_amount), 0),
    total_test_volume:    Object.values(testVolumeByTournament).reduce((s: number, v: number) => s + v, 0),
    pending_amount:       records
                            .filter((r: any) => r.status === "pending")
                            .reduce((s: number, r: any) => s + Number(r.commission_amount), 0),
  };

  return NextResponse.json({ summary, records });
}
