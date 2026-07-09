import { createServerClient } from "@supabase/ssr";

// Client-safe interface matching Next.js cookies() type for linter compatibility
export interface CookieStoreLike {
  getAll: () => any[];
  set: (name: string, value: string, options?: any) => void;
}

const supabaseUrl = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) || "https://ixbykqkakmsihnqwkvhq.supabase.co";
const supabaseKey = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) || "sb_publishable_DxSQUM2dsjVNOQ3BXbCAHg_bYOv8U_R";

export const createClient = (cookieStore: CookieStoreLike) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => 
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    },
  );
};
