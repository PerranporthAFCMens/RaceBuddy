import type { MetadataRoute } from "next";
import { brand } from "@/design/brand";
import { colors } from "@/design/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.shortName,
    description: "Find a partner for doubles and relay fitness races.",
    start_url: "/browse",
    display: "standalone",
    background_color: colors.bg,
    theme_color: colors.bg,
    // PNG icons so every phone shows the same picture (see docs/notes/2026-11-12-home-screen-icon.md).
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
