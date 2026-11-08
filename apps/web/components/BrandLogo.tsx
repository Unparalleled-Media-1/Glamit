import { appBasePath } from "../lib/paths";

/** Exact supplied artwork; preview exports keep assets outside their /app routes. */
export default function BrandLogo({ dark = false }: { dark?: boolean }) {
  const base = appBasePath.endsWith("/app")
    ? appBasePath.slice(0, -4)
    : appBasePath;
  return (
    <img
      className="brand-artwork"
      src={
        base +
        (dark
          ? "/brand/wordmark-dark.png?v=20261108"
          : "/brand/wordmark.png?v=20261108")
      }
      alt="GLAM Beauty"
      width={dark ? 2172 : 1300}
      height={dark ? 724 : 455}
      loading="eager"
    />
  );
}
