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
  // signed in across visits. getUser() makes a network call to Supabase on every
  // request; if that call hangs, the whole Edge middleware would 504
  // (MIDDLEWARE_INVOCATION_TIMEOUT) and take the entire site down. Guard it with
  // a short timeout and, if auth is slow/unreachable, let the request through —
  // every protected page also enforces auth server-side, so nothing is exposed.
  let user = null;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("auth-timeout")), 2500)),
    ]);
    user = result?.data?.user ?? null;
  } catch {
    return response; // degrade gracefully instead of timing out the request
  }

  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const isAppSubdomain = host.startsWith("app.");

  // On the app subdomain, the root is the app — not the marketing page.
  if (isAppSubdomain && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/choose" : "/login";
    return NextResponse.redirect(url);
  }

  // Public routes: the marketing landing, the terms page, the auth screens, and
  // the Stripe webhook. The webhook is called by Stripe with no login cookie, so
  // it must never be redirected to /login (a redirect makes Stripe mark the
  // delivery as failed and premium is never granted).
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/stripe/webhook");

  // Gate the app: signed-out users only reach public routes.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
