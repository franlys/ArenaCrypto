import { NextRequest, NextResponse } from "next/server";
import { createClient as createAnon } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const MAX_PAYOUT = 50000;
const HOUSE_EDGE = 0.04; // 4% edge (96% RTP)

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

  const db = admin();

  // SECURITY: Force test mode for test users
  const { data: profile } = await db.from("profiles").select("is_test_user").eq("id", user.id).single();
  if (profile?.is_test_user) {
    isTest = true;
  }

  const field = isTest ? "test_balance" : "balance_stablecoin";

  // Check wallet
  const { data: wallet } = await db.from("wallets").select(field).eq("user_id", user.id).single();
  if (!wallet) return NextResponse.json({ error: "Wallet no encontrada" }, { status: 400 });

  const balance = Number((wallet as Record<string, unknown>)[field]);
  if (balance < amount) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });

  // Deduct balance
  await db.from("wallets").update({ [field]: balance - amount }).eq("user_id", user.id);

  // Generate result (Provably Fair pattern)
  // Standard Limbo math: result = (1 - HouseEdge) / Random
  const randomValue = crypto.randomBytes(4).readUInt32BE(0) / Math.pow(2, 32);
  const result = Math.floor(((1 - HOUSE_EDGE) / (1 - randomValue)) * 100) / 100;
  
  const won = result >= target_multiplier;
  const payoutRaw = won ? Number((amount * target_multiplier).toFixed(2)) : 0;
  const payout = Math.min(payoutRaw, MAX_PAYOUT);

  // Credit winnings
  if (won) {
    const { data: w } = await db.from("wallets").select(field).eq("user_id", user.id).single();
    await db.from("wallets").update({ [field]: Number((w as any)[field]) + payout }).eq("user_id", user.id);
  }

  // Log game (attempt to insert, ignore if table missing for now - though we should create it)
  try {
    await db.from("limbo_games").insert({
      user_id: user.id,
      amount,
      is_test: isTest,
      target: target_multiplier,
      result,
      won,
      payout,
    });
  } catch (e) {
    console.error("Limbo log error (table might be missing):", e);
  }

  return NextResponse.json({
    ok: true,
    result,
    won,
    payout,
    multiplier: won ? target_multiplier : 0
  });
}
