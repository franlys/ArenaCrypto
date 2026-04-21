/**
 * POST /api/games/plinko
 * Single-action game: drop ball, get result instantly
 * House edge: 3% baked into multiplier tables
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Multiplier tables per risk level (16 rows, 17 slots)
// Low risk: stays near center, High risk: extremes have huge multipliers
const MULTIPLIERS: Record<string, Record<number, number[]>> = {
  low: {
    8:  [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    12: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9, 0, 0],
    16: [16, 9,   2,   1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  },
  medium: {
    8:  [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    12: [24, 6,  2,  1.4, 0.6, 0.4, 0.6, 1.4, 2, 6, 24, 0, 0],
    16: [110, 41, 10, 5,  3,  1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3, 5, 10, 41, 110],
  },
  high: {
    8:  [29, 4,  1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    12: [76, 10, 3,   0.6, 0.4, 0.1, 0.4, 0.6, 3, 10, 76, 0, 0],
    16: [1000, 130, 26, 9, 4, 2, 0.7, 0.2, 0.1, 0.2, 0.7, 2, 4, 9, 26, 130, 1000],
  }
};

function dropPlinko(serverSeed: string, rows: number): { path: string[]; slot: number } {
  const hash = crypto.createHash("sha256").update(serverSeed).digest("hex");
  const path: string[] = [];
  let slot = 0;
  for (let i = 0; i < rows; i++) {
    const bit = parseInt(hash[i % 64], 16) % 2;
    if (bit === 0) { path.push("L"); }
    else           { path.push("R"); slot++; }
  }
  return { path, slot };
}

async function getUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await db().auth.getUser(token);
  return data?.user ?? null;
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, risk_level = "medium", rows = 16 } = await req.json();

  if (!amount || amount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  if (!["low","medium","high"].includes(risk_level)) return NextResponse.json({ error: "Risk inválido" }, { status: 400 });
  if (![8, 12, 16].includes(rows)) return NextResponse.json({ error: "Rows inválido" }, { status: 400 });

  // Deduct balance
  const { data: wallet } = await db().from("wallets")
    .select("balance_stablecoin, test_balance, is_test_user").eq("user_id", user.id).single();
  if (!wallet) return NextResponse.json({ error: "Wallet no encontrada" }, { status: 400 });

  const isTest = wallet.is_test_user ?? false;
  const bal = isTest ? wallet.test_balance : wallet.balance_stablecoin;
  if (bal < amount) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });

  const col = isTest ? "test_balance" : "balance_stablecoin";
  await db().from("wallets").update({ [col]: bal - amount }).eq("user_id", user.id);

  // Generate result
  const serverSeed = crypto.randomBytes(32).toString("hex");
  const { path, slot } = dropPlinko(serverSeed, rows);
  const mults = MULTIPLIERS[risk_level][rows];
  const multiplier = mults[slot] ?? 0;
  const payout = Number((amount * multiplier).toFixed(2));

  // Credit payout
  const { data: freshWallet } = await db().from("wallets").select(col).eq("user_id", user.id).single();
  await db().from("wallets")
    .update({ [col]: (freshWallet as any)[col] + payout }).eq("user_id", user.id);

  // Save record
  await db().from("plinko_drops").insert({
    user_id: user.id, amount, is_test: isTest,
    risk_level, rows, path, slot, multiplier, payout,
  });

  return NextResponse.json({ ok: true, path, slot, multiplier, payout, server_seed: serverSeed });
}
