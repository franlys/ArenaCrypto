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

  // Volumen real por torneo (is_test = false) — calculado directo, ignora kronix_revenue.total_volume
  const { data: realBetsData } = await acAdmin
    .from("tournament_bets")
    .select("pt_tournament_id, amount, origin_platform")
    .eq("is_test", false)
    .neq("status", "canceled");

  const realVolumeByTournament: Record<string, number> = {};
  const kronixVolumeByTournament: Record<string, number> = {};
  (realBetsData ?? []).forEach((b: any) => {
    const tid = b.pt_tournament_id;
    const amt = Number(b.amount ?? 0);
    realVolumeByTournament[tid] = (realVolumeByTournament[tid] ?? 0) + amt;
    if (b.origin_platform === "kronix")
      kronixVolumeByTournament[tid] = (kronixVolumeByTournament[tid] ?? 0) + amt;
  });

  // Volumen test y ganancias reales de PT (apostado − pagado)
  const { data: testData } = await acAdmin
    .from("tournament_bets")
    .select("pt_tournament_id, amount, payout_amount, status, origin_platform")
    .eq("is_test", true)
    .neq("status", "canceled");

  const testVolumeByTournament:   Record<string, number> = {};
  const testEarningsByTournament: Record<string, number> = {};
  (testData ?? []).forEach((b: any) => {
    const tid = b.pt_tournament_id;
    const amt = Number(b.amount ?? 0);
    const pay = Number(b.payout_amount ?? 0);
    testVolumeByTournament[tid]   = (testVolumeByTournament[tid]   ?? 0) + amt;
    // PT se queda con lo apostado menos lo devuelto a ganadores
    testEarningsByTournament[tid] = (testEarningsByTournament[tid] ?? 0) + amt - pay;
  });

  // Rake earned by PT per tournament (sum of rake_amount on resolved markets)
  const { data: rakeData } = await acAdmin
    .from("bet_markets")
    .select("pt_tournament_id, rake_amount")
    .eq("status", "resolved")
    .not("rake_amount", "is", null);

  const rakeByTournament: Record<string, number> = {};
  (rakeData ?? []).forEach((m: any) => {
    const tid = m.pt_tournament_id;
    rakeByTournament[tid] = (rakeByTournament[tid] ?? 0) + Number(m.rake_amount ?? 0);
  });

  const records = (data ?? []).map((r: any) => {
    const testVol      = testVolumeByTournament[r.pt_tournament_id]   ?? 0;
    const testEarnings = testEarningsByTournament[r.pt_tournament_id] ?? 0;
    const rakeEarned   = rakeByTournament[r.pt_tournament_id]         ?? 0;
    const realVol      = realVolumeByTournament[r.pt_tournament_id]   ?? 0;
    const kronixVol    = kronixVolumeByTournament[r.pt_tournament_id] ?? 0;
    return {
      ...r,
      total_volume:   realVol,
      kronix_volume:  kronixVol,
      test_volume:    testVol,
      test_earnings:  testEarnings,
      rake_earned:    rakeEarned,
    };
  });

  const totalTestVolume   = Object.values(testVolumeByTournament).reduce((s: number, v: number) => s + v, 0);
  const totalTestEarnings = Object.values(testEarningsByTournament).reduce((s: number, v: number) => s + v, 0);
  const totalRealVolume   = Object.values(realVolumeByTournament).reduce((s: number, v: number) => s + v, 0);
  const totalKronixVolume = Object.values(kronixVolumeByTournament).reduce((s: number, v: number) => s + v, 0);

  const summary = {
    total_tournaments:   records.length,
    total_real_volume:   totalRealVolume,
    total_kronix_volume: totalKronixVolume,
    total_commission:    records.reduce((s: number, r: any) => s + Number(r.commission_amount), 0),
    total_rake_earned:   records.reduce((s: number, r: any) => s + Number(r.rake_earned ?? 0), 0),
    total_test_volume:   totalTestVolume,
    total_test_earnings: totalTestEarnings,
    pending_amount:      records
                           .filter((r: any) => r.status === "pending")
                           .reduce((s: number, r: any) => s + Number(r.commission_amount), 0),
  };

  // Saldo pendiente de PT = ganancias acumuladas − retiros ya pagados
  const { data: withdrawals } = await acAdmin
    .from("kronix_withdrawals")
    .select("amount, status");

  const totalPaid    = (withdrawals ?? []).filter((w: any) => w.status === "paid").reduce((s: number, w: any) => s + Number(w.amount), 0);
  const totalPending = (withdrawals ?? []).filter((w: any) => w.status === "pending").reduce((s: number, w: any) => s + Number(w.amount), 0);
  const ptBalance    = summary.total_rake_earned - totalPaid;

  return NextResponse.json({ summary: { ...summary, pt_balance: ptBalance, pt_pending_withdrawal: totalPending }, records });
}
