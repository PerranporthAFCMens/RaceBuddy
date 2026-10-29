import type { MetadataRoute } from "next";
import { brand } from "@/design/brand";
import { colors } from "@/design/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: "Find a partner for doubles and relay fitness races.",
    start_url: "/browse",
    display: "standalone",
    background_color: colors.bg,
    theme_color: colors.bg,
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
