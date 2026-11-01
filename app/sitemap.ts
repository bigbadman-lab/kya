import type { MetadataRoute } from "next";

const routes = ["", "/agents", "/network", "/register", "/identity", "/verify", "/developers", "/docs", "/about", "/dashboard"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://knowyouragent.fun${route}`,
    changeFrequency: route === "" || route === "/agents" || route === "/network" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
