import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "@/components/layout/AppNav";

export const metadata: Metadata = {
  title: "Men's Club Dashboard",
  description: "Handicap auditing and scoring analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen bg-gray-100">
          <AppNav />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}