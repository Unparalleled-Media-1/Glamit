import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = { title: "GLAM AI", description: "Beauty, hair and style, thoughtfully connected." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
