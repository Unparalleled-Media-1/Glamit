import type { SocialPlatform } from "../../../packages/product/public-site";

/** Recognizable provider/platform marks; accompanying text supplies the accessible name. */
export default function PublicIcon({ name }: { name: SocialPlatform | "ios" | "android" }) {
  const paths = {
    Instagram: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.2"/></>,
    TikTok: <path d="M15 2h3c.3 2 1.5 3.5 3.5 4v3a9 9 0 0 1-3.5-1v8a6 6 0 1 1-6-6h1v3a3 3 0 1 0 2 3V2Z"/>,
    YouTube: <><rect x="1" y="4.5" width="22" height="15" rx="4"/><path d="m10 8 6 4-6 4Z" fill="var(--public-mark-cutout, #fff)"/></>,
    Facebook: <path d="M14 22v-9h3l.5-4H14V6.8c0-1 .3-1.8 1.8-1.8H18V1.5a26 26 0 0 0-3-.2c-3 0-5 1.8-5 5V9H7v4h3v9Z"/>,
    Pinterest: <path d="M12 1a11 11 0 0 0-4 21c0-1 .1-2.4.4-3.6l1.5-6.2s-.4-.8-.4-2c0-1.9 1.1-3.3 2.5-3.3 1.2 0 1.7.9 1.7 1.9 0 1.2-.8 3-1.1 4.6-.3 1.3.6 2.4 1.9 2.4 2.3 0 3.9-3 3.9-6.5 0-2.7-1.8-4.7-5.1-4.7-3.7 0-6 2.8-6 5.9 0 1.1.3 1.9.8 2.5.2.3.2.4.2.7l-.3 1c-.1.4-.4.5-.8.3C5.1 14.1 4 12.2 4 9.8 4 6 7.2 2 13.2 2c4.9 0 8.1 3.5 8.1 7.2 0 5-2.8 8.7-7 8.7-1.4 0-2.8-.8-3.3-1.7l-.9 3.5c-.3 1.2-1 2.3-1.6 3.2A11 11 0 1 0 12 1Z"/>,
    ios: <path d="M16.6 3.8c.9-1.1.8-2.2.8-2.6-1.1.1-2.4.8-3.1 1.7-.8.8-1.1 1.8-1 2.8 1.2.1 2.4-.6 3.3-1.9ZM20.7 17c-.5 1.2-.8 1.8-1.5 2.9-.9 1.3-2.1 2.9-3.6 2.9-1.4 0-1.8-.9-3.8-.8-2 0-2.4.8-3.8.8-1.5 0-2.6-1.5-3.5-2.8C2 16.4 1.3 11.4 2.9 8.8c1.2-1.9 3.1-3 4.9-3 1.5 0 2.5.8 3.8.8s2.1-.8 3.8-.8c1.6 0 3.3.9 4.5 2.4-3.9 2.2-3.3 7.1.8 8.8Z"/>,
    android: <><path d="M3 2 14 12 3 22Z" fill="#00C4FF"/><path d="m3 2 14 8-3 2Z" fill="#00D26A"/><path d="m14 12 3 2L3 22Z" fill="#FF3B30"/><path d="m14 12 3-2 4 2-4 2Z" fill="#FFCE00"/></>,
  };
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor">{paths[name]}</svg>;
}
