"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Prevent multiple simultaneous auth checks
    if (hasChecked) return;

    const checkAuth = async () => {
      try {
        setIsChecking(true);

        // Use server-side verification instead of localStorage
        const response = await fetch("/api/auth/verify", {
          method: "GET",
          credentials: "include", // Include cookies in request
        });

        if (response.ok) {
          const data = await response.json();

          if (data.success && data.user) {
            // Redirect based on user type from server response
            const redirectPath =
              data.user.userType === "admin" ||
              data.user.userType === "super_admin"
                ? "/admin/dashboard"
                : "/dashboard";

            console.log(
              `✅ Redirecting ${data.user.userType} to ${redirectPath}`
            );
            router.replace(redirectPath); // Use replace instead of push to avoid history issues
            return;
          }
        }

        // If we get here, user is not authenticated
        console.log("❌ User not authenticated, redirecting to login");
        router.replace("/login"); // Use replace instead of push
      } catch (error) {
        console.error("❌ Auth check failed:", error);
        // On error, redirect to login
        router.replace("/login"); // Use replace instead of push
      } finally {
        setIsChecking(false);
        setHasChecked(true);
      }
    };

    checkAuth();
  }, [router, hasChecked]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
        <p className="mt-6 text-gray-700 text-lg font-medium">
          {isChecking ? "Verifying authentication..." : "Redirecting..."}
        </p>
        <p className="mt-2 text-gray-500 text-sm">
          Please wait while we check your session
        </p>
      </div>
    </div>
  );
}
