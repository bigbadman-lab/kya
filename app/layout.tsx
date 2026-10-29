import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Urbanist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Providers } from "@/components/providers";

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
  openGraph: {
    title: "KYA — Know Your Agent",
    description,
    url: "https://knowyouragent.fun",
    siteName: "KYA",
    type: "website",
    images: [
      {
        url: "/kyamain.png",
        width: 600,
        height: 200,
        alt: "KYA, Know Your Agent",
      },
    ],
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
