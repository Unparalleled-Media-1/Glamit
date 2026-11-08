# Authentication brand colour update

7 November 2026, Africa/Johannesburg. Visual implementation and UI regression evidence; no authentication provider was activated or reconfigured.

## Canonical theme

The source of truth is `packages/product/consumer-design.json`, exported as `apps/web/app/golden-tokens.css`. This application uses scoped CSS, not Tailwind. Neither the canonical palette nor the existing Home, Analysis, Studio, Shop or Product visual systems was changed.

| Use | Existing token | Actual value |
|---|---|---|
| Full login background; native auth cards | `palette.ivory` / `--glam-palette-ivory` | `#F8F3EF` |
| Web card and input surfaces | `palette.white` | `#FFFCFA` |
| SMS/OTP and native biometric primary actions; focus rings | `palette.rose` | `#B76D8C` |
| Text on rose primary actions | `palette.charcoal` | `#181719` |
| Headlines and main text | `palette.ink` | `#30252D` |
| Links, guest outline, secondary native controls | `palette.mauve` | `#78546C` |
| Selected options and secondary/disabled backgrounds | `palette.blush` | `#F6C6D8` |
| Decorative card/divider borders | `palette.line` | `#DFD1D5` |
| Secondary text and visible interactive field borders | `palette.muted` | `#786772` |
| Display/body fonts | `fonts.display`, `fonts.body` | Georgia/serif; Arial/sans-serif |
| Corners | `radius.control`, `radius.card`, `radius.sheet` | 24 / 20 / 28 px |

Rose with charcoal text has **4.75:1** contrast; white text on the existing rose would only achieve **3.68:1**. Mauve links against ivory achieve **5.80:1**. Interactive fields use a stronger existing neutral stroke, with rose focus accents. Provider buttons, SMS and guest action have equal widths and 52px heights on desktop and mobile web.

Provider identity colours are intentionally outside the GLAM palette: Google's original four-colour G on white, white Apple on black, and white Facebook f against `#0866FF`. Google uses a neutral `#747775` border and `#1F1F1F` text. Mark geometry and source references are documented in [the asset README](../../packages/auth/marks/README.md); [hashes](branding-evidence/asset-hashes.json) pin the retrieved snapshots. Official current guideline pages were not independently fetched because their hosts are outside the applied network policy; this is a custom Supabase OAuth treatment, not provider-issued SDK widgets or a branding certification.

## Scope and behaviour

- The shared web auth surface covers sign-in/SMS registration, OTP, optional legacy login, change-phone/recovery controls and account linking.
- Unavailable SMS and social methods are hidden; zero configured social methods produces no orphan separator. Partial configuration displays only available methods. An unavailable-service notice, existing-account option and guest exploration remain honest alternatives.
- Configured provider buttons retain their own colours during busy states. GLAM actions use rose; guest access stays secondary.
- Native auth cards, OTP, biometric opt-in/unlock and existing recovery/fallback controls use the same palette, spacing and corner tokens. Native provider images derive from the same vector geometry as web. The secure OS biometric dialog remains system-owned.
- The app currently fixes its global colour scheme to light. This preserves cream authentication; it does not introduce a new global dark-mode setting or alter the existing dark product experiences.
- No full lost-all-methods recovery feature was added. Existing recovery and biometric limitations remain as documented in the functional audit.
- Supabase handlers, PKCE, OTP verification, linking proof, session memory and secure storage are unchanged. Token-level comparison against the base commit found 14 existing authentication handler bodies unchanged: [evidence](branding-evidence/auth-handler-parity.json).

## Validation and screenshots

- Branding regression: desktop, 390px mobile and 320px compact-mobile equality of button dimensions, exact provider treatments, automated WCAG checks, OTP/autofill/E.164 handoff, Google/Apple/Facebook S256 redirects, all-disabled and partially configured visibility.
- Existing hosted-account regression passed: code request/expiry, resend, verification, profile persistence/navigation, memory-only session, logout and legacy login. These tests use isolated transport doubles, not real delivery.
- Web/mobile type checks, Next production build, eight cPanel route checks including guest navigation, SSR hydration regression, 13 existing application browser groups, golden-pattern invariants and native session-gate tests passed.
- iOS and Android Metro exports passed. No physical iOS/Android device or biometric UI verification is claimed.

Screenshots are preserved in [branding evidence](branding-evidence/) and `/workspace/artifacts/glam-auth-branding`:

- `auth-branding-preview-desktop.png` and `auth-branding-preview-mobile.png`: **configured-method UI previews**, visibly watermarked. Provider settings are simulated in the test harness; no live sign-in is performed.
- `auth-branding-preview-compact-mobile.png`: the same treatment verified at 320px.
- `auth-branding-otp-mobile.png`: synthetic OTP-entry preview; the displayed code is not submitted.
- `auth-branding-unconfigured-desktop.png` and `auth-branding-unconfigured-mobile.png`: unavailable-method UI state, with hidden actions.

The update adds no migration, payment change, credential, Supabase configuration change or public deployment. [Raw UI checks](branding-evidence/ui-regression.json).
