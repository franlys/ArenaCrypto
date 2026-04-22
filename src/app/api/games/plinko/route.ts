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
  low: {
    8:  [4.0, 1.8, 1.0, 0.5, 0.3, 0.5, 1.0, 1.8, 4.0],
    12: [7.0, 2.0, 1.2, 0.8, 0.4, 0.2, 0.4, 0.8, 1.2, 2.0, 7.0, 0, 0],
    16: [12, 5, 1.8, 1.0, 0.9, 0.7, 0.5, 0.3, 0.2, 0.3, 0.5, 0.7, 0.9, 1.0, 1.8, 5, 12],
  },
  medium: {
    8:  [8, 2.0, 1.0, 0.5, 0.2, 0.5, 1.0, 2.0, 8],
    12: [15, 4.0, 1.5, 0.8, 0.4, 0.2, 0.4, 0.8, 1.5, 4.0, 15, 0, 0],
    16: [60, 25, 6, 3, 1.5, 1, 0.5, 0.3, 0.2, 0.3, 0.5, 1, 1.5, 3, 6, 25, 60],
  },
  high: {
    8:  [22, 3.0, 1.2, 0.3, 0.2, 0.3, 1.2, 3.0, 22],
    12: [55, 7, 2.2, 0.6, 0.4, 0.1, 0.4, 0.6, 2.2, 7, 55, 0, 0],
    16: [500, 80, 18, 6, 3, 1.5, 0.5, 0.2, 0.1, 0.2, 0.5, 1.5, 3, 6, 18, 80, 500],
  }
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
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  let { amount, risk_level = "medium", rows = 16, isTest = false } = body;

  if (!amount || amount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  
  const db = admin();

  // SECURITY: Force test mode for test users
  const { data: profile } = await db.from("profiles").select("is_test_user").eq("id", user.id).single();
  if (profile?.is_test_user) {
    isTest = true;
  }

  const field = isTest ? "test_balance" : "balance_stablecoin";

  const { data: wallet } = await db.from("wallets").select(field).eq("user_id", user.id).single();
  if (!wallet) return NextResponse.json({ error: "Wallet no encontrada" }, { status: 400 });

  const bal = Number((wallet as Record<string, unknown>)[field]);
  if (bal < amount) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });

  await db.from("wallets").update({ [field]: bal - amount }).eq("user_id", user.id);

  const serverSeed = crypto.randomBytes(32).toString("hex");
  const { path, slot } = dropPlinko(serverSeed, rows);
  const multiplier = MULTIPLIERS[risk_level][rows][slot] ?? 0;
  const payout = Number((amount * multiplier).toFixed(2));

  // Credit payout
  const { data: w } = await db.from("wallets").select(field).eq("user_id", user.id).single();
  await db.from("wallets").update({ [field]: Number((w as any)[field]) + payout }).eq("user_id", user.id);

  await db.from("plinko_drops").insert({
    user_id: user.id, amount, is_test: isTest,
    risk_level, rows, path, slot, multiplier, payout,
  });

  return NextResponse.json({ ok: true, path, slot, multiplier, payout });
}
