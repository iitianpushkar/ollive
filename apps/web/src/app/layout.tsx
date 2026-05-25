import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ollive — LLM Inference Logging",
  description: "Chatbot with lightweight inference logging and observability",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
