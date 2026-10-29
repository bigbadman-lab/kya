import type { MetadataRoute } from "next";

const routes = ["", "/agents", "/register", "/identity", "/verify", "/developers", "/docs", "/about", "/dashboard"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://knowyouragent.fun${route}`,
    changeFrequency: route === "" || route === "/agents" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
