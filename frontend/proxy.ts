import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const roleRoutes: Record<string, string> = {
  client: "/client/dashboard",
  coach: "/coach/dashboard",
  club_owner: "/club-owner/dashboard",
  admin: "/admin/dashboard",
};

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";

    return NextResponse.redirect(loginUrl);
  }

  // Get user's role from profiles table
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // If we can't find the user's profile/role,
  // don't allow access to a protected dashboard.
  if (error || !profile?.role) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";

    return NextResponse.redirect(homeUrl);
  }

  const userRole = profile.role;

  // Determine which dashboard the user is trying to access
  let requestedRole: string | null = null;

  if (request.nextUrl.pathname.startsWith("/client/dashboard")) {
    requestedRole = "client";
  } else if (
    request.nextUrl.pathname.startsWith("/coach/dashboard")
  ) {
    requestedRole = "coach";
  } else if (
    request.nextUrl.pathname.startsWith("/club-owner/dashboard")
  ) {
    requestedRole = "club_owner";
  } else if (
    request.nextUrl.pathname.startsWith("/admin/dashboard")
  ) {
    requestedRole = "admin";
  }

  // Authorization check
  if (requestedRole && userRole !== requestedRole) {
    const correctDashboard = roleRoutes[userRole];

    // If the role is valid, send the user to their own dashboard
    if (correctDashboard) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = correctDashboard;

      return NextResponse.redirect(dashboardUrl);
    }

    // Unknown role
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";

    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/client/dashboard/:path*",
    "/coach/dashboard/:path*",
    "/club-owner/dashboard/:path*",
    "/admin/dashboard/:path*",
  ],
};