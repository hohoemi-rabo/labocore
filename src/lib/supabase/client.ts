import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Client Components 用。createBrowserClient は内部で singleton を返すため、
// 何度呼んでもブラウザ上のインスタンスは 1 つ。
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
