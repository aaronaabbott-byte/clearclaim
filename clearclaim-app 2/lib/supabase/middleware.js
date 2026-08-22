// Edge-safe session refresh for the Next.js App Router.
// Only imports from @supabase/ssr and next/server, so it compiles as an Edge
// middleware without pulling in unsupported Node modules.
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the auth token and rewrites the cookies so the parent stays
  // signed in across visits. Do not run other logic between here and return.
  const { data: { user } } = await supabase.auth.getUser();

  // Gate the app: signed-out users only reach /login and /auth.
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname.startsWith("/login") || pathname.startsWith("/auth");
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
