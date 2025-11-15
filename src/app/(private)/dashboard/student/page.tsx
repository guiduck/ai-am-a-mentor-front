import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import StudentDashboardClient from "./_components/StudentDashboardClient";
import type { User } from "@/stores/authStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentDashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const userRole = cookieStore.get("user_role")?.value;

  console.log("[dashboard/student] server entry", {
    hasToken: Boolean(accessToken),
    userRole: userRole ?? "none",
  });

  if (!accessToken || userRole !== "student") {
    console.warn("[dashboard/student] redirecting to /login", {
      reason: !accessToken ? "missing token" : `role=${userRole}`,
    });
    redirect("/login");
  }

  const userDataCookie = cookieStore.get("user_data")?.value;
  const initialUser = userDataCookie ? (JSON.parse(userDataCookie) as User) : null;

  console.log("[dashboard/student] initialUser source", {
    fromCookie: Boolean(initialUser),
  });

  return <StudentDashboardClient initialUser={initialUser} />;
}
