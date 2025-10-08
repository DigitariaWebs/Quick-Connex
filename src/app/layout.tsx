import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SSEProvider } from "@/contexts/SSEContext";
import ServerConnectionLogger from '@/components/features/notifications/ServerConnectionLogger';
import SSEDebugger from '@/components/features/notifications/SSEDebugger';
// Remove startup logging from layout - not compatible with Vercel
// import { logApplicationStartup } from "@/lib/utils/startup-logger";

// Log application startup only in development
if (typeof window === "undefined" && process.env.NODE_ENV === "development") {
  // Only log in development, not in Vercel build
  console.log("🏥 PATIENTS MANAGEMENT SYSTEM - Development Mode");
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Patients Management System",
  description:
    "A modern web application for managing patients and healthcare staff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SSEProvider>
          <ServerConnectionLogger />
          <SSEDebugger />
          {children}
        </SSEProvider>
      </body>
    </html>
  );
}
