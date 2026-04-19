import { NextResponse } from "next/server";

const PT_URL = process.env.NEXT_PUBLIC_PT_SUPABASE_URL;
const PT_KEY = process.env.NEXT_PUBLIC_PT_SUPABASE_ANON_KEY;

export async function GET() {
  if (!PT_URL || !PT_KEY) {
    return NextResponse.json([], { status: 200 });
  }

  const res = await fetch(
    `${PT_URL}/rest/v1/tournaments?arena_betting_enabled=eq.true&select=*&order=created_at.desc`,
    {
      headers: {
        apikey: PT_KEY,
        Authorization: `Bearer ${PT_KEY}`,
      },
      next: { revalidate: 30 },
    }
  );

  if (!res.ok) return NextResponse.json([], { status: 200 });
  const data = await res.json();
  return NextResponse.json(Array.isArray(data) ? data : []);
}
