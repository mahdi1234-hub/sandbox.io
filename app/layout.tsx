import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOVERA AI - Intelligent Assistant",
  description: "AI-powered chat assistant with elegant design",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans font-light text-primary selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
