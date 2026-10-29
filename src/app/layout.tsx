import type { Metadata, Viewport } from "next";
import { Mona_Sans } from "next/font/google";
import { brand } from "@/design/brand";
import { colors } from "@/design/tokens";
import "./globals.css";

// One variable family; the width axis gives the wide display style (see src/design/tokens.ts).
const monaSans = Mona_Sans({ variable: "--font-mona-sans", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.description,
  appleWebApp: { capable: true, title: brand.name, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: colors.bg,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${monaSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
