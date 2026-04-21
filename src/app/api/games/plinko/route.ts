/**
 * POST /api/games/plinko
 * Dual Auth: cookie-based (SSR) + Bearer token (fallback)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAnon } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser(req: NextRequest) {
  const supabase = await createAnon();
  const { data: { user: cookieUser } } = await supabase.auth.getUser();
  if (cookieUser) return cookieUser;

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (token && token !== "undefined" && token !== "null") {
    const { data: { user: headerUser } } = await supabase.auth.getUser(token);
    return headerUser;
  }
  return null;
}

const MULTIPLIERS: Record<string, Record<number, number[]>> = {
  low:    { 8: [5.6,2.1,1.1,1.0,0.5,1.0,1.1,2.1,5.6], 12: [8.9,3.0,1.4,1.1,1.0,0.5,1.0,1.1,1.4,3.0,8.9,0,0], 16: [16,9,2,1.4,1.4,1.2,1.1,1.0,0.5,1.0,1.1,1.2,1.4,1.4,2,9,16] },
  medium: { 8: [13,3,1.3,0.7,0.4,0.7,1.3,3,13], 12: [24,6,2,1.4,0.6,0.4,0.6,1.4,2,6,24,0,0], 16: [110,41,10,5,3,1.5,1.0,0.5,0.3,0.5,1.0,1.5,3,5,10,41,110] },
  high:   { 8: [29,4,1.5,0.3,0.2,0.3,1.5,4,29], 12: [76,10,3,0.6,0.4,0.1,0.4,0.6,3,10,76,0,0], 16: [1000,130,26,9,4,2,0.7,0.2,0.1,0.2,0.7,2,4,9,26,130,1000] },
};

function dropPlinko(serverSeed: string, rows: number): { path: string[]; slot: number } {
  const hash = crypto.createHash("sha256").update(serverSeed).digest("hex");
  const path: string[] = [];
  let slot = 0;
  for (let i = 0; i < rows; i++) {
    const bit = parseInt(hash[i % 64], 16) % 2;
    if (bit === 0) { path.push("L"); } else { path.push("R"); slot++; }
  }
  return { path, slot };
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Sesión expirada o no autenticado. Por favor, recarga la página o conecta tu wallet." }, { status: 401 });

  const { amount, risk_level = "medium", rows = 16, isTest = false } = await req.json();

  if (!amount || amount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  
  const db = admin();
  const field = isTest ? "test_balance" : "balance_stablecoin";

  const { data: wallet } = await db.from("wallets")
    .select("balance_stablecoin, test_balance").eq("user_id", user.id).single();
  if (!wallet) return NextResponse.json({ error: "Wallet no encontrada" }, { status: 400 });

  const bal = Number((wallet as Record<string, unknown>)[field]);
  if (bal < amount) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });

  await db.from("wallets").update({ [field]: bal - amount }).eq("user_id", user.id);

  const serverSeed = crypto.randomBytes(32).toString("hex");
  const { path, slot } = dropPlinko(serverSeed, rows);
  const multiplier = MULTIPLIERS[risk_level][rows][slot] ?? 0;
  const payout = Number((amount * multiplier).toFixed(2));

  const { data: w } = await db.from("wallets").select(field).eq("user_id", user.id).single();
  await db.from("wallets").update({ [field]: (w as any)[field] + payout }).eq("user_id", user.id);

  await db.from("plinko_drops").insert({
    user_id: user.id, amount, is_test: isTest,
    risk_level, rows, path, slot, multiplier, payout,
  });

  return NextResponse.json({ ok: true, path, slot, multiplier, payout });
}
