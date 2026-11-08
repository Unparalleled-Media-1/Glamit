# Exact GLAM Beauty artwork — installation blocked

8 November 2026. The supplied burgundy app icon, ivory favicon and horizontal GLAM BEAUTY wordmark are visible in chat. Their original binary files are absent from the execution workspace and GitHub default branch. The latest attachment downloaded as a text document only. No approximation, generated replacement or broken image URL has been installed.

The screenshot is showing the existing text fallback. This is not an installed image hidden by browser cache. PR30 repairs dashboard access, not artwork installation, and remains open. GitHub default remains `feat/platform-foundations` at `ff62f64` in this observation.

| Surface | Current implementation | Exact artwork needed |
| --- | --- | --- |
| Consumer header | `apps/web/components/GlamApp.tsx`: spark and text | Horizontal wordmark |
| Sign-in/registration | `WebLogin.tsx`: text wordmark | Horizontal wordmark |
| Private workspace entry | `WorkspaceAccess.tsx`: text wordmark | Horizontal wordmark |
| Business/staff workspace | `BusinessPortal.tsx`: text wordmark | Horizontal wordmark |
| Browser and Apple touch icon | Next metadata has no icons field or icon files | Ivory square favicon |
| Static cPanel export | Copies images, emits no favicon links | Exact logo files plus icon metadata |
| Interactive review export | Copies images, emits no favicon links | Exact logo files plus icon metadata |
| Native header | `apps/mobile/App.tsx`: text | Exact artwork image source |
| iOS/Android launcher icon | Expo config detects missing source; production guard refuses store build | Burgundy square app icon |

Required input: attach the originals as a ZIP file, preferably `wordmark.png`, `favicon.png`, and `app-icon.png`. A ZIP makes the original binary files downloadable through the attachment tool. Inline previews alone do not supply accessible file bytes in this environment. No credential is needed.

After the files arrive: preserve their pixels; validate format/dimensions, install web and native assets, replace all four web wordmarks and native header, configure Next/static favicon metadata and Expo icons, test mobile/desktop image loading and export contents, and provide screenshots. Browser icons require a new deployed build; installed mobile launcher icons require a rebuilt installed app. Neither can change on the current deployed release merely through an unmerged PR.

No website deployment, DNS change, app publication or production database change was performed.
