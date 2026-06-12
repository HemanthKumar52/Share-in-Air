import type { MetadataRoute } from "next";

const SITE_URL = "https://share-in-air.vercel.app";

const paths = [
  "/",
  "/how-to-share-screen-over-wifi",
  "/airdrop-for-web",
  "/faq",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return paths.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
