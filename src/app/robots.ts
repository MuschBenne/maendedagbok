import type { MetadataRoute } from "next";

// Dagboken ska aldrig indexeras av sökmotorer.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
