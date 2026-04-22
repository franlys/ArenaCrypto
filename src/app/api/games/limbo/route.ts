import { NextRequest, NextResponse } from "next/server";
import { createClient as createAnon } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const MAX_PAYOUT = 25000;
const MAX_BET = 1000;
const BASE_HOUSE_EDGE = 0.20; // 20% base edge (80% RTP)

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

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  let { amount, target_multiplier, isTest = false } = body;
  if (!amount || amount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  if (amount > MAX_BET) return NextResponse.json({ error: `La apuesta máxima es $${MAX_BET}` }, { status: 400 });
  if (target_multiplier < 1.01 || target_multiplier > 1000000) return NextResponse.json({ error: "Multiplicador inválido" }, { status: 400 });

  const db = admin();
  const { data: profile } = await db.from("profiles").select("is_test_user").eq("id", user.id).single();
  if (profile?.is_test_user) isTest = true;

  const field = isTest ? "test_balance" : "balance_stablecoin";
  const { data: wallet } = await db.from("wallets").select(field).eq("user_id", user.id).single();
  if (!wallet) return NextResponse.json({ error: "Wallet no encontrada" }, { status: 400 });

  const balance = Number((wallet as any)[field]);
  if (balance < amount) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });

  await db.from("wallets").update({ [field]: Number((balance - amount).toFixed(2)) }).eq("user_id", user.id);

  // Dynamic Difficulty: Stronger edge for high stakes
  const effectiveEdge = amount > 100 ? 0.30 : BASE_HOUSE_EDGE;
  const randomValue = crypto.randomBytes(4).readUInt32BE(0) / Math.pow(2, 32);
  const result = Math.floor(((1 - effectiveEdge) / (1 - randomValue)) * 100) / 100;
  
  const won = result >= target_multiplier;
  const payoutRaw = won ? Number((amount * target_multiplier).toFixed(2)) : 0;
  const payout = Math.min(payoutRaw, MAX_PAYOUT);

  if (won) {
    const { data: w } = await db.from("wallets").select(field).eq("user_id", user.id).single();
    await db.from("wallets").update({ [field]: Number((Number((w as any)[field]) + payout).toFixed(2)) }).eq("user_id", user.id);
  }

  try {
    await db.from("limbo_games").insert({ user_id: user.id, amount, is_test: isTest, target: target_multiplier, result, won, payout });
  } catch (e) {}

  return NextResponse.json({ ok: true, result, won, payout, multiplier: won ? (payout/amount) : 0 });
}
