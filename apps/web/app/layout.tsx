import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = { title: "GLAM AI", description: "Understand your features. Discover your colors. Explore your look. Learn how to achieve it." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
