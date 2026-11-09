import BrandLogo from "./BrandLogo";
import SiteFooter, { StoreLinks, SiteLink } from "./SiteFooter";
import { appPath } from "../lib/paths";
import { publicPageLinks, publicSite } from "../../../packages/product/public-site";
import type { PublicPage } from "../../../packages/product/public-site";

const documents = {
  terms: [
    ["About GLAM Beauty", "GLAM Beauty is operated by Zanzu Technologies Inc., Delaware, United States. These draft terms cover the personal experience and its web access. Business services may require separate agreements and approval."],
    ["Your account and permissions", "Use accurate account details and protect your sign-in methods. Use only photos and content you have permission to share. An account, role selection or business application does not automatically grant merchant, professional or administrator access."],
    ["AI and personal styling", "AI styling is informational, may be inaccurate and is not medical advice or a diagnosis. Availability varies while services are prepared for release. Review uncertainty, correct inaccurate information and use your own judgment. GLAM Beauty does not offer attractiveness ratings."],
    ["Photos and content", "Device-only photo preview is separate from upload or AI-processing permission. Enabled processing requires the relevant consent and eligibility checks. Do not upload unlawful content or other people's private information without permission."],
    ["Shopping and bookings", "Verified product, merchant, stock, service, price and fulfillment information must be presented before an order or booking is accepted. Feature previews and illustrative looks are not offers or confirmed transactions. Review the applicable seller, shipping, cancellation and refund terms before paying."],
    ["Fair use", "Do not impersonate others, bypass access controls, misrepresent products, harass people or use the service unlawfully. Reports of misuse can be sent through our Contact page."],
    ["Questions and changes", "Contact hello@glamit.beauty with questions about these terms. The final effective date, contract details and any jurisdiction-specific terms will be set after operator review. This draft does not activate a new agreement or change existing financial or account rules."],
  ],
  "privacy-policy": [
    ["Who is responsible", "GLAM Beauty is operated by Zanzu Technologies Inc. Contact hello@glamit.beauty for privacy questions or requests."],
    ["Information you provide", "Depending on the features you use, information may include account/contact details, preferences, photos, styling briefs, saved looks, analysis results, order or booking information, and support correspondence. Feature availability and the information required should be explained before submission."],
    ["Photos and AI processing", "A local photo preview does not by itself authorize upload, facial analysis or sharing. Enabled upload and AI features require their separate notices, consent and eligibility checks. AI observations can be uncertain and should not be treated as medical findings or identity recognition."],
    ["Why information is used", "Information is used to provide the features you request, maintain account security, manage authorized business activity and respond to support/privacy requests. Private facial information must not be used for advertiser targeting."],
    ["Service providers", "Hosting, authentication, storage, AI and payment providers may process information for enabled services. Provider recipients, processing regions and applicable retention terms must be confirmed in the final policy and relevant feature notices. AI-processing permission is separate from optional marketing choices."],
    ["Storage and retention", "Device preferences and server records have different lifecycles. Private-media and analysis retention depends on the enabled feature and its reviewed policy; choosing a preview is not consent to indefinite storage. Clearing device data does not automatically delete server records. Provider and backup retention require separate treatment."],
    ["Your choices and requests", "Use Privacy & data controls for available device/photo controls. You can request information, correction, access, export or deletion by emailing hello@glamit.beauty. We may need to verify identity before acting. An email request is not an instant automated export or deletion, and applicable rights depend on your location."],
    ["Children and eligibility", "Image processing is subject to eligibility checks. Guardian/minor workflows must be qualified before they are offered. Do not submit another person's private image without the required permission."],
  ],
  cookies: [
    ["Device storage and cookies", "GLAM Beauty may use browser/device storage for essential operation and preferences you choose to remember. Sign-in/session behavior is governed by the available authentication flow. Local preferences are different from server-side account data."],
    ["Your controls", "Use Privacy & data controls to review the controls currently available, and your browser settings to inspect or clear stored website data. Clearing browser data may remove preferences or sign you out; it does not erase server records."],
    ["Optional tracking", "Optional analytics, advertising cookies and similar technologies need an accurate inventory, notice and any required consent before activation. Social icons do not load social-network embeds or tracking scripts on this page. Contact hello@glamit.beauty with questions."],
  ],
  returns: [
    ["Before purchasing", "Check the verified seller, product variant, availability, total price, delivery destination and applicable return/refund terms before confirming payment. Preview products and unavailable checkout controls do not create an order."],
    ["Orders and returns", "For an accepted order, retain the order reference and contact hello@glamit.beauty if you need help with a cancellation, damaged/incorrect item or refund request. Do not send card details or account passwords by email."],
    ["Terms that must be confirmed", "Seller responsibilities, return windows, shipping charges, refund timing and location-specific consumer rights must be finalized and shown before live marketplace checkout is enabled. This draft does not promise a particular return period or activate live payments."],
  ],
} as const;

export default function PublicInformationPage({ section, onNavigate }: { section: PublicPage; onNavigate?: (path: string) => void }) {
  const title = publicPageLinks.find(p => p.slug === section)!.label;
  const document = section in documents ? documents[section as keyof typeof documents] : null;
  return <div className="public-information">
    <a className="skip-link" href="#public-content">Skip to content</a>
    <header className="public-information-header"><SiteLink to="/" label="GLAM Beauty home" onNavigate={onNavigate}><BrandLogo/></SiteLink><nav aria-label="Public navigation"><SiteLink to="/get-app" onNavigate={onNavigate}>Get the GLAM app</SiteLink><SiteLink to="/business" onNavigate={onNavigate}>For business</SiteLink></nav></header>
    <main id="public-content" className="public-information-main" tabIndex={-1}>
      <p className="public-eyebrow">GLAM BEAUTY</p><h1>{title}</h1>
      {document && <><div className="public-review-note"><strong>Draft for operator review</strong><p>This legal document has not yet received final operator approval. For current questions or requests, contact <a href={"mailto:" + publicSite.email}>{publicSite.email}</a>.</p></div>{document.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}<p><a href={appPath("/privacy")}>Open Privacy & data controls</a></p></>}
      {section === "contact" && <>
        <p className="public-lead">A question about GLAM Beauty, your account or your business? Get in touch.</p>
        <section><h2>Email us</h2><a className="public-contact-email" href={"mailto:" + publicSite.email}>{publicSite.email}</a><p>Use this address for customer support, privacy requests, merchant/professional enquiries and partnerships. Do not email passwords, payment-card details or private photos.</p></section>
        <section><h2>Our company</h2><p>GLAM Beauty is operated by {publicSite.operator}, {publicSite.jurisdiction}. For additional company details, contact us by email.</p></section>
        <section id="social"><h2>Official social channels</h2><p>Instagram, TikTok, YouTube, Facebook and Pinterest profiles will be linked here when confirmed. We do not direct you to unverified accounts.</p></section>
        <section><h2>Business access</h2><p>Advertisers, merchants, professionals, creators and partners can use the desktop business portal.</p><a className="public-primary-link" href={appPath("/business/login")}>Business sign in</a></section>
      </>}
      {section === "get-app" && <>
        <p className="public-lead">Your everyday beauty and style companion, designed for iOS and Android.</p>
        <section id="availability"><h2>Mobile apps are coming soon</h2><p>We’re preparing GLAM Beauty for the App Store and Google Play. Download links will appear here when the apps are published.</p><StoreLinks informationOnly/><p>In the meantime, continue exploring on the web. Account, privacy and support access remains available without installing an app.</p><a className="public-primary-link" href={appPath("/analyze")}>Continue exploring on the web</a></section>
        <section><h2>Built around your daily routine</h2><p>We’re bringing analysis, AI Studio, personal styling, saved looks and discovery together in the mobile app. Availability depends on each feature’s release and verification.</p></section>
        <section><h2>Running a business?</h2><p>Business workspaces stay on the web for advertisers, merchants, administrators and other roles that need desktop tools.</p><a href={appPath("/business")}>Open the business portal</a></section>
      </>}
      {section === "accessibility" && <>
        <p className="public-lead">GLAM Beauty should be usable across devices and with assistive technology.</p>
        <section><h2>Accessible alternatives</h2><p>You can use the web for account access, privacy choices and support without downloading the app. App promotion must not block those journeys.</p></section>
        <section><h2>Tell us about a barrier</h2><p>Email <a href={"mailto:" + publicSite.email + "?subject=Accessibility%20support"}>{publicSite.email}</a> with the page, device/browser and the difficulty you encountered. Please avoid including sensitive photos or account credentials.</p><p>We are still testing accessibility across web and native platforms. This page does not claim full conformance or completed device certification.</p></section>
      </>}
    </main><SiteFooter onNavigate={onNavigate}/>
  </div>;
}
