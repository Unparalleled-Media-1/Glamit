import { appBasePath } from "../lib/paths";

/** Exact supplied artwork; preview exports keep assets outside their /app routes. */
export default function BrandLogo() {
  const base = appBasePath.endsWith("/app")
    ? appBasePath.slice(0, -4)
    : appBasePath;
  return (
    <img
      className="brand-artwork"
      src={base + "/brand/wordmark.png?v=20261108"}
      alt="GLAM Beauty"
      width={1300}
      height={455}
      loading="eager"
    />
  );
}
