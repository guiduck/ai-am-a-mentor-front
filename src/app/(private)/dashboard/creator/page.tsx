import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import CreatorDashboardClient from "./_components/CreatorDashboardClient";
import type { User } from "@/stores/authStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CreatorDashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const userRole = cookieStore.get("user_role")?.value;

  console.log("[dashboard/creator] server entry", {
    hasToken: Boolean(accessToken),
    userRole: userRole ?? "none",
  });

  if (!accessToken || userRole !== "creator") {
    console.warn("[dashboard/creator] redirecting to /login", {
      reason: !accessToken ? "missing token" : `role=${userRole}`,
    });
    redirect("/login");
  }

  const userDataCookie = cookieStore.get("user_data")?.value;
  const initialUser = userDataCookie
    ? (JSON.parse(userDataCookie) as User)
    : null;

  console.log("[dashboard/creator] initialUser source", {
    fromCookie: Boolean(initialUser),
  });

  return <CreatorDashboardClient initialUser={initialUser} />;
}
