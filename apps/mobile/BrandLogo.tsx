import { Image } from "react-native";

export default function BrandLogo() {
  return (
    <Image
      source={require("./assets/brand/wordmark.png")}
      accessibilityLabel="GLAM Beauty"
      accessible
      resizeMode="contain"
      style={{ width: 156, height: 55, flexShrink: 1 }}
    />
  );
}
