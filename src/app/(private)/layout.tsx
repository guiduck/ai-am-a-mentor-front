import { ReactNode } from "react";
import { cookies } from "next/headers";
import { SessionTimeoutWatcher } from "@/components/security/SessionTimeoutWatcher";
import { PrivateNavigation } from "@/components/navigation/PrivateNavigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface PrivateLayoutProps {
  children: ReactNode;
}

export default async function PrivateLayout({ children }: PrivateLayoutProps) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value as
    | "creator"
    | "student"
    | undefined;

  const userDataCookie = cookieStore.get("user_data")?.value;
  let username: string | undefined;
  if (userDataCookie) {
    try {
      const parsed = JSON.parse(userDataCookie);
      username = parsed?.username;
    } catch (error) {
      console.error("[layout] erro ao ler user_data", error);
    }
  }

  return (
    <div className="min-h-screen bg-secondary">
      <SessionTimeoutWatcher />
      <PrivateNavigation role={role} username={username}>
        {children}
      </PrivateNavigation>
    </div>
  );
}
