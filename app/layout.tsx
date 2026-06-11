import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const lineSeed = localFont({
  src: [
    { path: "../public/fonts/LINESeedJP_OTF_Th.woff2", weight: "100" },
    { path: "../public/fonts/LINESeedJP_OTF_Rg.woff2", weight: "400" },
    { path: "../public/fonts/LINESeedJP_OTF_Bd.woff2", weight: "700" },
    { path: "../public/fonts/LINESeedJP_OTF_Eb.woff2", weight: "800" },
  ],
  variable: "--font-line-seed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "たびおり",
  description: "AIがつくる、あなただけの旅のしおり",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${lineSeed.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
