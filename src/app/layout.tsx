import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wish Links",
  description: "Todos los links de lo que te querés comprar, en un solo lugar.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Wish Links", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#fafaf9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      {/* Las extensiones del navegador suelen inyectar atributos en el body
          antes de que React hidrate; sin esto, avisa de una diferencia que no
          es nuestra. Solo afecta a este nivel del árbol. */}
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
