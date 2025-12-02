"use client";

import { FullPageLoading } from "@/components/ui/Loading/Loading";

export default function DashboardPage() {
  // This page should never be seen because middleware will redirect
  // to /dashboard/creator or /dashboard/student based on user role
  return <FullPageLoading text="Carregando dashboard..." />;
}
