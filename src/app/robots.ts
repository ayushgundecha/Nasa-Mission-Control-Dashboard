import type { MetadataRoute } from "next";

import { getServerEnvironment } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const { SITE_URL } = getServerEnvironment();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
