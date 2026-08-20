import type { Metadata } from "next";
import { Ubuntu, Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./providers";
import { ThemeWrapper } from "../components/ui/theme-wrapper";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ubuntu",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "QR Captain - Vessel Maintenance Tracking",
  description:
    "Track and manage all maintenance work on your vessel with QR Captain",
  icons: {
    icon: "/qr-captain-logo.png",
    shortcut: "/qr-captain-logo.png",
    apple: "/qr-captain-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ubuntu.variable} ${inter.variable} antialiased`}>
        <ConvexClientProvider>
          <ThemeWrapper>
            {children}
          </ThemeWrapper>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
