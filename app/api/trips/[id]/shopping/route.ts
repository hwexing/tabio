import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, canUserEditTrip } from "@/lib/auth";
import { supabase } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await params;
  if (!(await canUserEditTrip(id, user.id))) {
    // 閲覧者（viewer）もリストは読めるよう owner_id チェックを緩める
    const { data: trip } = await supabase.from("trips").select("owner_id").eq("id", id).single();
    if (!trip) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    const { data: member } = await supabase
      .from("trip_members")
      .select("role")
      .eq("trip_id", id)
      .eq("user_id", user.id)
      .single();
    if (trip.owner_id !== user.id && !member)
      return NextResponse.json({ error: "アクセス不可" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("shopping_items")
    .select("*")
    .eq("trip_id", id)
    .order("category")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await params;
  if (!(await canUserEditTrip(id, user.id)))
    return NextResponse.json({ error: "アクセス不可" }, { status: 403 });

  const { name, category } = await req.json();
  if (!name) return NextResponse.json({ error: "name は必須です" }, { status: 400 });

  const { data, error } = await supabase
    .from("shopping_items")
    .insert({ trip_id: id, created_by: user.id, name, category: category ?? "other" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
