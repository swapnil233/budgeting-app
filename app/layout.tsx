import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Budgeting App",
  description: "Budget your monthly expenses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
