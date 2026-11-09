/** Test bundle only: unchanged native App and auth SDK/hooks; no fake login hook. */
import "./transport";
import { registerRootComponent } from "expo";
import { Text, View } from "react-native";
import App from "../../apps/mobile/App";
function DeviceFixture() {
  return <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ padding: 8, color: "#ffffff", backgroundColor: "#30252d" }}>ISOLATED TEST SERVICES · NOT LIVE AI</Text><App/></View>;
}
registerRootComponent(DeviceFixture);
