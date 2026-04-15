// GET /api/admin/revenue          — Opción B: Kronix consulta desde su panel
// GET /api/admin/revenue?id=UUID  — Revenue de un torneo específico
//
// Seguridad: requiere header x-ac-secret para uso inter-servicio (Kronix → AC)
// o ser admin autenticado en AC.

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
  const from = searchParams.get("from"); // fecha inicio (ISO)
  const to   = searchParams.get("to");   // fecha fin (ISO)

  let query = acAdmin
    .from("kronix_revenue")
    .select("*")
    .order("period_end", { ascending: false });

  if (tournamentId) query = query.eq("pt_tournament_id", tournamentId);
  if (from) query = query.gte("period_end", from);
  if (to)   query = query.lte("period_end", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Summary totals
  const summary = {
    total_tournaments: data?.length ?? 0,
    total_kronix_volume: data?.reduce((s, r) => s + Number(r.kronix_volume), 0) ?? 0,
    total_commission:   data?.reduce((s, r) => s + Number(r.commission_amount), 0) ?? 0,
    pending_amount:     data?.filter(r => r.status === "pending")
                            .reduce((s, r) => s + Number(r.commission_amount), 0) ?? 0,
  };

  return NextResponse.json({ summary, records: data });
}
