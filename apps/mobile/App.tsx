import { useEffect, useReducer, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";
import {
  capabilityReasons,
  goals,
  initialPersonal,
  interests,
  mobileTabs,
  personalReducer,
  photoIssue,
  reportFields,
  styles as directions,
  tabPage,
  tools,
  workspaces,
} from "../../packages/product/platform";
import type { Page, Photo, Role } from "../../packages/product/platform";

import ContextualRecommendations from "./ContextualRecommendations";
import MerchantSnapList from "./MerchantSnapList";
import {
  analysisContexts,
  contextualReportFields,
} from "../../packages/product/catalog";
import type {
  AnalysisContext,
  RequirementDraft,
} from "../../packages/product/catalog";

function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress?: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        disabled && s.disabled,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text
        style={[
          s.buttonText,
          secondary && s.secondaryText,
          disabled && s.disabledText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
function Note({ text }: { text: string }) {
  return (
    <View accessibilityRole="text" style={s.notice}>
      <Text style={s.noticeText}>{text}</Text>
    </View>
  );
}
function Title({ title, copy }: { title: string; copy: string }) {
  return (
    <View style={s.heading}>
      <Text style={s.eyebrow}>YOUR PERSONAL BEAUTY & STYLE ADVISOR</Text>
      <Text accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      <Text style={s.body}>{copy}</Text>
    </View>
  );
}
export default function App() {
  const [state, dispatch] = useReducer(personalReducer, initialPersonal);
  const [savedRequirements, setSavedRequirements] = useState<
    RequirementDraft[]
  >([]);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const photoRef = useRef<Photo | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [routineTitle, setRoutineTitle] = useState("My getting-ready routine");
  const [steps, setSteps] = useState(
    "Choose a comfortable look\nPrepare the tools I own\nFollow one technique at a time",
  );
  const [question, setQuestion] = useState("");
  const [switcher, setSwitcher] = useState(false);
  const [reviewRole, setReviewRole] = useState<Role | null>(null);
  const [module, setModule] = useState(0);
  const [plan, setPlan] = useState("");
  const [compare, setCompare] = useState(false);
  const [deletionPending, setDeletionPending] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const mounted = useRef(true);
  const request = useRef(0);
  const { width } = useWindowDimensions();
  const imageWidth = Math.min(width - 40, 700);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current++;
      const p = photoRef.current;
      if (p?.uri.startsWith(Paths.cache.uri)) {
        try {
          const f = new File(p.uri);
          if (f.exists) f.delete();
        } catch {
          /* Explicit retry is available during the session. */
        }
      }
    };
  }, []);
  const go = (page: Page) => {
    dispatch({ type: "navigate", page });
    setMessage("");
    setError("");
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  function deleteCached(p: Photo | null) {
    if (!p) return;
    if (!p.uri.startsWith(Paths.cache.uri))
      throw Error("Only app-owned cached copies may be deleted");
    const f = new File(p.uri);
    if (f.exists) f.delete();
  }
  function clearPhoto() {
    request.current++;
    setBusy(false);
    try {
      deleteCached(photoRef.current);
      photoRef.current = null;
      setPhoto(null);
      setConsent(false);
      setDeletionPending(false);
      return true;
    } catch {
      setDeletionPending(true);
      setError(
        "The app-owned preview cache could not be deleted. Retry clearing it before choosing another photo.",
      );
      return false;
    }
  }
  async function pick(camera = false) {
    if (!consent || busy || deletionPending) return;
    const ticket = ++request.current;
    setBusy(true);
    setError("");
    let candidate: Photo | null = null;
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(
          "Permission was denied. You can continue without a photo or enable access in device settings.",
        );
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
        exif: false,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const a = result.assets[0];
      candidate = {
        uri: a.uri,
        width: a.width,
        height: a.height,
        bytes: a.fileSize ?? new File(a.uri).size,
        name: a.fileName || "Local photo",
      };
      const issue = photoIssue(candidate);
      if (issue) {
        deleteCached(candidate);
        setError(issue);
        return;
      }
      if (!mounted.current || ticket !== request.current) {
        deleteCached(candidate);
        return;
      }
      deleteCached(photoRef.current);
      photoRef.current = candidate;
      setPhoto(candidate);
      go("quality");
    } catch {
      if (candidate && candidate !== photoRef.current) {
        try {
          deleteCached(candidate);
        } catch {
          /* Do not delete user originals. */
        }
      }
      if (mounted.current)
        setError(
          "Photo selection could not be completed. No photo was uploaded.",
        );
    } finally {
      if (mounted.current && ticket === request.current) setBusy(false);
    }
  }
  const hero = (panel = 0) => (
    <View style={[s.editorial, { height: 360 }]}>
      <Image
        accessible
        accessibilityLabel="Original editorial inspiration, not your analysis or makeover result"
        source={require("./assets/editorial.webp")}
        style={{
          position: "absolute",
          width: imageWidth * 4,
          height: imageWidth * 2,
          left: -panel * imageWidth,
          top: -imageWidth * 0.12,
        }}
      />
      <View style={s.photoLabel}>
        <Text style={s.small}>Editorial inspiration · Not your result</Text>
      </View>
    </View>
  );
  const heading = (title: string, copy: string) => (
    <Title title={title} copy={copy} />
  );
  const nav = (title: string, page: Page, secondary = false) => (
    <Button title={title} onPress={() => go(page)} secondary={secondary} />
  );
  const localPhoto = () =>
    photo ? (
      <Image
        style={s.localPhoto}
        source={{ uri: photo.uri }}
        accessibilityLabel="Your unchanged local photo preview"
      />
    ) : (
      <Note text="No local photo selected. No personal result is available." />
    );
  function saveRoutine() {
    const lines = steps
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (!routineTitle.trim() || !lines.length || lines.length > 30) {
      setError("Add a title and one to 30 steps.");
      return;
    }
    const id = String(Date.now());
    dispatch({
      type: "save-routine",
      routine: {
        id,
        title: routineTitle.trim(),
        steps: lines.map((text, i) => ({
          id: id + "-" + i,
          text,
          done: false,
        })),
      },
    });
    setMessage(
      "Routine saved for this app session. Account sync is not connected.",
    );
  }
  const recommendationContext: AnalysisContext =
    state.page === "hair"
      ? "hair"
      : state.page === "skin"
        ? "skin"
        : state.page === "body-fit"
          ? "body-fit"
          : state.page === "color"
            ? "color"
            : state.page === "guide"
              ? "routine"
              : state.page === "studio"
                ? state.tool === "Makeup Match"
                  ? "makeup-match"
                  : "makeover"
                : "face";
  function content() {
    switch (state.page) {
      case "home":
        return (
          <>
            {hero()}
            <Text style={s.eyebrow}>UNDERSTAND. EXPLORE. EXPRESS.</Text>
            <Text accessibilityRole="header" style={s.heroTitle}>
              Discover What{"\n"}Suits You.
            </Text>
            <Text style={s.body}>
              Understand your features. Discover your colors. Explore your look.
              Learn how to achieve it.
            </Text>
            {nav("Analyze My Face", "analyze")}
            <Text style={s.fine}>
              Private by default · Your photo, your choice
            </Text>
            <View style={s.quickGrid}>
              {[
                ["Face Analysis", "analyze"],
                ["Color Analysis", "color"],
                ["AI Makeover", "studio"],
                ["Makeup Match", "studio"],
              ].map(([n, p], i) => (
                <Pressable
                  accessibilityRole="button"
                  key={n}
                  style={s.quickCard}
                  onPress={() => {
                    if (i === 3)
                      dispatch({ type: "tool", value: "Makeup Match" });
                    go(p as Page);
                  }}
                >
                  <Text style={s.eyebrow}>0{i + 1} ↗</Text>
                  <Text style={s.h2}>{n}</Text>
                  <Text style={s.small}>Your choices. Your direction.</Text>
                </Pressable>
              ))}
            </View>
            <Card>
              <Text style={s.h2}>Your Glow-Up Journey</Text>
              {[
                "Complete your personal analysis",
                "Explore colors and chosen looks",
                "Build your practical routine",
              ].map((n, i) => (
                <Text style={s.listItem} key={n}>
                  0{i + 1} {n}
                </Text>
              ))}
              {nav("Build a routine", "guide", true)}
            </Card>
            <Text style={s.h2}>Follow interests. Skip labels.</Text>
            <View style={s.chips}>
              {interests.map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityState={{ selected: state.interests.includes(n) }}
                  onPress={() =>
                    dispatch({ type: "toggle", key: "interests", value: n })
                  }
                  style={[s.chip, state.interests.includes(n) && s.selected]}
                >
                  <Text style={state.interests.includes(n) ? s.white : s.small}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
            {nav("Optional inspiration & products", "explore", true)}
          </>
        );
      case "analyze":
        return (
          <>
            {heading(
              "Your features. Your possibilities.",
              "Face and personal color guidance, without a beauty score.",
            )}
            <Card>
              <Text style={s.h2}>Face Analysis</Text>
              {reportFields.map((n) => (
                <Text style={s.listItem} key={n}>
                  {n}
                </Text>
              ))}
              {nav("Start Face Analysis", "consent")}
              {nav("Hair Analysis", "hair", true)}
              {nav("Skin Appearance Analysis", "skin", true)}
              {nav("Body & Fit Styling", "body-fit", true)}
              {nav("Open Color Analysis", "color", true)}
              <Text style={s.fine}>
                No diagnosis, face identification or attractiveness ranking.
              </Text>
            </Card>
          </>
        );
      case "consent":
        return (
          <>
            {heading(
              "Your photo. Your permission.",
              "Prepare a device-only photo preview. No upload, facial analysis or sharing occurs.",
            )}
            <Card>
              <Text style={s.body}>
                Use an image you have rights to use. Face soft light, keep the
                camera level and avoid filters. Future processing requires
                qualified account, age/guardian, consent and provider checks.
              </Text>
              <View style={s.switchRow}>
                <Switch
                  accessibilityLabel="Allow device-only photo preview"
                  value={consent}
                  disabled={busy}
                  onValueChange={(v) => {
                    if (!v) clearPhoto();
                    else setConsent(true);
                  }}
                />
                <Text style={s.flexText}>
                  I have permission and want a device-only preview.
                </Text>
              </View>
              <Button
                title={busy ? "Opening photo picker…" : "Choose a photo"}
                disabled={!consent || busy || deletionPending}
                onPress={() => pick()}
              />
              <Button
                title="Take a photo"
                secondary
                disabled={!consent || busy || deletionPending}
                onPress={() => pick(true)}
              />
              <Text style={s.fine}>
                Under 10 MB · at least 480 × 480 pixels · no filters added
              </Text>
              {nav("Continue without a photo", "goals", true)}
            </Card>
          </>
        );
      case "quality":
        return (
          <>
            {heading(
              "A clear starting point.",
              "Technical checks do not evaluate lighting, face detection or suitability.",
            )}
            {localPhoto()}
            <Card>
              <Text style={s.listItem}>
                Dimensions:{" "}
                {photo ? `${photo.width} × ${photo.height}` : "No photo"}
              </Text>
              <Text style={s.listItem}>
                File:{" "}
                {photo ? `${(photo.bytes / 1048576).toFixed(1)} MB` : "Unknown"}
              </Text>
              <Text style={s.listItem}>
                Face / lighting checks: Not evaluated
              </Text>
              <Text style={s.listItem}>Upload: None</Text>
              {nav("Choose my goals", "goals")}
              <Button
                title="Clear / retake photo"
                secondary
                onPress={() => {
                  if (clearPhoto()) go("consent");
                }}
              />
            </Card>
          </>
        );
      case "goals":
        return (
          <>
            {heading(
              "Your goals. Your direction.",
              "Choose what you want to explore.",
            )}
            <Card>
              {goals.map((n) => (
                <View key={n} style={s.switchRow}>
                  <Switch
                    accessibilityLabel={n}
                    value={state.goals.includes(n)}
                    onValueChange={() =>
                      dispatch({ type: "toggle", key: "goals", value: n })
                    }
                  />
                  <Text style={s.flexText}>{n}</Text>
                </View>
              ))}
              <Note text={capabilityReasons.analysis} />
              <Button title="Run analysis — connection required" disabled />
              {nav("View report workspace", "report", true)}
            </Card>
          </>
        );
      case "hair":
      case "skin":
      case "body-fit":
      case "report":
        return (
          <>
            {heading(
              recommendationContext === "face"
                ? "Your personal analysis."
                : analysisContexts.find((n) => n.id === recommendationContext)!
                    .title,
              "No analysis result exists yet. Qualified estimates should explain uncertainty and allow corrections.",
            )}
            <Text accessibilityRole="header" style={s.h2}>
              Your Results
            </Text>
            <Note text={capabilityReasons.analysis} />
            {contextualReportFields[recommendationContext].map((n) => (
              <Card key={n}>
                <Text style={s.h2}>{n}</Text>
                <Text style={s.badge}>Not computed</Text>
                <Text style={s.body}>
                  An explanation, limits and correction controls will follow a
                  qualified result.
                </Text>
              </Card>
            ))}
            {nav("Explore Color Analysis", "color")}
            {nav("Build my Glow-Up Guide", "guide", true)}
          </>
        );
      case "color":
        return (
          <>
            {heading(
              "Find your colors.",
              "Color guidance depends on lighting and a qualified analysis, never a universal beauty standard.",
            )}
            <Text accessibilityRole="header" style={s.h2}>
              Your Results
            </Text>
            <View style={s.palette}>
              {["#c9a46a", "#a98abd", "#d96b95", "#62515d", "#dfcbb9"].map(
                (c) => (
                  <View key={c} style={[s.swatch, { backgroundColor: c }]} />
                ),
              )}
            </View>
            <Text style={s.fine}>
              Brand illustration · Not your personal palette
            </Text>
            <Card>
              {[
                "Color season",
                "Estimated undertone",
                "Makeup shade families",
                "Hair & clothing colors",
              ].map((n) => (
                <Text key={n} style={s.listItem}>
                  {n}: Not computed
                </Text>
              ))}
              <Note text={capabilityReasons.analysis} />
              {nav("Build a chosen-color routine", "guide")}
            </Card>
          </>
        );
      case "guide":
        return (
          <>
            {heading(
              "A guide of your own.",
              "Practical steps you choose. These notes are not AI-generated advice.",
            )}
            <Text accessibilityRole="header" style={s.h2}>
              Your Results
            </Text>
            <Card>
              <Text style={s.label}>Routine title</Text>
              <TextInput
                accessibilityLabel="Routine title"
                style={s.input}
                value={routineTitle}
                maxLength={160}
                onChangeText={setRoutineTitle}
              />
              <Text style={s.label}>One step per line</Text>
              <TextInput
                accessibilityLabel="Routine steps"
                style={[s.input, s.textarea]}
                multiline
                value={steps}
                maxLength={6000}
                onChangeText={setSteps}
              />
              <Button title="Save session routine" onPress={saveRoutine} />
              <Text style={s.fine}>
                App memory only; closing / reloading clears notes until account
                sync is connected.
              </Text>
            </Card>
            {!state.routines.length && (
              <Note text="No session routines yet. Save your first routine above." />
            )}
            {state.routines.map((r) => (
              <Card key={r.id}>
                <Text style={s.h2}>{r.title}</Text>
                {r.steps.map((step) => (
                  <View style={s.switchRow} key={step.id}>
                    <Switch
                      accessibilityLabel={step.text}
                      value={step.done}
                      onValueChange={() =>
                        dispatch({ type: "step", routine: r.id, step: step.id })
                      }
                    />
                    <Text style={[s.flexText, step.done && s.done]}>
                      {step.text}
                    </Text>
                  </View>
                ))}
                <Button
                  title="Delete routine"
                  secondary
                  onPress={() => dispatch({ type: "delete-routine", id: r.id })}
                />
              </Card>
            ))}
            {nav("Try AI Makeover", "studio", true)}
            {nav("Optional products for this look", "complete", true)}
          </>
        );
      case "studio":
        return (
          <>
            {heading(
              "Explore your look.",
              "Keep your identity, complexion and original. Choose the styling direction yourself.",
            )}
            <Text accessibilityRole="header" style={s.h2}>
              Your Results
            </Text>
            {photo ? localPhoto() : hero(2)}
            <Text style={s.badge}>
              {photo
                ? "Original · No generated result"
                : "Editorial inspiration · Not your result"}
            </Text>
            <View style={s.chips}>
              {tools.map((n) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: state.tool === n }}
                  key={n}
                  style={[s.chip, state.tool === n && s.selected]}
                  onPress={() => dispatch({ type: "tool", value: n })}
                >
                  <Text style={state.tool === n ? s.white : s.small}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <Card>
              <Text style={s.h2}>{state.tool}</Text>
              <View style={s.chips}>
                {directions.map((n) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: state.style === n }}
                    key={n}
                    style={[s.chip, state.style === n && s.selected]}
                    onPress={() => dispatch({ type: "style", value: n })}
                  >
                    <Text style={state.style === n ? s.white : s.small}>
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.label}>
                Requested intensity: {state.intensity}%
              </Text>
              <View style={s.switchRow}>
                <Button
                  title="Less"
                  secondary
                  onPress={() =>
                    dispatch({ type: "intensity", value: state.intensity - 10 })
                  }
                />
                <Button
                  title="More"
                  secondary
                  onPress={() =>
                    dispatch({ type: "intensity", value: state.intensity + 10 })
                  }
                />
              </View>
              <Button
                title={compare ? "View original" : "Compare availability"}
                secondary
                onPress={() => {
                  setCompare(!compare);
                  setMessage(
                    "No AI result exists to compare. The original has not been edited.",
                  );
                }}
              />
              <Note text={capabilityReasons.studio} />
              <Button title="Generate — connection required" disabled />
              {nav("Choose / change photo", "consent", true)}
              <Button
                title="Reset controls"
                secondary
                onPress={() => {
                  dispatch({ type: "style", value: directions[0] });
                  dispatch({ type: "intensity", value: 35 });
                  setCompare(false);
                }}
              />
            </Card>
            {nav("Optional Complete the Look", "complete", true)}
          </>
        );
      case "advisor":
        return (
          <>
            {heading(
              "A little guidance.",
              "Questions, routines and technique guidance without pressure to buy.",
            )}
            <Card>
              <Text style={s.h2}>What would you like to explore?</Text>
              <TextInput
                accessibilityLabel="Your advisor question"
                style={[s.input, s.textarea]}
                placeholder="A five-minute getting-ready routine?"
                value={question}
                maxLength={2000}
                multiline
                onChangeText={setQuestion}
              />
              <Button
                title="Check advisor connection"
                disabled={!question.trim()}
                onPress={() => setMessage(capabilityReasons.advisor)}
              />
              {nav("Build my own routine", "guide", true)}
            </Card>
          </>
        );
      case "profile":
        return (
          <>
            {heading(
              "Your space. Your choices.",
              "Your private goals, session routines and authorized workspaces.",
            )}
            <Card>
              <Text style={s.h2}>Personal account</Text>
              <Note text={capabilityReasons.account} />
              <Button
                title="Continue with Google"
                onPress={() =>
                  setMessage(
                    "Sign-in awaits the selected Supabase connection. No password is collected.",
                  )
                }
              />
              <Button
                title="Switch workspace"
                secondary
                onPress={() => setSwitcher(true)}
              />
            </Card>
            {[
              ["Saved reports & looks", "history"],
              ["My routines", "guide"],
              ["Privacy & local photos", "privacy"],
              ["Digital Wardrobe", "wardrobe"],
              ["Style Calendar", "calendar"],
              ["Group styling", "groups"],
              ["Shopping Agent", "agent"],
            ].map(([n, p]) => (
              <Button
                key={n}
                title={n}
                secondary
                onPress={() => go(p as Page)}
              />
            ))}
            <Card>
              <Text style={s.h2}>Style DNA</Text>
              <Text style={s.body}>
                {state.interests.join(" · ") || "No session interests chosen."}
              </Text>
              <Button
                title="Clear selected interests"
                secondary
                onPress={() =>
                  state.interests.forEach((value) =>
                    dispatch({ type: "toggle", key: "interests", value }),
                  )
                }
              />
            </Card>
          </>
        );
      case "history":
        return (
          <>
            {heading(
              "Your history belongs to you.",
              "Real completed operations will appear here.",
            )}
            <Card>
              <Text style={s.h2}>No saved analysis reports.</Text>
              <Text style={s.body}>
                No photo has been analyzed or transformed.
              </Text>
              {nav("Start Face Analysis", "analyze")}
              {nav("View session routines", "guide", true)}
            </Card>
          </>
        );
      case "privacy":
        return (
          <>
            {heading(
              "Private by default.",
              "Clear the app-owned cached preview without deleting your original photo.",
            )}
            <Card>
              <Text style={s.listItem}>
                Local preview: {photo ? "One cached copy" : "None"}
              </Text>
              <Text style={s.listItem}>Server upload: None</Text>
              <Text style={s.listItem}>
                Session routines: {state.routines.length}
              </Text>
              <Button
                title="Clear cached photo"
                secondary
                onPress={() => {
                  if (clearPhoto())
                    setMessage(
                      "App-owned cached preview deleted. Your source library photo is unchanged.",
                    );
                }}
              />
              <Button
                title="Clear all session data"
                onPress={() =>
                  Alert.alert(
                    "Clear session data?",
                    "This removes local preview, interests and routines. Your source photo stays unchanged.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Clear",
                        style: "destructive",
                        onPress: () => {
                          if (clearPhoto()) {
                            dispatch({ type: "reset" });
                            setSavedRequirements([]);
                            setMessage("Session cleared.");
                          }
                        },
                      },
                    ],
                  )
                }
              />
              <Button
                title="Server export / deletion — sign-in required"
                disabled
              />
            </Card>
          </>
        );
      case "explore":
        return (
          <>
            {heading(
              "Optional inspiration.",
              "Looks, products and professionals when you choose to recreate a style.",
            )}
            {hero(1)}
            {nav("Complete the Look", "complete")}
            {nav("Screenshot to Shop", "screenshot", true)}
            {nav("Plan within a budget", "budget", true)}
            {nav("Book the Exact Look", "booking", true)}
          </>
        );
      case "complete":
        return (
          <>
            {heading(
              "Complete the Look.",
              "An optional checklist, never a fabricated offer.",
            )}
            {[
              "Hair & grooming",
              "Makeup",
              "Clothing",
              "Shoes & bag",
              "Accessories",
              "Professional service",
            ].map((n) => (
              <Card key={n}>
                <Text style={s.h2}>{n}</Text>
                <Text style={s.body}>
                  Price pending · Availability unverified · Feasibility / quote
                  needed
                </Text>
              </Card>
            ))}
            <Note text={capabilityReasons.commerce} />
            <Button title="Merchant handoff — unavailable" disabled />
            {nav("Plan within my budget", "budget", true)}
            {nav("Book the Exact Look", "booking", true)}
          </>
        );
      default:
        return (
          <>
            {heading(
              (
                {
                  screenshot: "Screenshot to Shop",
                  budget: "Complete My Look Within My Budget",
                  booking: "Book the Exact Look",
                  wardrobe: "Digital Wardrobe",
                  calendar: "Style Calendar",
                  groups: "Group styling",
                  agent: "Shopping Agent",
                } as Partial<Record<Page, string>>
              )[state.page] || "Your style plan",
              "Prepare a session note. No image match, invite, reminder, booking, price or purchase is confirmed.",
            )}
            <Card>
              <TextInput
                accessibilityLabel="Optional planning note"
                style={[s.input, s.textarea]}
                multiline
                maxLength={2000}
                placeholder="Your goal, context and permissions"
                value={plan}
                onChangeText={setPlan}
              />
              <Button
                title="Keep session planning note"
                disabled={!plan.trim()}
                onPress={() =>
                  setMessage(
                    "Note remains in app memory only. No request or transaction was sent.",
                  )
                }
              />
              <Note
                text={
                  state.page === "screenshot"
                    ? "Exact matches need verified source / SKU evidence; visual similarity must be labeled Similar."
                    : capabilityReasons.commerce
                }
              />
              <Button title="Connect required service to continue" disabled />
              {nav("Build a session routine instead", "guide", true)}
            </Card>
          </>
        );
    }
  }
  const activeTab = reviewRole ? workspaces[reviewRole].mobile : mobileTabs;
  return (
    <View style={s.app}>
      <View style={s.topbar}>
        <Text style={s.brand}>✧ GLAM AI</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => {
            setReviewRole(null);
            go("profile");
          }}
          style={s.avatar}
        >
          <Text>○</Text>
        </Pressable>
      </View>
      <View style={s.connection}>
        <Text style={s.fine}>
          {reviewRole
            ? "Business tools review · No authorized workspace"
            : "Private development build · Connections pending"}
        </Text>
      </View>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[
          s.content,
          { maxWidth: 740, alignSelf: "center", width: "100%" },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {!!error && (
          <View accessibilityRole="alert" style={s.error}>
            <Text style={s.errorText}>{error}</Text>
            <Button
              title="Open device settings"
              secondary
              onPress={() => Linking.openSettings()}
            />
          </View>
        )}
        {!!message && <Note text={message} />}
        {reviewRole ? (
          <>
            <Title
              title={workspaces[reviewRole].title}
              copy="Only approved roles may activate a real workspace. This is a public tools inventory."
            />
            <Note text="Identity, eligibility, organization membership and verified capability are not connected. No privileged records or actions are available." />
            <ScrollView horizontal contentContainerStyle={s.chips}>
              {workspaces[reviewRole].modules.map((n, i) => (
                <Pressable
                  accessibilityRole="button"
                  key={n.name}
                  style={[s.chip, module === i && s.selected]}
                  onPress={() => setModule(i)}
                >
                  <Text style={module === i ? s.white : s.small}>{n.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Card>
              <Text style={s.h2}>
                {workspaces[reviewRole].modules[module].name}
              </Text>
              {workspaces[reviewRole].modules[module].fields.map((n) => (
                <Text key={n} style={s.listItem}>
                  {n} · Connection required
                </Text>
              ))}
              <Button title="Verified organization required" disabled />
            </Card>
            {reviewRole === "merchant" &&
              workspaces[reviewRole].modules[module].name === "Snap & List" && (
                <MerchantSnapList />
              )}
            <Button
              title="Return to Personal"
              secondary
              onPress={() => {
                setReviewRole(null);
                go("profile");
              }}
            />
          </>
        ) : (
          <>
            {content()}
            {[
              "report",
              "hair",
              "skin",
              "body-fit",
              "color",
              "guide",
              "studio",
            ].includes(state.page) && (
              <ContextualRecommendations
                key={recommendationContext}
                context={recommendationContext}
                saved={savedRequirements}
                onSave={(r) => setSavedRequirements([...savedRequirements, r])}
                onDelete={(id) =>
                  setSavedRequirements(
                    savedRequirements.filter((r) => r.id !== id),
                  )
                }
                onComplete={() => go("complete")}
              />
            )}
          </>
        )}
      </ScrollView>
      <View accessibilityRole="tablist" style={s.bottomNav}>
        {activeTab.map((n, i) => (
          <Pressable
            key={n}
            accessibilityRole="tab"
            accessibilityState={{
              selected: reviewRole ? i === 0 : state.page === tabPage[n],
            }}
            onPress={() => {
              if (reviewRole) {
                if (n === "Profile") {
                  setReviewRole(null);
                  go("profile");
                } else {
                  setModule(
                    Math.min(i, workspaces[reviewRole].modules.length - 1),
                  );
                  scroll.current?.scrollTo({ y: 0, animated: false });
                }
              } else go(tabPage[n]);
            }}
            style={[
              s.tab,
              !reviewRole && state.page === tabPage[n] && s.activeTab,
            ]}
          >
            <Text style={s.tabSymbol}>{["⌂", "⌖", "✧", "☰", "○"][i]}</Text>
            <Text numberOfLines={2} style={s.tabText}>
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
      <Modal
        visible={switcher}
        animationType="slide"
        onRequestClose={() => setSwitcher(false)}
        transparent
      >
        <View style={s.modalOverlay}>
          <View accessibilityViewIsModal style={s.modal}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text accessibilityRole="header" style={s.h2}>
                Switch workspace
              </Text>
              <Note text="No approved business memberships are connected. Reviewing tools never grants a role." />
              <Button
                title="Personal — current workspace"
                onPress={() => {
                  setReviewRole(null);
                  setSwitcher(false);
                }}
              />
              {Object.entries(workspaces).map(([id, c]) => (
                <Button
                  key={id}
                  title={`Review ${c.title} tools`}
                  secondary
                  onPress={() => {
                    setReviewRole(id as Role);
                    setModule(0);
                    setSwitcher(false);
                    setMessage("");
                    setPlan("");
                  }}
                />
              ))}
              <Button
                title="Close switcher"
                secondary
                onPress={() => setSwitcher(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: "#f8f4f0",
    paddingTop: Platform.OS === "ios" ? 55 : 35,
  },
  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  brand: {
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -1,
    color: "#17151a",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ddd6d2",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  connection: {
    paddingVertical: 7,
    paddingHorizontal: 20,
    backgroundColor: "#eee8e4",
    alignItems: "center",
  },
  content: { padding: 20, paddingBottom: 35 },
  heading: { marginTop: 14, marginBottom: 20 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#8f3157",
    marginVertical: 14,
  },
  title: {
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 40,
    lineHeight: 43,
    color: "#17151a",
    marginBottom: 18,
  },
  heroTitle: {
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 48,
    lineHeight: 50,
    color: "#17151a",
    marginBottom: 18,
  },
  h2: { fontSize: 21, fontWeight: "600", color: "#17151a", marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 25, color: "#69636c", marginBottom: 15 },
  small: { fontSize: 13, lineHeight: 20, color: "#69636c" },
  fine: { fontSize: 12, lineHeight: 19, color: "#69636c" },
  button: {
    minHeight: 48,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 19,
    backgroundColor: "#17151a",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 7,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#aba0a9",
  },
  secondaryText: { color: "#17151a" },
  disabled: { backgroundColor: "#e9e4e1" },
  disabledText: { color: "#625b64" },
  card: {
    padding: 23,
    backgroundColor: "white",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ddd6d2",
    marginVertical: 10,
  },
  notice: {
    padding: 16,
    backgroundColor: "#eee8f3",
    borderRadius: 15,
    marginVertical: 13,
  },
  noticeText: { fontSize: 13, lineHeight: 21, color: "#49354d" },
  error: {
    padding: 18,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#a33440",
    marginVertical: 15,
  },
  errorText: { color: "#8e2032", fontSize: 14 },
  editorial: {
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "#d5c3b6",
    marginBottom: 13,
  },
  photoLabel: {
    position: "absolute",
    top: 16,
    right: 12,
    backgroundColor: "#f8f4f0ee",
    padding: 9,
    borderRadius: 20,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginVertical: 25,
  },
  quickCard: {
    width: "48%",
    minHeight: 160,
    padding: 17,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd6d2",
    backgroundColor: "white",
  },
  listItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#ddd6d2",
    fontSize: 14,
    lineHeight: 22,
    color: "#17151a",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginVertical: 14 },
  chip: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#aba0a9",
    borderRadius: 25,
    justifyContent: "center",
  },
  selected: { backgroundColor: "#17151a", borderColor: "#17151a" },
  white: { fontSize: 13, color: "white" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 10,
    minHeight: 48,
    flexWrap: "wrap",
  },
  flexText: { flex: 1, fontSize: 14, lineHeight: 23, color: "#17151a" },
  input: {
    borderWidth: 1,
    borderColor: "#847c87",
    borderRadius: 12,
    minHeight: 50,
    padding: 14,
    fontSize: 16,
    color: "#17151a",
    backgroundColor: "white",
    marginBottom: 15,
  },
  textarea: { minHeight: 150, textAlignVertical: "top" },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginVertical: 12,
    color: "#17151a",
  },
  localPhoto: {
    width: "100%",
    height: 430,
    resizeMode: "contain",
    backgroundColor: "#eee8e4",
    borderRadius: 20,
    marginVertical: 15,
  },
  palette: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
    padding: 35,
    borderRadius: 25,
    backgroundColor: "#e9d6d3",
    marginVertical: 15,
  },
  swatch: { width: 65, height: 110, borderRadius: 40 },
  badge: { fontSize: 12, color: "#625b64", marginVertical: 12 },
  done: { textDecorationLine: "line-through", color: "#69636c" },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderColor: "#ddd6d2",
    backgroundColor: "white",
    paddingTop: 9,
    paddingBottom: Platform.OS === "ios" ? 25 : 13,
    paddingHorizontal: 4,
  },
  tab: {
    minHeight: 56,
    width: "19%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    padding: 5,
  },
  activeTab: { backgroundColor: "#f5e6ec" },
  tabSymbol: { fontSize: 22, color: "#69636c" },
  tabText: {
    fontSize: 10,
    lineHeight: 14,
    color: "#17151a",
    textAlign: "center",
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#17151a66",
    justifyContent: "flex-end",
  },
  modal: {
    padding: 25,
    paddingBottom: 35,
    backgroundColor: "#f8f4f0",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "95%",
  },
});
