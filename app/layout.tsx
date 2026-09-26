import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "NOVA — Technology, designed differently.", template: "%s · NOVA" },
  description: "Premium smartphones, laptops, audio, wearables, gaming and desk-setup gear. Genuine products, GST invoice and free delivery across India.",
  keywords: ["premium gadgets", "smartphones", "laptops", "headphones", "smartwatch", "mechanical keyboard", "India"],
  openGraph: { type: "website", siteName: "NOVA", title: "NOVA — Technology, designed differently.", description: "Discover products that make everyday life better.", images: ["/og.jpg"], locale: "en_IN" },
  twitter: { card: "summary_large_image", title: "NOVA", description: "Technology, designed differently." },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#08090B", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster
          theme="dark"
          position="bottom-center"
          offset={88}
          mobileOffset={88}
          toastOptions={{ classNames: { toast: "!bg-[#15171D] !border-white/10 !text-white !rounded-2xl", description: "!text-[#8B8F98]", actionButton: "!bg-white !text-black !rounded-full" } }}
        />
      </body>
    </html>
  );
}
