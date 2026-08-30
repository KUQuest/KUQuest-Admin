import type { Metadata } from "next";
import Script from "next/script";
import "./styles.css";

export const metadata: Metadata = {
  title: {
    default: "KuQuest Admin",
    template: "%s · KuQuest Admin",
  },
  description: "KuQuest university gig marketplace administration console",
};

const themeBootstrap = `
(() => {
  try {
    const theme = localStorage.getItem("kuquest-admin-theme");
    if (theme === "green" || theme === "dark") {
      document.documentElement.dataset.theme = theme;
      document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", theme === "dark" ? "dark" : "light");
    }
  } catch {}
})();
`;

const languageBootstrap = `
(() => {
  try {
    const language = localStorage.getItem("kuquest-admin-language");
    if (language === "th") {
      document.documentElement.lang = "th";
      document.documentElement.dataset.language = "th";
    }
  } catch {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {themeBootstrap}
        </Script>
        <Script id="language-bootstrap" strategy="beforeInteractive">
          {languageBootstrap}
        </Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- mirrors the source app's Figtree font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
