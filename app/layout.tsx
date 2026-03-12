import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "CT Expert & Cerberus Tutor",
  description: "Experto en Coiled Tubing y Tutor de Cerberus Modeling Software",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        {/* SEO Tags for simple static checkers */}
        {/* <title>CT Expert & Cerberus Tutor</title> */}
        {/* <meta name="description" content="Experto en Coiled Tubing y Tutor de Cerberus Modeling Software" /> */}
        {/* <meta property="og:title" content="CT Expert & Cerberus Tutor" /> */}
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
