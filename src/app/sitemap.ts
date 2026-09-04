import type { MetadataRoute } from "next";

import { getServerEnvironment } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const { SITE_URL } = getServerEnvironment();
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    {
      url: `${SITE_URL}/environment`,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/objects`,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/approaches`,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/methodology`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
