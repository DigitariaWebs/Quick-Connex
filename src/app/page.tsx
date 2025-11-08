"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useSession();

  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) {
      return;
    }

    // If user is authenticated, redirect to appropriate dashboard
    if (user) {
      const redirectPath =
        user.userType === "admin" || user.userType === "super_admin"
          ? "/admin/dashboard"
          : "/dashboard";
      router.replace(redirectPath);
      return;
    }

    // If user is not authenticated, redirect to login
    router.replace("/login");
  }, [user, isLoading, router]);

  // Show loading spinner while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
        <p className="mt-6 text-gray-700 text-lg font-medium">
          {isLoading ? "Loading..." : "Redirecting..."}
        </p>
      </div>
    </div>
  );
}
