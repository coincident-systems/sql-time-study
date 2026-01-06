import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StudyProvider } from "@/context/StudyContext";
import { AnalyticsProvider } from "@/lib/analytics";
import { MobileBlocker } from "@/components/MobileBlocker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SQL Time Study Lab | EIND 313",
  description: "Bozeman Deaconess Hospital Medication Delay Investigation - SQL Learning Lab",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <AnalyticsProvider>
          <StudyProvider>
            <MobileBlocker>
              {children}
            </MobileBlocker>
          </StudyProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
