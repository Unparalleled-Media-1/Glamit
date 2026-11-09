import { productName } from "../../../packages/product/brand";
import { siteOrigin } from "../../../packages/product/site";
import type { Metadata, Viewport } from "next";
import "./styles.css";
import "./golden-tokens.css";
import "./golden-screens.css";
import "./personal-results.css";
import "./authentication.css";
import "./public-site.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: productName,
  icons: {
    icon: [
      {
        url: "/brand/favicon.png?v=20261108",
        sizes: "256x256",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/brand/favicon.png?v=20261108",
        sizes: "256x256",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  applicationName: productName,
  description:
    "Understand your features. Discover your colors. Explore your look. Learn how to achieve it.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
