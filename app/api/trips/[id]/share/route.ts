import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase-server";
import { createShareToken } from "@/lib/share-token";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await params;

  const { data: trip } = await supabase
    .from("trips")
    .select("id, owner_id")
    .eq("id", id)
    .single();

  if (!trip) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (trip.owner_id !== user.id)
    return NextResponse.json({ error: "権限なし" }, { status: 403 });

  const shareToken = await createShareToken(id);
  return NextResponse.json({ shareToken });
}
