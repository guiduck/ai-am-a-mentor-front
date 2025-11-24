import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/landing", "/login", "/register", "/estetica"];

export function middleware(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  const userRole = req.cookies.get("user_role")?.value;
  const isPublicRoute = publicRoutes.includes(req.nextUrl.pathname);
  const pathname = req.nextUrl.pathname;

  console.log("[middleware] request", {
    pathname,
    hasToken: Boolean(token),
    userRole: userRole ?? "none",
    isPublicRoute,
  });

  // AUTHENTICATION: Redirect to login if no token and not on public route
  if (!token && !isPublicRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    console.log("[middleware] redirect -> /login (missing token)");
    return NextResponse.redirect(url);
  }

  // AUTHENTICATION: Redirect to dashboard if has token and on public route
  if (token && isPublicRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    console.log("[middleware] redirect authenticated user from public -> /dashboard");
    return NextResponse.redirect(url);
  }

  // ROLE-BASED ROUTING: Only if authenticated and has role
  if (token && userRole) {
    // Handle /dashboard redirect based on user role
    if (pathname === "/dashboard") {
      const url = req.nextUrl.clone();
      if (userRole === "creator") {
        url.pathname = "/dashboard/creator";
      } else if (userRole === "student") {
        url.pathname = "/dashboard/student";
      }
      console.log("[middleware] redirect /dashboard to", url.pathname);
      return NextResponse.redirect(url);
    }

    // Handle role-based routing protection
    if (pathname.startsWith("/dashboard/creator") && userRole !== "creator") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard/student";
      console.warn("[middleware] creator route blocked for role", userRole);
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/dashboard/student") && userRole !== "student") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard/creator";
      console.warn("[middleware] student route blocked for role", userRole);
      return NextResponse.redirect(url);
    }

    // Handle courses creation - only creators
    if (pathname.startsWith("/courses/create") && userRole !== "creator") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      console.warn("[middleware] /courses/create blocked for role", userRole);
      return NextResponse.redirect(url);
    }

    // Handle courses management - only creators
    if (pathname.startsWith("/courses/manage") && userRole !== "creator") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard/student";
      console.warn("[middleware] /courses/manage blocked for role", userRole);
      return NextResponse.redirect(url);
    }

    // Handle enrolled courses - only students
    if (pathname.startsWith("/courses/enrolled") && userRole !== "student") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard/creator";
      console.warn("[middleware] /courses/enrolled blocked for role", userRole);
      return NextResponse.redirect(url);
    }

    // Handle add video - only creators (ownership checked in component)
    if (pathname.includes("/add-video") && userRole !== "creator") {
      const url = req.nextUrl.clone();
      // Extract courseId from pathname and redirect to course page
      const courseIdMatch = pathname.match(/\/course\/([^/]+)/);
      if (courseIdMatch) {
        url.pathname = `/course/${courseIdMatch[1]}`;
      } else {
        url.pathname = "/courses";
      }
      console.warn("[middleware] /add-video blocked for role", userRole);
      return NextResponse.redirect(url);
    }

    // Handle edit video - only creators (ownership checked in component)
    if (pathname.includes("/edit-video") && userRole !== "creator") {
      const url = req.nextUrl.clone();
      // Extract courseId from pathname and redirect to course page
      const courseIdMatch = pathname.match(/\/course\/([^/]+)/);
      if (courseIdMatch) {
        url.pathname = `/course/${courseIdMatch[1]}`;
      } else {
        url.pathname = "/courses";
      }
      console.warn("[middleware] /edit-video blocked for role", userRole);
      return NextResponse.redirect(url);
    }
  }

  console.log("[middleware] allow request", pathname);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
