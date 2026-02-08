import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StudyProvider } from "@/context/StudyContext";
import { AnalyticsProvider } from "@/lib/analytics";
import { MobileBlocker } from "@/components/MobileBlocker";
import { Toaster } from "sonner";
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
        suppressHydrationWarning
      >
        <AnalyticsProvider>
          <StudyProvider>
            <MobileBlocker>
              <div className="min-h-screen flex flex-col">
                <div className="flex-1">
                  {children}
                </div>
                <footer className="py-4 px-4 text-center text-xs text-muted-foreground border-t border-border/40">
                  <p>&copy; {new Date().getFullYear()} MSU BioReD Hub &middot; Montana State University &middot; EIND 313: Work Design &amp; Analysis</p>
                </footer>
              </div>
              <Toaster richColors position="bottom-right" />
            </MobileBlocker>
          </StudyProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
