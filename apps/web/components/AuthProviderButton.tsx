import marks from "../../../packages/auth/provider-marks.json";
import type { SocialProvider } from "../../../packages/auth/core";

/** Fixed provider marks. Never tint Google or apply GLAM colours to provider identities. */
export function ProviderMark({ provider }: { provider: SocialProvider }) {
  const mark = marks[provider];
  return (
    <svg
      className="auth-provider-mark"
      viewBox={mark.viewBox}
      aria-hidden="true"
      focusable="false"
    >
      {mark.background && (
        <rect width="100%" height="100%" fill={mark.background} />
      )}
      {mark.paths.map((p, index) => <path key={index} d={p.d} fill={p.fill} />)}
    </svg>
  );
}
export default function AuthProviderButton(
  { provider, onClick, disabled, link = false }: {
    provider: SocialProvider;
    onClick: () => void;
    disabled: boolean;
    link?: boolean;
  },
) {
  const name = provider[0].toUpperCase() + provider.slice(1);
  return (
    <button
      type="button"
      className={`auth-provider auth-provider--${provider}`}
      disabled={disabled}
      onClick={onClick}
    >
      <ProviderMark provider={provider} />
      <span>{link ? "Link" : "Continue with"} {name}</span>
    </button>
  );
}
