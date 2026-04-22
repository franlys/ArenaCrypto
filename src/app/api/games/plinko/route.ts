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

const MAX_BET = 1000;
const MAX_PAYOUT = 25000; // Hard cap for platform safety

const MULTIPLIERS: Record<string, Record<number, number[]>> = {
  low: {
    8:  [3.2, 1.5, 1.1, 1.0, 0.5, 1.0, 1.1, 1.5, 3.2],
    12: [5.0, 2.0, 1.4, 1.1, 1.0, 0.8, 0.5, 0.8, 1.0, 1.1, 1.4, 2.0, 5.0],
    16: [10, 5.0, 2.0, 1.4, 1.1, 1.0, 1.0, 0.9, 0.5, 0.9, 1.0, 1.0, 1.1, 1.4, 2.0, 5.0, 10],
  },
  medium: {
    8:  [10, 2.5, 1.2, 0.6, 0.3, 0.6, 1.2, 2.5, 10],
    12: [25, 9.0, 3.5, 1.5, 1.0, 0.5, 0.2, 0.5, 1.0, 1.5, 3.5, 9.0, 25],
    16: [80, 30, 8.0, 4.0, 2.0, 1.2, 0.8, 0.4, 0.2, 0.4, 0.8, 1.2, 2.0, 4.0, 8.0, 30, 80],
  },
  high: {
    8:  [25, 3.5, 1.3, 0.3, 0.1, 0.3, 1.3, 3.5, 25],
    12: [120, 20, 6.5, 1.8, 0.6, 0.2, 0.1, 0.2, 0.6, 1.8, 6.5, 20, 120],
    16: [250, 120, 22, 7.5, 3.5, 1.5, 0.4, 0.1, 0.1, 0.1, 0.4, 1.5, 3.5, 7.5, 22, 120, 250],
  }
};

function dropPlinko(serverSeed: string, rows: number, amount: number): { path: string[]; slot: number } {
  const dropSeed = crypto.createHash("sha256").update(serverSeed + Date.now().toString()).digest("hex");
  const path: string[] = [];
  let slot = 0;
  
  // DYNAMIC DIFFICULTY: Stronger bias towards center
  const centerBias = amount > 250 ? 0.15 : 0.08; 

  for (let i = 0; i < rows; i++) {
    const val = parseInt(dropSeed.slice(i * 2, i * 2 + 2), 16) / 256;
    
    // Logic: Ball at slot 'k' at row 'i'. 
    // If it's too far right, pull left. If too far left, pull right.
    let threshold = 0.5;
    if (centerBias > 0) {
      if (slot > i / 2) { threshold = 0.5 + centerBias; } // More likely to go Left (0)
      else if (slot < i / 2) { threshold = 0.5 - centerBias; } // More likely to go Right (1)
    }

    if (val < threshold) { path.push("L"); } else { path.push("R"); slot++; }
  }
  return { path, slot };
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  let { amount, risk_level = "medium", rows = 16, isTest = false } = body;

  if (!amount || amount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  if (amount > MAX_BET && !isTest) return NextResponse.json({ error: `La apuesta máxima es $${MAX_BET}` }, { status: 400 });
  if (![8, 12, 16].includes(rows)) return NextResponse.json({ error: "Filas inválidas" }, { status: 400 });
  
  const db = admin();
  const { data: profile } = await db.from("profiles").select("is_test_user").eq("id", user.id).single();
  if (profile?.is_test_user) isTest = true;

  const field = isTest ? "test_balance" : "balance_stablecoin";
  const { data: wallet } = await db.from("wallets").select(field).eq("user_id", user.id).single();
  if (!wallet) return NextResponse.json({ error: "Wallet no encontrada" }, { status: 400 });

  const bal = Number((wallet as Record<string, unknown>)[field]);
  if (bal < amount) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });

  await db.from("wallets").update({ [field]: Number((bal - amount).toFixed(2)) }).eq("user_id", user.id);

  const serverSeed = crypto.randomBytes(32).toString("hex");
  const { path, slot } = dropPlinko(serverSeed, rows, amount);
  const multiplier = MULTIPLIERS[risk_level][rows][slot] ?? 0;
  
  // Apply hard cap to payout
  const payoutRaw = amount * multiplier;
  const payout = Number(Math.min(payoutRaw, MAX_PAYOUT).toFixed(2));

  if (payout > 0) {
    const { data: w } = await db.from("wallets").select(field).eq("user_id", user.id).single();
    await db.from("wallets").update({ [field]: Number((Number((w as any)[field]) + payout).toFixed(2)) }).eq("user_id", user.id);
  }

  await db.from("plinko_drops").insert({
    user_id: user.id, amount, is_test: isTest,
    risk_level, rows, path, slot, multiplier, payout,
  });

  return NextResponse.json({ ok: true, path, slot, multiplier: payout/amount, payout });
}
