/** Test bundle only: unchanged native App and auth SDK/hooks; no fake login hook. */
import "./transport";
import { registerRootComponent } from "expo";
import { Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import App from "../../apps/mobile/App";
function DeviceFixture() {
  return <SafeAreaProvider><SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#30252d" }}><Text testID="native-fixture-banner" accessibilityRole="header" style={{ padding: 8, color: "#ffffff", backgroundColor: "#30252d" }}>ISOLATED TEST SERVICES · NOT LIVE AI</Text><App/></SafeAreaView></SafeAreaProvider>;
}
registerRootComponent(DeviceFixture);
