import { Image } from "react-native";

export default function BrandLogo({ dark = false }: { dark?: boolean }) {
  return (
    <Image
      source={
        dark
          ? require("./assets/brand/wordmark-dark.png")
          : require("./assets/brand/wordmark.png")
      }
      accessibilityLabel="GLAM Beauty"
      accessible
      resizeMode="contain"
      style={{ width: 156, height: 55, flexShrink: 1 }}
    />
  );
}
