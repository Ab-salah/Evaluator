import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const zain = localFont({
  src: [
    { path: "./fonts/Zain_Light.ttf", weight: "300", style: "normal" },
    { path: "./fonts/Zain_Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Zain_Bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/Zain_ExtraBold.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-zain",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Visibility Evaluator", template: "%s · Visibility Evaluator" },
  description: "Reseller shop visibility audits, scored against the Visibility Matrix",
  appleWebApp: { capable: true, title: "Visibility", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#281f51",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={zain.variable}>
      <body className="min-h-dvh bg-canvas font-sans text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
