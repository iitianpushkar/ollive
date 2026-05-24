import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ollive AI",
  description: "Cinematic AI observability platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="relative min-h-screen overflow-hidden antialiased">
        <div className="orb orb-1" />
        <div className="orb orb-2" />

        {children}
      </body>
    </html>
  );
}