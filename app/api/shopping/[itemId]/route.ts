import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, canUserEditTrip } from "@/lib/auth";
import { supabase } from "@/lib/supabase-server";

async function getItemTripId(itemId: string): Promise<string | null> {
  const { data } = await supabase
    .from("shopping_items")
    .select("trip_id")
    .eq("id", itemId)
    .single();
  return data?.trip_id ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { itemId } = await params;
  const tripId = await getItemTripId(itemId);
  if (!tripId) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (!(await canUserEditTrip(tripId, user.id)))
    return NextResponse.json({ error: "アクセス不可" }, { status: 403 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if ("name" in body) updates.name = body.name;
  if ("category" in body) updates.category = body.category;
  if ("is_done" in body) updates.is_done = body.is_done;

  const { data, error } = await supabase
    .from("shopping_items")
    .update(updates)
    .eq("id", itemId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { itemId } = await params;
  const tripId = await getItemTripId(itemId);
  if (!tripId) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (!(await canUserEditTrip(tripId, user.id)))
    return NextResponse.json({ error: "アクセス不可" }, { status: 403 });

  const { error } = await supabase.from("shopping_items").delete().eq("id", itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
