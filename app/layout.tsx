import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tavern",
  description: "A private place for your shared game library.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dev = process.env.NODE_ENV === "development";

  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body className="min-h-full flex flex-col dark">
        {dev && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed bottom-2 right-2 z-2147483647 select-none rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white opacity-70"
          >
            DEVELOPMENT
          </div>
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
