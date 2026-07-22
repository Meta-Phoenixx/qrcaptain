"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { AdminControlPanel } from "@/components/admin-control-panel";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function AdminGuard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useQuery(api.users.currentUser);
  const initialTab = searchParams.get("tab") as any ?? "overview";

  useEffect(() => {
    if (currentUser !== undefined && (!currentUser || currentUser.role !== "admin")) {
      router.replace("/home");
    }
  }, [currentUser, router]);

  if (currentUser === undefined || !currentUser || currentUser.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-captain-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <AdminControlPanel initialTab={initialTab} />;
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminGuard />
    </Suspense>
  );
}
