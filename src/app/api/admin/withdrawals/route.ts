// GET  /api/admin/withdrawals  — lista retiros (AC admin o PT via secret)
// POST /api/admin/withdrawals  — PT solicita retiro (requiere x-ac-secret)
// PATCH /api/admin/withdrawals — AC marca retiro como pagado (requiere x-ac-secret)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const acAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isAuthorized(req: NextRequest) {
  return req.headers.get("x-ac-secret") === process.env.AC_WEBHOOK_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await acAdmin
    .from("kronix_withdrawals")
    .select("*")
    .order("requested_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ withdrawals: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, notes } = await req.json();
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  const { data, error } = await acAdmin
    .from("kronix_withdrawals")
    .insert({ amount: Number(amount), notes: notes ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, withdrawal: data });
}

export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, notes } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data, error } = await acAdmin
    .from("kronix_withdrawals")
    .update({ status: "paid", paid_at: new Date().toISOString(), notes })
    .eq("id", id)
    .eq("status", "pending")
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, withdrawal: data });
}
