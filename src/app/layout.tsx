import type { Metadata, Viewport } from "next";
import { Anton, Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({ variable: "--font-open-sans", subsets: ["latin"] });
const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Race Buddy", template: "%s · Race Buddy" },
  description: "Lost your race partner? Find a new one. The partner finder for doubles and relay fitness races.",
  appleWebApp: { capable: true, title: "Race Buddy", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${openSans.variable} ${anton.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
