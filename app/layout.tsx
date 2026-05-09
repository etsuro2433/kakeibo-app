import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DataProvider } from "@/components/DataProvider";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "家計簿アプリ",
  description: "シンプルでクリーンな家計簿・収支管理アプリ",
  applicationName: "家計簿",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "家計簿",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen font-sans antialiased">
        <DataProvider>
          <div className="min-h-screen flex flex-col">
            <Nav />
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
            <footer className="text-center text-xs text-slate-400 py-6">
              データはこのブラウザ内 (LocalStorage) に保存されます
            </footer>
          </div>
        </DataProvider>
      </body>
    </html>
  );
}
