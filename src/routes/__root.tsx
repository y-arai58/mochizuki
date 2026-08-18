/// <reference types="vite/client" />
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Mark } from "../components/Mark";
import styles from "../lib/styles.css?url";
import { SANS, T, textLink, wrap } from "../lib/theme";
import { logout } from "../server/entries";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "望月 ｜ ありがとうの月" },
      { name: "description", content: "ありがとうを記録して、月を満ちさせる。" },
      { name: "theme-color", content: T.ivory },
      { property: "og:title", content: "望月" },
      { property: "og:description", content: "今月のありがとう、あと何個で満月。" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const leave = async () => {
    await logout();
    window.location.assign("/");
  };

  return (
    <RootDocument onLogout={leave}>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children, onLogout }: { children: ReactNode; onLogout: () => Promise<void> }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body style={{ background: T.ivory, color: T.charcoal, fontFamily: SANS, minHeight: "100vh" }}>
        <header style={{ ...wrap, paddingTop: 34 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 10,
              letterSpacing: "0.34em",
              color: T.warmGray,
            }}
          >
            <Link
              to="/"
              search={{ scope: "solo" }}
              style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}
              aria-label="望月 ホームへ"
            >
              <Mark size={20} />
              <span>MOCHIZUKI</span>
            </Link>
            <span style={{ flex: 1, height: 1, background: T.beige, maxWidth: 60 }} />
            <Link
              to="/"
              search={{ scope: "solo" }}
              style={textLink(false)}
              activeProps={{ style: textLink(true) }}
              activeOptions={{ exact: true }}
            >
              THIS MOON
            </Link>
            <Link
              to="/year"
              search={{ scope: "solo", year: new Date().getFullYear() }}
              style={textLink(false)}
              activeProps={{ style: textLink(true) }}
            >
              THE YEAR
            </Link>
            <button type="button" onClick={() => void onLogout()} style={{ ...textLink(false), border: "none", background: "none", padding: 0 }}>
              LOG OUT
            </button>
          </div>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
