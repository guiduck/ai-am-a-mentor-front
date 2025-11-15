import { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface PrivateLayoutProps {
  children: ReactNode;
}

export default function PrivateLayout({ children }: PrivateLayoutProps) {
  return <div className="min-h-screen bg-secondary">{children}</div>;
}
