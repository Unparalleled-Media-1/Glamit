import { BeautyHome } from "./BeautyExperience";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";
import type { Page } from "../../packages/product/platform";
import {
  changePart,
  freshJourney,
  goalJourneys,
  lookParts,
  partChoices,
  saveLook,
} from "../../packages/product/journey";
import type { Journey, LookPart } from "../../packages/product/journey";
type Props = {
  page: Page;
  data: Journey;
  setData: Dispatch<SetStateAction<Journey>>;
  go: (p: Page) => void;
};
function Action({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.action, secondary && s.secondary, disabled && { opacity: 0.5 }]}
    >
      <Text style={[s.actionText, secondary && { color: "#382631" }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export default function StylingJourney({ page, data: d, setData, go }: Props) {
  const [part, setPart] = useState<LookPart>("Hair");
  const [draft, setDraft] = useState("");
  const [item, setItem] = useState("");
  const [note, setNote] = useState("");
  const [rights, setRights] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const attachmentRef = useRef<string | null>(null);
  const selection = useRef(0);
  const live = useRef(true);
  const erase = (uri: string | null) => {
    if (uri && uri.startsWith(Paths.cache.uri)) {
      try {
        const f = new File(uri);
        if (f.exists) f.delete();
      } catch {
        if (live.current)
          setNote(
            "A cached reference could not be removed. Clear the app cache in device settings.",
          );
      }
    }
  };
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      selection.current++;
      erase(attachmentRef.current);
    };
  }, []);
  const patch = (key: keyof Journey, value: string | boolean) =>
    setData((p) => ({ ...p, [key]: value }));
  const field = (
    key:
      | "name"
      | "preferences"
      | "country"
      | "city"
      | "currency"
      | "event"
      | "date"
      | "deadline"
      | "theme"
      | "budget",
    label: string,
  ) => (
    <View key={key} style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={s.input}
        value={d[key]}
        maxLength={key === "preferences" ? 1000 : 160}
        onChangeText={(v) => patch(key, v)}
        autoCapitalize="sentences"
      />
    </View>
  );
  const button = (title: string, p: Page, secondary = false) => (
    <Action title={title} onPress={() => go(p)} secondary={secondary} />
  );
  const heading = (eye: string, title: string, copy: string) => (
    <View style={s.heading}>
      <Text style={s.eyebrow}>{eye}</Text>
      <Text accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      <Text style={s.body}>{copy}</Text>
    </View>
  );
  const memory = (
    <View style={s.memory}>
      <Switch
        accessibilityLabel="Remember approved profile on this device"
        value={d.remember}
        onValueChange={(v) => patch("remember", v)}
      />
      <Text style={s.small}>
        Remember approved text, looks and wardrobe on this device. No photos or
        conversations. Account sync is not connected.
      </Text>
    </View>
  );
  const market = (
    <>
      {field("country", "Shopping country")}
      {field("city", "Delivery / service city")}
      <Text style={s.label}>Currency</Text>
      <View style={s.row}>
        {["ZAR", "USD", "GBP", "EUR"].map((v) => (
          <Action
            key={v}
            title={v + (v === d.currency ? " ✓" : "")}
            secondary
            onPress={() => patch("currency", v)}
          />
        ))}
      </View>
    </>
  );
  const attachments = (
    <View style={s.card}>
      <View style={s.memory}>
        <Switch
          accessibilityLabel="I have permission to preview this inspiration"
          value={rights}
          onValueChange={(v) => {
            setRights(v);
            if (!v) {
              selection.current++;
              erase(attachmentRef.current);
              attachmentRef.current = null;
              setAttachment(null);
            }
          }}
        />
        <Text style={s.small}>
          I have permission to preview this inspiration or invitation image
          locally.
        </Text>
      </View>
      <Action
        title="Add inspiration / invitation photo"
        secondary
        disabled={!rights}
        onPress={async () => {
          const id = ++selection.current;
          try {
            const permission =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              setNote(
                "Photo access denied. You can still describe your inspiration.",
              );
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              exif: false,
              allowsEditing: false,
              quality: 1,
            });
            if (result.canceled) return;
            const a = result.assets[0];
            if (!live.current || selection.current !== id) {
              erase(a.uri);
              return;
            }
            if (
              !a.fileSize ||
              a.fileSize > 10485760 ||
              a.width * a.height > 40000000
            ) {
              erase(a.uri);
              setNote("Choose an image under 10 MB and 40 megapixels.");
              return;
            }
            erase(attachmentRef.current);
            attachmentRef.current = a.uri;
            setAttachment(a.uri);
            setNote("Local reference only. It has not been read by AI.");
          } catch {
            if (live.current)
              setNote("The image could not be selected. Try again.");
          }
        }}
      />
      {attachment && (
        <>
          <Image
            source={{ uri: attachment }}
            style={s.reference}
            accessibilityLabel="Your local inspiration, not an AI result"
          />
          <Action
            title="Remove inspiration"
            secondary
            onPress={() => {
              selection.current++;
              erase(attachmentRef.current);
              attachmentRef.current = null;
              setAttachment(null);
            }}
          />
        </>
      )}
    </View>
  );
  const chosen = lookParts.filter((k) => d.look.parts[k]);
  let content;
  if (page === "home")
    return (
      <BeautyHome
        data={d}
        go={go}
        setup={() => {
          patch("onboarded", true);
          go("profile");
        }}
      />
    );
  if (["advisor", "event", "screenshot"].includes(page))
    content = (
      <>
        {heading(
          "THE PERSONAL STYLIST",
          page === "event"
            ? "Dress for the moment."
            : page === "screenshot"
              ? "Inspired by a look? Make it yours."
              : "Let’s make it feel like you.",
          "One styling brief, from first idea to finishing touch.",
        )}
        <View style={{ gap: 8 }}>
          <Action title="AI Personal Stylist" onPress={() => go("advisor")} />
          <Action title="Event Stylist" onPress={() => go("event")} />
          <Action
            title="Destination & Weather Stylist"
            onPress={() => go("destination")}
          />
          <Action title="Personalized Results" onPress={() => go("results")} />
        </View>
        <View style={s.card}>
          <Text style={s.symbol}>✧</Text>
          <Text style={s.section}>Start anywhere.</Text>
          <Text style={s.body}>
            Describe your occasion, a color you love, or a piece you already
            own.
          </Text>
          <Text style={s.small}>
            Draft conversation · AI stylist not connected
          </Text>
          {d.messages.map((v, i) => (
            <View style={s.message} key={i}>
              <Text style={s.eyebrow}>YOU · SESSION BRIEF</Text>
              <Text>{v}</Text>
            </View>
          ))}
          <Text style={s.label}>Your styling goal or refinement</Text>
          <TextInput
            accessibilityLabel="Your styling goal or refinement"
            multiline
            style={[s.input, { minHeight: 100 }]}
            value={draft}
            onChangeText={setDraft}
            maxLength={2000}
            placeholder="A wedding in Cape Town, emerald tones, under R4,000…"
          />
          <Action
            title="Add to my brief"
            disabled={!draft.trim()}
            onPress={() => {
              setData((p) => ({
                ...p,
                messages: [...p.messages, draft.trim()].slice(-30),
              }));
              setDraft("");
              setNote(
                "Added to your session brief. No AI reply was generated.",
              );
            }}
          />
        </View>
        {attachments}
        <View style={s.card}>
          <Text style={s.section}>The details make it yours.</Text>
          {field("event", "Occasion / event")}
          {field("theme", "Theme / dress code (your input)")}
          {field("date", "Event date (YYYY-MM-DD)")}
          {field("deadline", "Needed by (YYYY-MM-DD)")}
          {field("budget", "Total budget, including delivery")}
          {field("preferences", "Comfort, coverage, fit & colors")}
          {market}
          <Text style={s.small}>
            User-provided theme. Event details, delivery and feasibility are not
            verified.
          </Text>
          {button("Shape my look", "builder")}
          {memory}
        </View>
      </>
    );
  else if (page === "builder")
    content = (
      <>
        {heading(
          "LIVE LOOK BUILDER",
          "Every detail. Still you.",
          "Change one element, keep everything else. These are styling notes, not a generated result.",
        )}
        <View style={s.card}>
          <Text style={s.label}>Look name</Text>
          <TextInput
            accessibilityLabel="Look name"
            value={d.look.title}
            maxLength={100}
            onChangeText={(v) =>
              setData((p) => ({ ...p, look: { ...p.look, title: v } }))
            }
            style={s.input}
          />
          <Text style={s.small}>{chosen.length}/5 elements chosen</Text>
          <View style={s.row}>
            {lookParts.map((k) => (
              <Action
                key={k}
                title={k + (d.look.parts[k] ? " ✓" : "")}
                secondary={part !== k}
                onPress={() => setPart(k)}
              />
            ))}
          </View>
          <Text accessibilityRole="header" style={s.section}>
            {part}
          </Text>
          <View style={s.options}>
            {partChoices[part].map((v, i) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: d.look.parts[part] === v }}
                onPress={() => setData((p) => changePart(p, part, v))}
                key={v}
                style={[s.option, d.look.parts[part] === v && s.chosen]}
              >
                <View
                  style={[
                    s.swatch,
                    {
                      backgroundColor: [
                        "#b59b83",
                        "#61423b",
                        "#426755",
                        "#bc8383",
                        "#665b70",
                      ][i],
                    },
                  ]}
                />
                <Text style={s.optionText}>{v}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.label}>Your own {part.toLowerCase()} choice</Text>
          <TextInput
            accessibilityLabel={"Your own " + part.toLowerCase() + " choice"}
            style={s.input}
            maxLength={240}
            value={d.look.parts[part]}
            onChangeText={(v) => setData((p) => changePart(p, part, v))}
          />
          <Action
            title={"Clear " + part.toLowerCase() + " only"}
            secondary
            onPress={() => setData((p) => changePart(p, part, ""))}
          />
          {lookParts.map((k) => (
            <View key={k} style={s.summary}>
              <Text style={s.small}>{k}</Text>
              <Text style={s.summaryValue}>
                {d.look.parts[k] || "Open to possibilities"}
              </Text>
            </View>
          ))}
          <Action
            title="Save this look ♡"
            secondary
            disabled={!chosen.length || !d.look.title.trim()}
            onPress={() => {
              setData((p) =>
                saveLook(
                  { ...p, onboarded: true },
                  p.look.id === "current" ? String(Date.now()) : p.look.id,
                ),
              );
              setNote(
                d.remember
                  ? "Approved look metadata saved on this device."
                  : "Look saved for this session. Enable Remember in Profile to keep after restart.",
              );
            }}
          />
          {button("Get This Look", "complete")}
        </View>
      </>
    );
  else if (page === "complete")
    content = (
      <>
        {heading(
          "GET THIS LOOK",
          "From a look to real life.",
          "Your chosen elements, with room for the right products and people.",
        )}
        <View style={s.card}>
          <Text style={s.section}>{d.look.title}</Text>
          {lookParts.map((k) => (
            <View style={s.summary} key={k}>
              <Text style={s.label}>{k}</Text>
              <Text style={s.summaryValue}>
                {d.look.parts[k] || "Not selected"}
              </Text>
            </View>
          ))}
          {button("Edit my look", "builder", true)}
        </View>
        <View style={s.card}>
          {market}
          {button("Explore the beauty edit", "shop", true)}
          <Text style={s.section}>Total delivered cost: not yet known</Text>
          <Text style={s.body}>
            Best matches: no verified products or professionals yet. Prices,
            variants, stock, merchant identity and delivery estimates need
            qualified listings.
          </Text>
          <Text style={s.body}>
            Sponsored matches: no eligible offers. Paid placements meet the same
            requirements.
          </Text>
          {button("Prepare a professional / tailor brief", "booking", true)}
          <Text style={s.small}>
            Checkout and bookings are not connected. GLAM’s 10% item-sale
            commission is a merchant deduction on completed eligible sales.
            Service fees are not set.
          </Text>
        </View>
      </>
    );
  else if (page === "wardrobe")
    content = (
      <>
        {heading(
          "YOUR WARDROBE",
          "A fresh look. A familiar favorite.",
          "Start with what you own. Your item notes are private and editable.",
        )}
        <View style={s.card}>
          <TextInput
            accessibilityLabel="Wardrobe item"
            placeholder="My black blazer, size M"
            value={item}
            maxLength={160}
            onChangeText={setItem}
            style={s.input}
          />
          <Action
            title="Add wardrobe item"
            disabled={!item.trim() || d.wardrobe.length >= 80}
            onPress={() => {
              setData((p) => ({
                ...p,
                wardrobe: [
                  ...p.wardrobe,
                  { id: String(Date.now()), name: item.trim() },
                ],
              }));
              setItem("");
            }}
          />
        </View>
        {!d.wardrobe.length && (
          <Text style={s.body}>
            Your style has a starting point. Add your first piece above.
          </Text>
        )}
        {d.wardrobe.map((v) => (
          <View style={s.card} key={v.id}>
            <TextInput
              accessibilityLabel={"Edit " + v.name}
              maxLength={160}
              style={s.input}
              value={v.name}
              onChangeText={(name) =>
                setData((p) => ({
                  ...p,
                  wardrobe: p.wardrobe.map((w) =>
                    w.id === v.id ? { ...w, name } : w,
                  ),
                }))
              }
            />
            <Action
              title="Style this piece"
              secondary
              onPress={() => {
                setData((p) => changePart(p, "Clothing", v.name));
                go("builder");
              }}
            />
            <Action
              title="Delete item"
              secondary
              onPress={() =>
                setData((p) => ({
                  ...p,
                  wardrobe: p.wardrobe.filter((w) => w.id !== v.id),
                }))
              }
            />
          </View>
        ))}
        {memory}
      </>
    );
  else if (page === "profile")
    content = (
      <View style={s.card}>
        <Text style={s.eyebrow}>YOUR GLAM PROFILE</Text>
        <Text style={s.section}>A memory you control.</Text>
        {field("name", "What should we call you?")}
        {field("preferences", "Your styling & shopping preferences")}
        {memory}
        {market}
        <Text style={s.section}>Saved looks ({d.saved.length})</Text>
        {!d.saved.length && <Text style={s.small}>No saved looks yet.</Text>}
        {d.saved.map((l) => (
          <View key={l.id} style={s.saved}>
            <Text style={s.section}>{l.title}</Text>
            <Action
              title="Open & edit look"
              secondary
              onPress={() => {
                setData((p) => ({
                  ...p,
                  look: { ...l, parts: { ...l.parts } },
                }));
                go("builder");
              }}
            />
            <Action
              title="Delete saved look"
              secondary
              onPress={() =>
                setData((p) => ({
                  ...p,
                  saved: p.saved.filter((v) => v.id !== l.id),
                }))
              }
            />
          </View>
        ))}
        {button("Create a look", "builder", true)}
        <Text style={s.small}>
          No selfies, attachments, conversations or uncomputed analysis reports
          are saved in this profile.
        </Text>
        <Action
          title="Delete my GLAM Profile on this device"
          secondary
          onPress={() => {
            setData(freshJourney());
            setNote("Profile, looks, wardrobe and session brief cleared.");
          }}
        />
      </View>
    );
  return (
    <>
      {content}
      {!!note && (
        <View accessibilityRole="alert" style={s.status}>
          <Text>{note}</Text>
        </View>
      )}
    </>
  );
}
const s = StyleSheet.create({
  heading: { marginBottom: 22 },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#8f3157",
    marginBottom: 9,
  },
  title: {
    fontFamily: "serif",
    fontSize: 36,
    lineHeight: 40,
    color: "#251e21",
    letterSpacing: -1,
    marginBottom: 15,
  },
  body: { fontSize: 14, lineHeight: 22, color: "#69636c", marginBottom: 14 },
  small: { fontSize: 11, lineHeight: 18, color: "#6d5a65", flexShrink: 1 },
  primaryRow: { flexDirection: "row", gap: 8 },
  action: {
    backgroundColor: "#30262c",
    borderRadius: 8,
    minHeight: 50,
    padding: 13,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 7,
  },
  actionText: {
    color: "#fffaf7",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  secondary: {
    backgroundColor: "#eee4e7",
    borderWidth: 1,
    borderColor: "#d8c6ce",
  },
  section: {
    fontFamily: "serif",
    fontSize: 25,
    color: "#251e21",
    marginVertical: 18,
  },
  goals: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  goal: {
    width: "48%",
    padding: 15,
    minHeight: 165,
    backgroundColor: "#eee3d8",
    borderWidth: 1,
    borderColor: "#ded0c5",
    borderRadius: 5,
  },
  goalIndex: { fontSize: 10, color: "#8f3157", marginBottom: 17 },
  goalTitle: {
    fontFamily: "serif",
    fontSize: 19,
    color: "#30262c",
    lineHeight: 23,
    marginBottom: 8,
  },
  goalCopy: { fontSize: 10, lineHeight: 16, color: "#6d5a65" },
  card: {
    padding: 20,
    backgroundColor: "#fffbf6",
    borderWidth: 1,
    borderColor: "#dfd4cf",
    borderRadius: 6,
    marginBottom: 20,
  },
  field: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: "600", color: "#493840", marginBottom: 9 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#a18b96",
    borderRadius: 8,
    minHeight: 48,
    padding: 12,
    color: "#30262c",
    marginBottom: 10,
  },
  memory: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginVertical: 18,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  message: {
    backgroundColor: "#f0e1e8",
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    marginLeft: 20,
  },
  symbol: { fontSize: 40, color: "#8f3157" },
  reference: {
    height: 220,
    resizeMode: "contain",
    backgroundColor: "#eee3d8",
    marginVertical: 15,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    width: "30%",
    padding: 8,
    borderWidth: 1,
    borderColor: "#d8c6ce",
    minHeight: 105,
    borderRadius: 5,
  },
  chosen: {
    borderColor: "#8f3157",
    borderWidth: 2,
    backgroundColor: "#f6e5ed",
  },
  swatch: { height: 40, borderRadius: 3, marginBottom: 8 },
  optionText: { fontSize: 10, color: "#493840" },
  summary: {
    borderBottomWidth: 1,
    borderColor: "#ddd1cd",
    paddingVertical: 14,
    gap: 8,
  },
  summaryValue: { fontSize: 14, color: "#493840" },
  saved: { backgroundColor: "#eee5df", padding: 15, marginBottom: 15 },
  status: {
    borderLeftWidth: 2,
    borderColor: "#8f3157",
    padding: 18,
    backgroundColor: "#f4e7ec",
    marginBottom: 20,
  },
});
