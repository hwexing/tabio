import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  if (!idToken) {
    return NextResponse.json({ error: "idToken が必要です" }, { status: 400 });
  }

  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json(
      { error: "LINE_CHANNEL_ID が設定されていません" },
      { status: 500 }
    );
  }

  // 1. LINEの検証エンドポイントでidTokenを検証
  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });

  if (!verifyRes.ok) {
    return NextResponse.json(
      { error: "idToken の検証に失敗しました" },
      { status: 401 }
    );
  }

  const payload = await verifyRes.json();

  // 2. audの照合
  if (payload.aud !== channelId || !payload.sub) {
    return NextResponse.json(
      { error: "idToken が不正です" },
      { status: 401 }
    );
  }

  const lineUserId: string = payload.sub;
  const displayName: string = payload.name ?? "";
  const pictureUrl: string = payload.picture ?? "";

  // 3. usersにupsert
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        line_user_id: lineUserId,
        display_name: displayName,
        picture_url: pictureUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "line_user_id" }
    )
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "ユーザーの保存に失敗しました" },
      { status: 500 }
    );
  }

  // 4. JWTセッションをHTTP-only Cookieにセット
  await createSession(data.id);

  return NextResponse.json({ ok: true });
}
