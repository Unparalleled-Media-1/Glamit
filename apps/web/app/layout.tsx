import type { Metadata, Viewport } from "next";
import "./styles.css";
import "./golden-tokens.css";
import "./golden-screens.css";
import "./personal-results.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export const metadata: Metadata = {
  title: "GLAM AI",
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
