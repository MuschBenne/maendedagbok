/**
 * Genererar /robots.txt.
 *
 * Säger åt alla sökmotorer att inte indexera något. Dagboken är privat.
 */
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
