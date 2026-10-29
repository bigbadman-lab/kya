import type { Metadata } from "next";

export const ogImage = {
  url: "/kyameta.jpg",
  width: 1200,
  height: 630,
  alt: "KYA — Know Your Agent",
} as const;

export function pageMeta(page: { title: string; description: string; path: string }): Metadata {
  const branded = page.path === "/" ? "KYA — Know Your Agent" : `${page.title} · KYA`;
  const metadata: Metadata = {
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: {
      title: branded,
      description: page.description,
      url: page.path,
      siteName: "KYA",
      type: "website",
      locale: "en_US",
      images: [ogImage],
    },
  };
  if (page.path !== "/") metadata.title = page.title;
  return metadata;
}
