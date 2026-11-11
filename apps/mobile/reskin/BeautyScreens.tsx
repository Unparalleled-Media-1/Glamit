import { useState } from "react";
import { Image, Pressable, ScrollView, TextInput, View } from "react-native";
import { useNativeInsets } from "./ui";
import { changePart } from "../../../packages/product/journey";
import type { CapturePhoto } from "../analyze/capture-photo";
import type { JourneyProps } from "./PreferencesScreens";
import { NativeButton as Button, NativeCard as Card, NativePage as Page, NativeRow as Row, NativeText as Copy, EditorialPhoto } from "./ui";
import { navigateDesign as go, backDesign as back } from "./navigation";
import { useNativeTheme } from "./theme";

const makeup = [["All categories", "GL-038"], ["Lips", "GL-039"], ["Foundation", "GL-040"], ["Eyes", "GL-041"], ["Blush", "GL-042"], ["Full looks", "GL-043"]];
const hair = [["Styles", "GL-044"], ["Wigs & braids", "GL-045"], ["Colour", "GL-046"]];
const lipColors = ["#a34d60", "#b76d78", "#cf8d94", "#7b4c3e", "#98324f", "#652c45", "#d393a6"];
const hairColors = ["#1b1313", "#3b2218", "#6b3f2a", "#a2653b", "#c8975a", "#8c3f54", "#2f3e7a"];

export function NativeStudioHome() {
  const insets = useNativeInsets();
  return <View style={{ flex: 1, overflow: "hidden" }}><EditorialPhoto panel={1} height={900} /><View style={{ position: "absolute", top: insets.top + 14, left: 22 }}><Copy kind="kicker" onPhoto>STUDIO</Copy></View><View style={{ position: "absolute", left: 22, right: 22, bottom: 28, gap: 18 }}><Copy kind="kicker" onPhoto>YOUR EXPRESSION LAB</Copy><Copy kind="hero" onPhoto>Make it your own.</Copy><View style={{ flexDirection: "row", gap: 10 }}>{[["Makeup", "GL-037"], ["Hair", "GL-044"], ["AI look", "GL-047"]].map(([title, id]) => <View key={id} style={{ flex: 1 }}><Button title={title} glass onPress={() => go(id)} /></View>)}</View><Button title="Choose a photo" onPress={() => go("GL-036")} /><Copy kind="caption" onPhoto>Explore written style directions. Live try-on and image generation are not connected.</Copy></View></View>;
}

/** Native selection controls author a brief; they never claim to render a try-on. */
export function NativeBeautyWorkbench({ id, journey, setJourney, photo }: JourneyProps & { id: string; photo: CapturePhoto | null }) {
  const { colors: c } = useNativeTheme(), [shade, setShade] = useState(0), [finish, setFinish] = useState("Satin"), [notice, setNotice] = useState("");
  const isHair = ["GL-044", "GL-045", "GL-046"].includes(id);
  const title = id === "GL-039" ? "Lips" : id === "GL-046" ? "Hair colour" : id === "GL-045" ? "Wigs, braids & locs" : id === "GL-044" ? "Hairstyles" : id === "GL-047" ? "AI look" : id === "GL-037" ? "Portrait canvas" : "Makeup";
  const colors = isHair ? hairColors : lipColors;
  const direction = journey.look.parts[isHair ? "Hair" : "Makeup"];
  const selectDirection = (value: string) => setJourney(s => changePart(s, isHair ? "Hair" : "Makeup", value));
  return <Page title={title} onBack={back}>
    {photo ? <Image source={{ uri: photo.uri }} accessibilityLabel="Your unmodified private device photo" style={{ height: 330, width: "100%", borderRadius: 22 }} resizeMode="contain" /> : <View style={{ borderRadius: 22, overflow: "hidden" }}><EditorialPhoto panel={isHair ? 1 : 2} height={330} /></View>}
    <Copy kind="caption">{photo ? "Original photo · No rendered changes" : "Editorial inspiration · Not your photo or generated result"}</Copy>
    <Card><Copy kind="section">{title}</Copy><Copy>Choose a direction for your written style brief. Face landmarks, hair segmentation and a qualified rendering service are not connected; these controls do not alter a photo.</Copy>
      <ScrollView horizontal contentContainerStyle={{ gap: 10 }}>{[...makeup, ...hair].map(([label, target]) => <Button key={target} title={label} secondary onPress={() => go(target)} />)}</ScrollView>
      {["GL-039", "GL-046"].includes(id) && <><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>{colors.map((color, index) => <Pressable key={color} accessibilityRole="radio" accessibilityLabel={`${title} shade ${index + 1}`} accessibilityState={{ checked: shade === index }} onPress={() => { setShade(index); selectDirection(`${title} shade ${color} · ${finish}`); }} style={{ width: 44, height: 48, borderRadius: 22, backgroundColor: color, borderWidth: shade === index ? 3 : 1, borderColor: shade === index ? c.text : c.line }} />)}</View><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(isHair ? ["Natural", "Highlights", "Balayage", "Bold"] : ["Matte", "Satin", "Gloss"]).map(value => <Button key={value} title={value} secondary onPress={() => { setFinish(value); selectDirection(`${title} shade ${colors[shade]} · ${value}`); }} />)}</View></>}
      {isHair && id !== "GL-046" && ["Natural texture", "Braids", "Locs", "Wigs", "Curly", "Short"].map(value => <Row key={value} title={value} detail={direction === value ? "Selected for your brief" : undefined} onPress={() => selectDirection(value)} />)}
      <TextInput accessibilityLabel="Written look direction" placeholder="Describe your look" placeholderTextColor={c.secondary} value={direction} multiline maxLength={240} onChangeText={selectDirection} style={{ minHeight: 76, padding: 16, backgroundColor: c.raised, borderRadius: 14, borderWidth: 1, borderColor: c.line, color: c.text, fontSize: 15 }} />
      <Button title="Use direction in my outfit brief" onPress={() => { setNotice("Your written direction is in the current brief. No image has been generated."); go("FB-03"); }} disabledReason={!direction.trim() ? "Choose or write a direction first." : undefined} />
      <Button title="Generate photo preview" disabledReason="A qualified rendering service, generation permissions and confirmed credit contract are required. No credits are charged." />
      {notice && <Copy>{notice}</Copy>}
    </Card><Button title="Choose a private photo" secondary onPress={() => go("GL-017")} />
  </Page>;
}
