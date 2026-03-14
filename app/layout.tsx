import type { Metadata } from "next";
import Providers from "./components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "MathViz — Math Concept Visualizer",
  description:
    "Describe a math concept in plain English and get a Manim animation plus a written explanation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('mathviz_theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
