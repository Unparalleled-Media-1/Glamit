import BrandLogo from "./BrandLogo";
import PublicIcon from "./PublicIcons";
import { appPath } from "../lib/paths";
import { businessPageLinks, publicPageLinks, publicSite } from "../../../packages/product/public-site";
import type { MouseEvent, ReactNode } from "react";
import "../app/public-site.css";

/** Preserve the existing in-memory Auth handoff; modified clicks keep normal link behavior. */
export function SiteLink({ to, children, onNavigate, className, label }: { to: string; children: ReactNode; onNavigate?: (path: string) => void; className?: string; label?: string }) {
  return <a href={appPath(to)} className={className} aria-label={label} onClick={(event: MouseEvent<HTMLAnchorElement>) => {
    if (onNavigate && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onNavigate(to); }
  }}>{children}</a>;
}

export function StoreLinks({ informationOnly = false, onNavigate }: { informationOnly?: boolean; onNavigate?: (path: string) => void }) {
  return <div className="public-store-links">{(["ios", "android"] as const).map(platform => {
    const url = platform === "ios" ? publicSite.iosUrl : publicSite.androidUrl;
    const title = platform === "ios" ? "App Store" : "Google Play";
    const contents = <><PublicIcon name={platform}/><span><small>{url ? "Get GLAM Beauty on" : "Coming soon on"}</small><strong>{title}</strong></span></>;
    return informationOnly && !url ? <span key={platform} className="public-store-link public-store-pending">{contents}</span> : url ?
      <a key={platform} className="public-store-link" href={url} target="_blank" rel="noopener noreferrer">{contents}</a> :
      <SiteLink key={platform} className="public-store-link" to="/get-app" onNavigate={onNavigate}>{contents}</SiteLink>;
  })}</div>;
}

export default function SiteFooter({ dark = false, onNavigate, onPrivacy, showBusinessRegistration = true }: { dark?: boolean; onNavigate?: (path: string) => void; onPrivacy?: () => void; showBusinessRegistration?: boolean }) {
  return <footer className={`site-footer public-footer${dark ? " public-footer-dark" : ""}`}>
    <div className="public-footer-grid">
      <div className="public-footer-brand">
        <a className="brand" href={appPath("/")} aria-label="GLAM Beauty home"><BrandLogo dark={dark}/></a>
        <p>Your everyday beauty and style companion. Made for mobile.</p>
        <a href={"mailto:" + publicSite.email}>{publicSite.email}</a>
      </div>
      <nav aria-label="Legal and help"><h2>Legal & help</h2>{publicPageLinks.filter(p => p.slug !== "get-app").map(p => <SiteLink key={p.slug} to={"/" + p.slug} onNavigate={onNavigate}>{p.label}</SiteLink>)}<SiteLink to="/privacy" onNavigate={onPrivacy ? () => onPrivacy() : onNavigate}>Privacy & data controls</SiteLink></nav>
      <nav aria-label="Business workspaces"><h2>For business</h2><SiteLink to="/business" onNavigate={onNavigate}>Business portal</SiteLink>{showBusinessRegistration && <SiteLink to="/business/register" onNavigate={onNavigate}>Register your business</SiteLink>}{businessPageLinks.map(page => <SiteLink key={page.slug} to={"/" + page.slug} onNavigate={onNavigate}>{page.label}</SiteLink>)}<SiteLink to="/admin" onNavigate={onNavigate}>Admin sign in</SiteLink></nav>
      <div><h2>Get the GLAM app</h2><p>iOS and Android apps are coming soon. Explore GLAM on the web while we prepare for release.</p><StoreLinks onNavigate={onNavigate}/><SiteLink to="/get-app" onNavigate={onNavigate}>App availability & web access</SiteLink>
        <h2 className="public-social-heading">Follow GLAM Beauty</h2>
        {!publicSite.social.some(s => s.url) && <p>Official social profiles coming soon.</p>}
        <ul className="public-social-list" aria-label="Social platforms">{publicSite.social.map(({ name, url }) => <li key={name}>{url ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`GLAM Beauty on ${name}`}><PublicIcon name={name}/><span className="sr-only">{name}</span></a> : <span role="img" title={`${name} — official profile coming soon`} aria-label={`${name} — official profile coming soon`}><PublicIcon name={name}/></span>}</li>)}</ul>
      </div>
    </div>
    <div className="public-footer-bottom"><span>© {new Date().getFullYear()} GLAM Beauty. Operated by {publicSite.operator}.</span><span>{publicSite.jurisdiction}</span></div>
  </footer>;
}

export function MobileAppPrompt({ onNavigate }: { onNavigate?: (path: string) => void }) {
  return <aside className="public-app-prompt" aria-label="GLAM mobile apps">
    <img src={appPath("/brand/app-icon.png").replace(/\/app\/brand\//, "/brand/")} alt="" width="48" height="48"/>
    <div><strong>Personal beauty, made for your phone.</strong><p>GLAM Beauty for iOS and Android is coming soon. Discover the app and keep exploring on the web.</p></div>
    <SiteLink to="/get-app" onNavigate={onNavigate}>Get the GLAM app <span aria-hidden="true">↗</span></SiteLink>
  </aside>;
}
