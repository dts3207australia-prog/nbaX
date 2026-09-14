import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NBA Draft Manager",
  description: "Category rankings and live draft board for fantasy NBA rotisserie leagues",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
