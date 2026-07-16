import type { Metadata } from "next";
import { Fraunces, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const schibsted = Schibsted_Grotesk({
  variable: "--font-sans-fallback",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-serif-fallback",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nazrana",
  description: "Corporate gifting made easy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${schibsted.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
