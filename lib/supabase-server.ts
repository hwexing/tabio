import "server-only";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// このクライアントは service role key を使っています。
// サーバー側（Route Handler / Server Action）からのみ使用してください。
// フロントエンド（クライアントコンポーネント）では絶対に使わないこと。
// RLSの厳密な設定は後続ステップで行います。
