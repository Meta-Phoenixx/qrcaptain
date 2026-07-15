"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { AdminControlPanel } from "@/components/admin-control-panel";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function AdminGuard() {
  const router = useRouter();
  const currentUser = useQuery(api.users.currentUser);

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

  return <AdminControlPanel />;
}

export default function AdminPage() {
  return <AdminGuard />;
}
