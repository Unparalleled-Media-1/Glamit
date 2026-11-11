import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, AppState, BackHandler, Image, Linking, Pressable,
  ScrollView, StyleSheet, Switch, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import type { CameraView } from "expo-camera";
import { CaptureFiles, type CaptureAsset } from "./capture-photo";
import { useCaptureDesign } from "./design";
import { loadCaptureCamera } from "./native-camera";

type Stage = "landing" | "type" | "goals" | "guide" | "camera";
const stages: Stage[] = ["landing", "type", "goals", "guide", "camera"];
const choices = [
  ["Face & makeup", "Features and cosmetic colour guidance", true],
  ["Skin appearance", "Separate skin analysis is not available", false],
  ["Hair & grooming", "Separate hair analysis is not available", false],
  ["Fashion & full-body styling", "Full-body analysis is not available", false],
  ["Complete transformation", "Transformation generation is not available", false],
] as const;
const goals = ["Everyday polish", "Event-ready", "Try a new colour palette", "Minimal makeup"];

export default function AnalyzeCapture({ accountScope, onExit, sessionFiles, onReview, onGoalsChange, onPhotoChanged, initialStage = "landing", focused = true }: {
  accountScope: string; onExit: () => void; sessionFiles?: CaptureFiles; onReview?: () => void;
  onGoalsChange?: (goals: string[]) => void;
  onPhotoChanged?: (photo: import("./capture-photo").CapturePhoto | null) => void;
  initialStage?: Exclude<Stage, "camera">;
  focused?: boolean;
}) {
  const d = useCaptureDesign(), s = captureStyles(d);
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>(initialStage);
  const [selected, setSelected] = useState<string[]>([]);
  const [exploring, setExploring] = useState(false);
  const [previewAllowed, setPreviewAllowed] = useState(false);
  const consent = useRef(false);
  const [camera] = useState(loadCaptureCamera);
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [canvas, setCanvas] = useState({ width: 390, height: 600 });
  const [denied, setDenied] = useState(false);
  const [active, setActive] = useState(AppState.currentState === "active");
  const foreground = useRef(AppState.currentState === "active");
  const operation = useRef<"permission" | "picker" | "capture" | null>(null);
  const ticket = useRef(0), lock = useRef(false), mounted = useRef(true);
  const focus = useRef(focused); focus.current = focused;
  const foregroundWaits = useRef(new Set<() => void>());
  const [files] = useState(() => sessionFiles || new CaptureFiles());
  const [, redraw] = useState(0);
  const scope = useRef(accountScope);
  const scopeChanged = scope.current !== accountScope;
  const photo = scopeChanged || !active ? null : files.photo;
  useEffect(() => { onPhotoChanged?.(photo); }, [photo?.uri, onPhotoChanged]);

  function invalidate() {
    ticket.current++; setCameraOpen(false); setReady(false);
    for (const finish of foregroundWaits.current) finish();
  }
  function clear() {
    invalidate();
    const clean = files.clear();
    redraw(n => n + 1);
    setNotice(clean ? "Your device copy is cleared." : "Private photo cleanup could not be confirmed. Retry clearing it.");
    return clean;
  }
  function exit() { if (clear()) onExit(); }
  function back() {
    if (stage === "landing") exit();
    else if (clear()) setStage(stages[Math.max(0, stages.indexOf(stage) - 1)]);
  }
  useEffect(() => {
    if (scope.current !== accountScope) {
      scope.current = accountScope;
      consent.current = false; setPreviewAllowed(false); setSelected([]); setExploring(false); clear(); setStage("landing");
    }
  }, [accountScope]);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener("change", next => {
      foreground.current = next === "active"; setActive(foreground.current);
      if (next !== "active") { setCameraOpen(false); setReady(false); }
      // OS picker/permission activities can background Android. Their eventual result
      // still requires foreground, unchanged identity/ticket and explicit preview consent.
      if (next === "background" && !["picker", "permission"].includes(operation.current || "")) {
        ticket.current++;
        const clean = files.clear(); redraw(n => n + 1);
        setNotice(clean ? "Your device copy was cleared when the app left the foreground." : "Private photo cleanup could not be confirmed. Retry clearing it.");
      }
    });
    return () => {
      mounted.current = false; ticket.current++; consent.current = false;
      subscription.remove(); for (const finish of foregroundWaits.current) finish();
      if (!sessionFiles) files.clear();
    };
  }, [files]);
  useEffect(() => { onGoalsChange?.(exploring ? [] : selected); }, [selected, exploring, onGoalsChange]);
  useEffect(() => { if (!focused) invalidate(); }, [focused]);
  useEffect(() => {
    if (!focused) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { back(); return true; });
    return () => subscription.remove();
  });
  useEffect(() => {
    if (!cameraOpen || ready) return;
    const timer = setTimeout(() => { setCameraOpen(false); setNotice("The camera could not start. Try again or choose a photo from your library."); }, 12000);
    return () => clearTimeout(timer);
  }, [cameraOpen, ready]);

  const current = (id: number, identity: string) => mounted.current && focus.current && ticket.current === id &&
    scope.current === identity && accountScope === identity && consent.current;

  async function run(kind: "permission" | "picker" | "capture", work: (id: number, identity: string) => Promise<void>) {
    if (lock.current || !consent.current || files.cleanupPending || !foreground.current || scope.current !== accountScope) return;
    lock.current = true; operation.current = kind; setBusy(true); setNotice("");
    const id = ++ticket.current, identity = accountScope;
    try { await work(id, identity); }
    catch { if (current(id, identity)) setNotice(files.cleanupPending
      ? "Private photo cleanup could not be confirmed. Retry clearing it."
      : "Photo capture or selection could not be completed. Nothing was uploaded. Try again or choose another source."); }
    finally { operation.current = null; lock.current = false; if (mounted.current) { setBusy(false); redraw(n => n + 1); } }
  }
  async function foregroundResult() {
    if (foreground.current || !mounted.current) return;
    // Some OS picker promises settle just before the foreground notification.
    await new Promise<void>(resolve => {
      let timer: ReturnType<typeof setTimeout>;
      const finish = () => { clearTimeout(timer); subscription.remove(); foregroundWaits.current.delete(finish); resolve(); };
      const subscription = AppState.addEventListener("change", state => {
        if (state === "active") finish();
      });
      foregroundWaits.current.add(finish);
      timer = setTimeout(finish, 1500);
    });
  }
  function accept(asset: CaptureAsset, id: number, identity: string, fromCamera = false) {
    if (!current(id, identity) || !foreground.current) {
      if (fromCamera) files.discardCameraResult(asset);
      return;
    }
    files.adopt(asset, fromCamera); setCameraOpen(false); setReady(false); setStage("camera");
    setNotice("Photo kept on this device. Nothing has been uploaded or analysed.");
  }
  const openCamera = () => run("permission", async (id, identity) => {
    setDenied(false);
    if (!camera) { setNotice("The native camera is unavailable in this build. Choose a photo from your library."); return; }
    const permission = await camera.Camera.requestCameraPermissionsAsync();
    if (!current(id, identity)) return;
    await foregroundResult();
    if (!current(id, identity) || !foreground.current) return;
    if (!permission.granted) { setDenied(true); setNotice("Camera permission was denied. You can choose a photo or enable camera access in device settings."); return; }
    setStage("camera"); setReady(false); setCameraOpen(true);
  });
  const library = () => run("picker", async (id, identity) => {
    setCameraOpen(false); setReady(false);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, allowsEditing: false, exif: false });
    if (!current(id, identity)) return;
    await foregroundResult();
    if (!current(id, identity) || !foreground.current) return;
    if (result.canceled) { setNotice("Photo selection cancelled. Nothing was uploaded."); return; }
    if (!result.assets[0]) throw Error("No selected image");
    accept(result.assets[0], id, identity);
  });
  const shutter = () => {
    if (!ready || !cameraOpen || !cameraRef.current) return;
    return run("capture", async (id, identity) => {
      const result = await cameraRef.current!.takePictureAsync({ quality: 1, exif: false, skipProcessing: false });
      if (!result) throw Error("No captured image");
      accept(result, id, identity, true);
    });
  };
  function allow(value: boolean) {
    consent.current = value; setPreviewAllowed(value);
    if (!value) clear();
  }
  function retake() { if (clear()) void openCamera(); }
  function toggleGoal(goal: string) { setExploring(false); setSelected(values => values.includes(goal) ? values.filter(v => v !== goal) : [...values, goal]); }
  const action = (label: string, onPress: () => unknown, disabled = false, secondary = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
      onPress={onPress} style={[s.button, secondary && s.secondary, disabled && s.disabled]}>
      <Text style={[s.buttonText, secondary && s.secondaryText]}>{label}</Text>
    </Pressable>
  );
  const header = (title: string) => <View style={s.header}>
    {action("Back", back, false, true)}<Text accessibilityRole="header" style={s.headerText}>{title}</Text>
    {action("Close Analyze", exit, false, true)}
  </View>;
  const optionsDisabled = busy || !previewAllowed || files.cleanupPending || !active;
  const NativeCamera = camera?.CameraView;
  const viewTicket = ticket.current;
  const editorialHeight = Math.max(canvas.height, canvas.width / 0.75);
  const editorialPanelWidth = editorialHeight * 0.75;

  return <View testID="native-analyze-capture" style={[s.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12), paddingLeft: insets.left, paddingRight: insets.right }]}>
    {!active && <View testID="capture-privacy-cover" style={s.cover}><Text style={s.body}>Your private photo is hidden.</Text></View>}
    {header(stage === "landing" ? "Analyze" : stage === "goals" ? "My beauty goals" : stage === "type" ? "Choose analysis" : stage === "guide" ? "Before you start" : "Your camera")}
    {stage !== "guide" && stage !== "camera" && !!notice && <View style={s.controls}>
      <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>
      {files.cleanupPending && action("Retry clearing private photo", clear)}
    </View>}
    <View style={s.content} accessibilityElementsHidden={!active} importantForAccessibility={active ? "auto" : "no-hide-descendants"}
      onLayout={event => setCanvas(event.nativeEvent.layout)}>
      {stage === "landing" && <>
        <View pointerEvents="none" style={s.editorial}><Image accessible accessibilityLabel="Editorial inspiration, not your photo or analysis result"
          source={require("../assets/beauty-editorial.webp")}
          style={{ position: "absolute", width: editorialPanelWidth * 4, height: editorialHeight,
            left: -(2 * editorialPanelWidth + (editorialPanelWidth - canvas.width) / 2), top: -0.15 * (editorialHeight - canvas.height) }} />
          <Text style={s.editorialLabel}>Editorial inspiration · Not your photo</Text></View>
        <ScrollView contentContainerStyle={s.landingScroll}><View style={s.landingCopy}><Text style={s.kicker}>A NEW WAY TO SEE YOUR POSSIBILITIES</Text>
          <Text accessibilityRole="header" style={s.title}>See what makes{"\n"}you, you.</Text>
          <Text style={s.body}>Your features are a starting point, never a score.</Text>
          {action("Start analysis", () => setStage("type"))}
          <Text style={s.caption}>Start with a private device photo. No upload or analysis starts here.</Text>
        </View></ScrollView>
      </>}
      {stage === "type" && <ScrollView contentContainerStyle={s.pad}>
        <Text style={s.kicker}>ANALYZE</Text><Text accessibilityRole="header" style={s.title}>What would you like to explore?</Text>
        {choices.map(([title, copy, supported]) => <View key={title} style={s.option}>
          <Pressable accessibilityRole="radio" accessibilityLabel={title} accessibilityState={{ checked: supported, disabled: !supported }} disabled={!supported} onPress={() => setNotice("Face & makeup is selected. No analysis has started.")} style={s.optionTouch}>
            <Text style={s.optionTitle}>{title}{supported ? "  ✓" : ""}</Text><Text style={s.caption}>{copy}</Text>
            {!supported && <Text style={s.caption}>Unavailable</Text>}
          </Pressable>
        </View>)}
        {action("Continue to goals", () => setStage("goals"))}
      </ScrollView>}
      {stage === "goals" && <ScrollView contentContainerStyle={s.pad}>
        <Text accessibilityRole="header" style={s.title}>What would you like to explore?</Text>
        <Text style={s.body}>Nothing here implies your natural look needs fixing.</Text>
        <Text style={s.kicker}>FACE & COLOUR</Text>
        {goals.map(goal => <Pressable key={goal} accessibilityRole="checkbox" accessibilityLabel={goal} accessibilityState={{ checked: selected.includes(goal) }}
          onPress={() => toggleGoal(goal)} style={[s.option, selected.includes(goal) && s.selected]}><Text style={s.body}>{selected.includes(goal) ? "✓  " : ""}{goal}</Text></Pressable>)}
        <View style={s.toggle}><Switch accessibilityLabel="Just exploring" value={exploring} onValueChange={v => { setExploring(v); if (v) setSelected([]); }} /><Text style={s.body}>Just exploring</Text></View>
        {action("Continue to camera guidance", () => setStage("guide"), !exploring && selected.length === 0)}
        <Text style={s.caption}>These are local preferences. No analysis request has been sent.</Text>
      </ScrollView>}
      {(stage === "guide" || stage === "camera") && <>
        {stage === "guide" ? <ScrollView contentContainerStyle={s.pad}>
          <Text accessibilityRole="header" style={s.title}>Three things for a great read.</Text>
          {[ ["Soft, even light", "Face a window; avoid harsh overhead light."], ["Camera at eye level", "Hold level, arm’s length."], ["No filters or heavy edits", "Natural colour gives better guidance."] ].map(([title, copy]) => <View key={title} style={s.option}><Text style={s.optionTitle}>{title}</Text><Text style={s.caption}>{copy}</Text></View>)}
        </ScrollView> : <View style={s.cameraArea}>
          {NativeCamera && cameraOpen && focused && active && !scopeChanged && <NativeCamera key={facing} ref={cameraRef} style={s.live} facing={facing} mode="picture" mute active={active}
            onCameraReady={() => { if (mounted.current && foreground.current && ticket.current === viewTicket) setReady(true); }}
            onMountError={() => { if (mounted.current && ticket.current === viewTicket) { setCameraOpen(false); setReady(false); setNotice("A camera is unavailable on this device. Choose a photo from your library or try again."); } }} />}
          {cameraOpen && !ready && <ActivityIndicator accessibilityLabel="Starting camera" color={d.action} />}
          {cameraOpen && <View pointerEvents="none" accessible={false} style={s.faceGuide} />}
          {!cameraOpen && !photo && <Text style={s.body}>Your camera is off. Open it or choose a photo.</Text>}
          {photo && <View style={s.selection}><Image testID="capture-selected-photo" accessibilityLabel="Your selected device-only photo" source={{ uri: photo.uri }} style={s.thumbnail}
            onError={() => {
              if (files.photo?.uri !== photo.uri) return;
              clear(); setNotice("This photo could not be displayed. Clear the private copy and choose another photo.");
            }} />
            <Text style={s.body}>Photo selected on this device.</Text>
            {onReview && action("Review photo", () => { invalidate(); onReview(); }, optionsDisabled)}
            {action("Retake photo", retake, optionsDisabled, true)}
            {action("Clear private photo", clear, false, true)}
          </View>}
          {cameraOpen && <View style={s.cameraTools}>
            {action("Capture photo", shutter, !ready || optionsDisabled)}
            {action("Flip camera", () => { ticket.current++; setReady(false); setFacing(v => v === "front" ? "back" : "front"); }, optionsDisabled, true)}
          </View>}
        </View>}
        <View style={s.controls}>
          <View style={s.toggle}><Switch accessibilityLabel="Allow device-only photo preview" value={previewAllowed && !scopeChanged} onValueChange={allow} />
            <Text style={[s.caption, s.flex]}>Allow a private device preview. This does not consent to upload or analysis.</Text></View>
          {!!notice && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
          {files.cleanupPending ? action("Retry clearing private photo", clear) : <>
            {!cameraOpen && !photo && action("Open camera", openCamera, optionsDisabled)}
            {action(busy && operation.current === "picker" ? "Opening photo library…" : "Choose from gallery", library, optionsDisabled, true)}
          </>}
          {denied && action("Open device settings", () => Linking.openSettings().catch(() => setNotice("Device settings could not be opened. You can still choose from your library.")), false, true)}
          <Text style={s.caption}>Only your device copy is used here. Nothing is uploaded or analysed.</Text>
        </View>
      </>}
    </View>
  </View>;
}

function captureStyles(d: ReturnType<typeof useCaptureDesign>) { return StyleSheet.create({
  root: { flex: 1, backgroundColor: d.background }, flex: { flex: 1 }, content: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6 },
  headerText: { flex: 1, textAlign: "center", color: d.text, fontSize: 16, fontWeight: "700" },
  pad: { padding: d.gutter, gap: 14, flexGrow: 1 },
  title: { color: d.text, fontFamily: d.displayFont, fontSize: 34, lineHeight: 40, letterSpacing: -0.7 },
  body: { color: d.text, fontSize: 16, lineHeight: 24 }, caption: { color: d.muted, fontSize: 13, lineHeight: 20 },
  kicker: { color: d.accent, fontSize: 11, fontWeight: "700", letterSpacing: 1.6 },
  button: { minHeight: 48, borderRadius: 28, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: d.action, alignItems: "center", justifyContent: "center" },
  buttonText: { color: d.onAction, fontSize: 15, fontWeight: "700", textAlign: "center" },
  secondary: { backgroundColor: d.raised, borderWidth: 1, borderColor: d.line }, secondaryText: { color: d.text }, disabled: { opacity: 0.5 },
  option: { backgroundColor: d.surface, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: d.line, gap: 6, minHeight: 56 },
  optionTouch: { minHeight: 48, gap: 6 }, optionTitle: { color: d.text, fontSize: 17, fontWeight: "600" }, selected: { borderColor: d.accent },
  toggle: { flexDirection: "row", gap: 12, alignItems: "center" },
  editorial: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, overflow: "hidden", backgroundColor: d.raised },
  editorialLabel: { position: "absolute", top: 12, left: 16, right: 16, color: d.text, backgroundColor: "#201620dd", padding: 8, fontSize: 12 },
  landingScroll: { flexGrow: 1, justifyContent: "flex-end", paddingTop: 72 },
  landingCopy: { backgroundColor: "#0f0e10ed", padding: d.gutter, gap: 14, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  cameraArea: { flex: 1, minHeight: 160, alignItems: "center", justifyContent: "center", backgroundColor: "#000", overflow: "hidden" },
  live: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }, faceGuide: { position: "absolute", width: "60%", height: "65%", borderWidth: 2, borderColor: d.action, borderRadius: 160 },
  cameraTools: { position: "absolute", bottom: 16, left: 22, right: 22, gap: 10 },
  controls: { paddingHorizontal: d.gutter, paddingTop: 12, gap: 10 }, notice: { color: d.error, fontSize: 14, lineHeight: 21 },
  selection: { alignItems: "center", gap: 12, padding: 16 }, thumbnail: { width: 96, height: 128, borderRadius: 16 },
  cover: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, backgroundColor: d.background, alignItems: "center", justifyContent: "center" },
}); }
