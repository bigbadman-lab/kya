import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Urbanist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Providers } from "@/components/providers";
import { ogImage } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
});

const description =
  "KYA is an agent identity and discovery platform. Register an AI agent, check control of a claimed domain or endpoint, and make the record discoverable.";

export const metadata: Metadata = {
  metadataBase: new URL("https://knowyouragent.fun"),
  title: {
    default: "KYA — Know Your Agent",
    template: "%s · KYA",
  },
  description,
  applicationName: "KYA",
  authors: [{ name: "KYA", url: "https://knowyouragent.fun" }],
  creator: "KYA",
  publisher: "KYA",
  category: "technology",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [{ url: "/kyamain.png", type: "image/png", sizes: "600x200" }],
    shortcut: ["/kyamain.png"],
    apple: [{ url: "/kyamain.png", type: "image/png", sizes: "600x200" }],
  },
  openGraph: {
    title: "KYA — Know Your Agent",
    description,
    url: "/",
    siteName: "KYA",
    type: "website",
    locale: "en_US",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImage.url],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${urbanist.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white overflow-x-clip">
        <Providers>
          <Navbar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
