import { createServerClient } from "@supabase/ssr";

// Compiler-safe representations of NextRequest and NextResponse for standard client-side compilers
export interface NextRequestLike {
  headers: any;
  cookies: {
    getAll: () => any[];
    set: (name: string, value: string) => void;
  };
}

export class NextResponseLike {
  static next(options?: any) {
    return new NextResponseLike();
  }
  cookies = {
    set: (name: string, value: string, options?: any) => {}
  };
}

const supabaseUrl = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) || "https://ixbykqkakmsihnqwkvhq.supabase.co";
const supabaseKey = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) || "sb_publishable_DxSQUM2dsjVNOQ3BXbCAHg_bYOv8U_R";

export const createClient = (request: NextRequestLike) => {
  // Create an unmodified response
  let supabaseResponse = NextResponseLike.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => 
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponseLike.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  return supabaseResponse;
};
