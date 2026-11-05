import {
  rememberChoice,
  undoChoice,
} from "../../packages/product/studio-history";
import type { StudioChoice } from "../../packages/product/studio-history";
import design from "../../packages/product/consumer-design.json";
import { useState } from "react";
import {
  Image,
  Pressable,
  Share,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Page, Photo } from "../../packages/product/platform";
import { tools } from "../../packages/product/platform";
import {
  beautyCategories,
  beautyEdits,
  shadeFamilies,
  colorMoods,
  studioDirections,
} from "../../packages/product/beauty";
import type { Journey } from "../../packages/product/journey";
import { goalJourneys } from "../../packages/product/journey";
export function Portrait({
  panel = 0,
  height = 260,
}: {
  panel?: number;
  height?: number;
}) {
  const [width, setWidth] = useState(300);
  const w = Math.max(width, height * 0.75);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height, overflow: "hidden", backgroundColor: "#332b2f" }}
    >
      <Image
        source={require("./assets/beauty-editorial.webp")}
        accessibilityLabel="Original fictional adult editorial inspiration, not a personal result"
        style={{
          position: "absolute",
          width: w * 4,
          height: (w * 4) / 3,
          left: -panel * w - (w - width) / 2,
          top: -((w * 4) / 3 - height) * 0.25,
        }}
      />
    </View>
  );
}
function Action({
  title,
  onPress,
  outline = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  outline?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.action,
        outline && s.outline,
        disabled && { backgroundColor: "#40363c", opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          s.actionText,
          outline && { color: "#f7ccdf" },
          disabled && { color: "#d4bfcb" },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function BeautyHome({
  data: d,
  go,
  setup,
}: {
  data: Journey;
  go: (p: Page) => void;
  setup: () => void;
}) {
  const [category, setCategory] = useState(0);
  return (
    <>
      <View style={s.welcome}>
        <View>
          <Text style={s.kicker}>YOUR DAILY DOSE OF YOU</Text>
          <Text accessibilityRole="header" style={s.title}>
            {d.onboarded
              ? "Welcome back" + (d.name ? ", " + d.name : "") + "."
              : "Your next look."}
          </Text>
        </View>
        <Text style={s.mark}>✧</Text>
      </View>
      <View style={s.entry}>
        <View style={s.flex}>
          <Action title="Analyze My Face" onPress={() => go("analyze")} />
        </View>
        <View style={s.flex}>
          <Action
            title="Ask My Personal Stylist"
            outline
            onPress={() => go("advisor")}
          />
        </View>
      </View>
      <View style={s.feature}>
        <View style={s.categories}>
          {beautyCategories.map((v, i) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: category === i }}
              onPress={() => setCategory(i)}
              style={[
                s.category,
                category === i && { backgroundColor: "#444041" },
              ]}
              key={v}
            >
              <Text style={s.categoryText}>{v}</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.campaign}>
          <Portrait panel={category} />
          <View style={s.campaignTag}>
            <Text style={s.tiny}>THE GLAM EDIT</Text>
            <Text style={s.tiny}>0{category + 1} / 04</Text>
          </View>
          <View style={s.campaignCopy}>
            <Text style={s.kicker}>BEAUTY, ON YOUR TERMS</Text>
            <Text style={s.campaignTitle}>
              {
                [
                  "Meet your\nsignature glow.",
                  "A fresh take.\nStill all you.",
                  "Your skin.\nA little clarity.",
                  "Wear your\npoint of view.",
                ][category]
              }
            </Text>
            <Action
              title={
                category === 0
                  ? "Begin analysis"
                  : "Explore " + beautyCategories[category].toLowerCase()
              }
              onPress={() =>
                go((["analyze", "studio", "skin", "event"] as Page[])[category])
              }
            />
          </View>
          <Text style={s.credit}>Editorial inspiration</Text>
        </View>
      </View>
      <View style={s.teasers}>
        <Pressable
          accessibilityRole="button"
          style={s.paletteTeaser}
          onPress={() => go("color")}
        >
          <View style={s.miniPalette}>
            {["#ba7885", "#b88e63", "#a0a18c", "#718b89"].map((c) => (
              <View key={c} style={[s.miniSwatch, { backgroundColor: c }]} />
            ))}
          </View>
          <Text style={s.teaserTitle}>Find your{"\n"}color story.</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={s.stylistTeaser}
          onPress={() => go("event")}
        >
          <Text style={s.tiny}>AN OCCASION COMING UP?</Text>
          <Text style={s.teaserSerif}>Let’s style{"\n"}the moment.</Text>
        </Pressable>
      </View>
      <View style={s.sectionHead}>
        <Text style={s.kicker}>THE INSPIRATION ROOM</Text>
        <Text style={s.section}>Find a feeling. Make it yours.</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.editRow}
      >
        {beautyEdits.map((v) => (
          <Pressable
            accessibilityRole="button"
            key={v.name}
            style={s.editCard}
            onPress={() => go("studio")}
          >
            <View style={s.editImage}>
              <Portrait panel={v.panel} height={190} />
            </View>
            <Text style={s.editName}>{v.name}</Text>
            <Text style={s.small}>{v.detail}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={s.sectionHead}>
        <Text style={s.kicker}>START WITH WHAT YOU NEED</Text>
        <Text style={s.section}>A little direction. A whole look.</Text>
      </View>
      <View style={s.goals}>
        {goalJourneys.map((v, i) => (
          <Pressable
            accessibilityRole="button"
            key={v.title}
            style={s.goal}
            onPress={() => go(v.page)}
          >
            <Text style={s.kicker}>0{i + 1}</Text>
            <Text style={s.goalTitle}>{v.title}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.memory}>
        <Text style={s.kicker}>YOUR GLAM SPACE</Text>
        <Text style={s.section}>
          {d.onboarded ? d.look.title : "Good style gets personal."}
        </Text>
        <Text style={s.small}>
          {d.onboarded
            ? `${d.saved.length} saved looks · ${d.wardrobe.length} wardrobe items`
            : "Keep the looks you love. Build on what you own."}
        </Text>
        <Action
          outline
          title={d.onboarded ? "Continue my look" : "Set up my GLAM Profile"}
          onPress={() => (d.onboarded ? go("builder") : setup())}
        />
      </View>
    </>
  );
}
export function BeautyAnalysis({ go }: { go: (p: Page) => void }) {
  const [focus, setFocus] = useState("Features");
  return (
    <>
      <Text style={s.kicker}>A NEW WAY TO SEE YOUR POSSIBILITIES</Text>
      <Text accessibilityRole="header" style={s.pageTitle}>
        Beauty begins{"\n"}with understanding.
      </Text>
      <Text style={s.body}>
        Your features are a starting point, never a score.
      </Text>
      <View style={s.capture}>
        <Portrait panel={2} height={360} />
        <Text style={s.captureLabel}>LOCAL PHOTO PREPARATION</Text>
        <View style={s.frame} pointerEvents="none" />
        <View style={s.captureBottom}>
          <Text style={s.small}>
            Your photo comes next. This is editorial inspiration.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start Face Analysis"
            onPress={() => go("consent")}
            style={s.shutter}
          >
            <Text style={{ fontSize: 24, color: "#402c37" }}>◎</Text>
          </Pressable>
        </View>
      </View>
      <Text style={s.section}>Your face. A world of possibility.</Text>
      <View style={s.categories}>
        {["Features", "Colors", "Your guide"].map((v) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: focus === v }}
            key={v}
            style={[
              s.focus,
              focus === v && { backgroundColor: design.palette.blush },
            ]}
            onPress={() => setFocus(v)}
          >
            <Text
              style={{
                fontSize: 11,
                color: focus === v ? "#33232e" : "#ddc0d0",
              }}
            >
              {v}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={s.info}>
        <Text style={s.editName}>
          {focus === "Features"
            ? "Understand your starting point"
            : focus === "Colors"
              ? "Explore what color can do"
              : "Turn insight into a routine"}
        </Text>
        <Text style={s.body}>
          {focus === "Features"
            ? "Face shape, eyes, brows and lips — with room for uncertainty and your own corrections."
            : focus === "Colors"
              ? "Explore palettes and undertones. Personal findings require completed analysis."
              : "Practical steps using the tools and techniques you choose."}
        </Text>
      </View>
      {[
        "Choose your photo",
        "Tell us your goals",
        "Make the guidance yours",
      ].map((v, i) => (
        <View key={v} style={s.step}>
          <Text style={s.kicker}>0{i + 1}</Text>
          <Text style={s.body}>{v}</Text>
        </View>
      ))}
      <Action title="Choose my photo" onPress={() => go("consent")} />
      <Action
        outline
        title="Explore without a photo"
        onPress={() => go("goals")}
      />
      <Text style={s.small}>
        No facial recognition or attractiveness ranking. Analysis is not
        connected yet.
      </Text>
      <View style={s.goals}>
        {[
          ["Hair Analysis", "hair"],
          ["Skin Appearance Analysis", "skin"],
          ["Body & Fit Styling", "body-fit"],
          ["Open Color Analysis", "color"],
        ].map(([v, p]) => (
          <Action key={p} outline title={v} onPress={() => go(p as Page)} />
        ))}
      </View>
    </>
  );
}
type StudioProps = {
  photo: Photo | null;
  tool: string;
  direction: string;
  intensity: number;
  onTool: (v: string) => void;
  onDirection: (v: string) => void;
  onIntensity: (v: number) => void;
  reset: () => void;
  carry: (value: string) => void;
  go: (p: Page) => void;
};
export function BeautyStudio(p: StudioProps) {
  const [preset, setPreset] = useState(0);
  const [family, setFamily] = useState<keyof typeof shadeFamilies>("Rose");
  const [shade, setShade] = useState(2);
  const [favorite, setFavorite] = useState(false);
  const [history, setHistory] = useState<StudioChoice[]>([]);
  const [notice, setNotice] = useState("");
  const remember = () =>
    setHistory((h) =>
      rememberChoice(h, {
        tool: p.tool,
        style: p.direction,
        intensity: p.intensity,
        family,
        shade,
        preset,
        marked: favorite,
      }),
    );
  function undo() {
    const previous = undoChoice(history);
    if (!previous.choice) return;
    const c = previous.choice;
    setHistory(previous.history);
    p.onTool(c.tool);
    p.onDirection(c.style);
    p.onIntensity(c.intensity);
    setFamily(c.family);
    setShade(c.shade);
    setPreset(c.preset);
    setFavorite(c.marked);
    setNotice("Previous choices restored. Your original is unchanged.");
  }
  function reset() {
    remember();
    p.reset();
    setFamily("Rose");
    setShade(2);
    setPreset(0);
    setFavorite(false);
    setNotice("Choices reset. Your original was never changed.");
  }

  return (
    <>
      <Text style={s.kicker}>YOUR EXPRESSION LAB</Text>
      <Text accessibilityRole="header" style={s.pageTitle}>
        Make it your own.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.toolRow}
      >
        {tools.map((v) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: p.tool === v }}
            onPress={() => {
              remember();
              p.onTool(v);
              p.onDirection("Natural");
            }}
            style={[
              s.tool,
              p.tool === v && { backgroundColor: design.palette.blush },
            ]}
            key={v}
          >
            <Text
              style={{
                color: p.tool === v ? "#33232e" : "#cfb4c3",
                fontSize: 11,
              }}
            >
              {v}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={s.editorStage}>
        {p.photo ? (
          <Image
            source={{ uri: p.photo.uri }}
            style={{ height: 260, width: "100%", resizeMode: "contain" }}
            accessibilityLabel="Your unchanged local original, not a generated makeover"
          />
        ) : (
          <Portrait panel={beautyEdits[preset].panel} height={260} />
        )}
        <View style={s.stageTop}>
          <Text style={s.stageBadge}>
            {p.photo
              ? "Original · Unchanged"
              : "Editorial reference · Not your result"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: favorite }}
            accessibilityLabel="Favorite inspiration for this session"
            onPress={() => {
              remember();
              setFavorite(!favorite);
            }}
            style={[s.favorite, favorite && { backgroundColor: "#f3b1ce" }]}
          >
            <Text
              style={{ color: favorite ? "#6b3b54" : "#ffd6e9", fontSize: 22 }}
            >
              ♡
            </Text>
          </Pressable>
        </View>
        <View style={s.stageBottom}>
          <Text style={s.kicker}>{p.tool.toUpperCase()}</Text>
          <Text style={s.section}>{beautyEdits[preset].name}</Text>
          <Text style={s.small}>
            Reference portrait, not a generated preview.
          </Text>
        </View>
      </View>
      <View style={s.drawer}>
        <Text style={s.kicker}>THE FINISHING TOUCHES</Text>
        <Text style={s.section}>Pick your direction.</Text>
        <View style={s.entry}>
          <View style={s.flex}>
            <Action
              title="Undo choice"
              outline
              disabled={!history.length}
              onPress={undo}
            />
          </View>
          <View style={s.flex}>
            <Action title="Reset to original" outline onPress={reset} />
          </View>
        </View>
        <Action
          title="Share styling brief"
          outline
          onPress={async () => {
            try {
              await Share.share({
                message: `My GLAM brief: ${p.tool}; ${p.direction}; ${family} reference color ${shade + 1}; intensity request ${p.intensity}%. No generated result or verified product shade is implied.`,
              });
              setNotice(
                "Share sheet closed. No photo or private analysis was attached.",
              );
            } catch {
              setNotice(
                "Sharing is unavailable. Your choices remain in this editor.",
              );
            }
          }}
        />
        <View style={s.thumbs}>
          {beautyEdits.map((v, i) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: preset === i }}
              key={v.name}
              onPress={() => {
                remember();
                setPreset(i);
              }}
              style={s.thumbButton}
            >
              <View
                style={[s.thumb, preset === i && { borderColor: "#f5acce" }]}
              >
                <Portrait panel={v.panel} height={62} />
              </View>
              <Text style={[s.thumbText, preset === i && { color: "#f5acce" }]}>
                {v.name}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.editName}>Color mood</Text>
        <View style={s.categories}>
          {Object.keys(shadeFamilies).map((v) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: family === v }}
              onPress={() => {
                remember();
                setFamily(v as keyof typeof shadeFamilies);
                setShade(2);
              }}
              key={v}
              style={s.focus}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: family === v ? "#f9bad5" : "#bba1b0",
                }}
              >
                {v}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={s.swatches}>
          {shadeFamilies[family].map((c, i) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${family} swatch ${i + 1}`}
              accessibilityState={{ selected: shade === i }}
              key={c}
              style={[
                s.swatch,
                { backgroundColor: c },
                shade === i && { borderWidth: 3, borderColor: "#ffd1e5" },
              ]}
              onPress={() => {
                remember();
                setShade(i);
              }}
            />
          ))}
        </View>
        <Text style={s.small}>
          {family} / {shade + 1} · Illustrative reference, not a verified
          product shade
        </Text>
        <Text style={[s.editName, { marginTop: 20 }]}>Style direction</Text>
        <ScrollView
          horizontal
          contentContainerStyle={s.toolRow}
          showsHorizontalScrollIndicator={false}
        >
          {studioDirections(p.tool).map((v) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: p.direction === v }}
              key={v}
              onPress={() => {
                remember();
                p.onDirection(v);
              }}
              style={[
                s.tool,
                p.direction === v && { backgroundColor: "#6b4158" },
              ]}
            >
              <Text style={s.thumbText}>{v}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={s.body}>Requested intensity: {p.intensity}%</Text>
        <View style={s.entry}>
          <View style={s.flex}>
            <Action
              outline
              title="Less"
              onPress={() => {
                remember();
                p.onIntensity(p.intensity - 10);
              }}
            />
          </View>
          <View style={s.flex}>
            <Action
              outline
              title="More"
              onPress={() => {
                remember();
                p.onIntensity(p.intensity + 10);
              }}
            />
          </View>
        </View>
        <Text style={s.small}>
          No generated comparison yet. Your original is not altered by these
          controls.
        </Text>
        <Action
          title="Generate — connection required"
          disabled
          onPress={() => {}}
        />
        <Action
          outline
          title="Choose / change photo"
          onPress={() => p.go("consent")}
        />
        <Action
          outline
          title="Use direction in my look"
          onPress={() =>
            p.carry(
              p.tool === "Makeup Match"
                ? `${p.direction} · ${family} color mood ${String(shade + 1).padStart(2, "0")} (illustrative)`
                : p.direction,
            )
          }
        />
        <Action
          title="Compare — real preview required"
          disabled
          onPress={() => {}}
        />
        <Action
          title="Get This Look"
          outline
          onPress={() => p.go("complete")}
        />
        {!!notice && (
          <Text accessibilityRole="alert" style={s.small}>
            {notice}
          </Text>
        )}
      </View>
    </>
  );
}
export function BeautyColor({ photo }: { photo: Photo | null }) {
  const [mood, setMood] = useState<keyof typeof colorMoods>("Warm neutrals");
  const [color, setColor] = useState(0);
  return (
    <View style={s.colorPanel}>
      <View style={[s.colorWheel, { borderColor: colorMoods[mood][color] }]}>
        {photo ? (
          <Image
            source={{ uri: photo.uri }}
            accessibilityLabel="Unchanged local original in illustrative color frame"
            style={{ width: 210, height: 210, resizeMode: "cover" }}
          />
        ) : (
          <Portrait panel={2} height={210} />
        )}
      </View>
      <Text style={[s.kicker, { color: "#8c4766" }]}>
        PLAY WITH POSSIBILITY
      </Text>
      <Text style={[s.section, { color: "#422d39" }]}>
        A little color. A different feeling.
      </Text>
      <Text style={[s.body, { color: "#705260" }]}>
        Reference palettes, not a personal season or undertone result. Your
        photo stays unchanged.
      </Text>
      {Object.keys(colorMoods).map((v) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mood === v }}
          key={v}
          style={[s.mood, mood === v && { backgroundColor: "#6d4359" }]}
          onPress={() => {
            setMood(v as keyof typeof colorMoods);
            setColor(0);
          }}
        >
          <Text
            style={{ fontSize: 11, color: mood === v ? "#fff0f6" : "#684252" }}
          >
            {v}
          </Text>
        </Pressable>
      ))}
      <View style={s.swatches}>
        {colorMoods[mood].map((c, i) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${mood} color ${i + 1}`}
            accessibilityState={{ selected: color === i }}
            style={[
              s.swatch,
              { backgroundColor: c, width: 36, height: 36 },
              color === i && { borderWidth: 3, borderColor: "#6d4359" },
            ]}
            onPress={() => setColor(i)}
            key={c}
          />
        ))}
      </View>
      <Text style={{ fontSize: 10, color: "#684252" }}>
        Selected reference: {colorMoods[mood][color]}
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  flex: { flex: 1 },
  welcome: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  kicker: {
    fontSize: 8,
    letterSpacing: 1.6,
    color: "#e2a6c1",
    fontWeight: "600",
    marginBottom: 9,
  },
  title: {
    fontFamily:
      Platform.OS === "ios"
        ? design.fonts.iosHeading
        : design.fonts.androidHeading,
    fontSize: 32,
    lineHeight: 37,
    color: "#fff4f0",
    letterSpacing: -0.7,
  },
  mark: { fontSize: 27, color: "#e9b2cb", padding: 8 },
  entry: { flexDirection: "row", gap: 8, marginBottom: 12 },
  action: {
    backgroundColor: design.palette.blush,
    borderRadius: 25,
    minHeight: 48,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  actionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#33232d",
    textAlign: "center",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#674b5c",
  },
  feature: { backgroundColor: "#252425", padding: 9, borderRadius: 23 },
  categories: { flexDirection: "row", gap: 6, marginBottom: 10 },
  category: {
    flex: 1,
    minHeight: 38,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
  },
  categoryText: { fontSize: 10, color: "#e1d0da" },
  campaign: { borderRadius: 16, overflow: "hidden", height: 260 },
  campaignTag: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tiny: { color: "#e4b6cd", fontSize: 7, letterSpacing: 1 },
  campaignCopy: {
    position: "absolute",
    bottom: 17,
    left: 15,
    right: 30,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#11111188",
  },
  campaignTitle: {
    fontFamily:
      Platform.OS === "ios"
        ? design.fonts.iosHeading
        : design.fonts.androidHeading,
    fontSize: 31,
    lineHeight: 32,
    color: "#fff2f0",
    letterSpacing: -0.6,
  },
  credit: {
    position: "absolute",
    right: 8,
    bottom: 7,
    color: "#efd5e2",
    fontSize: 6,
  },
  teasers: { flexDirection: "row", gap: 10, marginTop: 12 },
  paletteTeaser: {
    flex: 1,
    backgroundColor: "#e6d4c9",
    borderRadius: 16,
    minHeight: 103,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  teaserTitle: {
    fontFamily:
      Platform.OS === "ios"
        ? design.fonts.iosHeading
        : design.fonts.androidHeading,
    fontSize: 17,
    lineHeight: 20,
    color: "#3b2933",
  },
  miniPalette: { flexDirection: "row", flexWrap: "wrap", width: 40, gap: 3 },
  miniSwatch: { width: 18, height: 18, borderRadius: 9 },
  stylistTeaser: {
    flex: 1,
    backgroundColor: "#34242e",
    borderWidth: 1,
    borderColor: "#654156",
    borderRadius: 16,
    padding: 15,
  },
  teaserSerif: {
    fontFamily:
      Platform.OS === "ios"
        ? design.fonts.iosHeading
        : design.fonts.androidHeading,
    fontSize: 20,
    color: "#ffdeed",
    lineHeight: 23,
    marginTop: 8,
  },
  sectionHead: { marginTop: 28, marginBottom: 15 },
  section: {
    fontFamily:
      Platform.OS === "ios"
        ? design.fonts.iosHeading
        : design.fonts.androidHeading,
    fontSize: 25,
    lineHeight: 29,
    color: "#fff1f3",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  editRow: { gap: 12, paddingBottom: 10 },
  editCard: { width: 150 },
  editImage: { borderRadius: 16, overflow: "hidden" },
  editName: {
    fontSize: 13,
    color: "#f4deeb",
    fontWeight: "500",
    marginTop: 14,
    marginBottom: 8,
  },
  small: { fontSize: 10, lineHeight: 17, color: "#baa5b2" },
  goals: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 20 },
  goal: {
    width: "48%",
    minHeight: 100,
    padding: 15,
    borderWidth: 1,
    borderColor: "#523d49",
    borderRadius: 14,
    backgroundColor: "#262126",
  },
  goalTitle: { fontSize: 11, lineHeight: 17, color: "#e8d1df" },
  memory: {
    paddingVertical: 25,
    borderTopWidth: 1,
    borderColor: "#4b3945",
    marginTop: 25,
  },
  pageTitle: {
    fontFamily:
      Platform.OS === "ios"
        ? design.fonts.iosHeading
        : design.fonts.androidHeading,
    fontSize: 35,
    lineHeight: 38,
    letterSpacing: -0.7,
    color: "#fff3f3",
    marginVertical: 10,
  },
  body: { fontSize: 12, lineHeight: 21, color: "#c3b0bd", marginBottom: 16 },
  capture: {
    height: 360,
    borderRadius: 25,
    overflow: "hidden",
    marginVertical: 12,
  },
  captureLabel: {
    position: "absolute",
    top: 20,
    left: 20,
    fontSize: 8,
    letterSpacing: 1.2,
    color: "#f8deec",
  },
  frame: {
    position: "absolute",
    top: 65,
    left: "20%",
    width: "60%",
    height: 155,
    borderWidth: 1,
    borderColor: "#fff4f7",
    borderRadius: 32,
  },
  captureBottom: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 18,
    alignItems: "center",
    backgroundColor: "#17111766",
    padding: 12,
    borderRadius: 18,
  },
  shutter: {
    marginTop: 12,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f3c4da",
    borderWidth: 4,
    borderColor: "#79616e",
    justifyContent: "center",
    alignItems: "center",
  },
  focus: {
    minHeight: 44,
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#634757",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: "#503b46",
    marginBottom: 20,
  },
  step: {
    flexDirection: "row",
    gap: 18,
    alignItems: "center",
    marginBottom: 7,
  },
  toolRow: { gap: 8, paddingBottom: 14 },
  tool: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    backgroundColor: "#30232c",
    justifyContent: "center",
  },
  editorStage: {
    height: 260,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: "hidden",
    backgroundColor: "#292126",
  },
  stageTop: {
    position: "absolute",
    top: 15,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stageBadge: {
    fontSize: 8,
    color: "#f5d4e5",
    backgroundColor: "#33232cbb",
    borderRadius: 20,
    padding: 9,
  },
  favorite: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "#33232c88",
    alignItems: "center",
    justifyContent: "center",
  },
  stageBottom: {
    position: "absolute",
    bottom: 28,
    left: 18,
    right: 18,
    padding: 15,
    borderRadius: 15,
    backgroundColor: "#20131dcc",
  },
  drawer: {
    borderRadius: 23,
    backgroundColor: "#2b242b",
    borderWidth: 1,
    borderColor: "#523c4c",
    padding: 22,
    marginTop: -15,
  },
  thumbs: { flexDirection: "row", gap: 10, marginBottom: 14 },
  thumbButton: { flex: 1 },
  thumb: {
    height: 66,
    borderRadius: 34,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 7,
  },
  thumbText: {
    fontSize: 9,
    color: "#c7adbe",
    textAlign: "center",
    lineHeight: 14,
  },
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginVertical: 18,
  },
  swatch: { width: 42, height: 42, borderRadius: 25 },
  colorPanel: {
    backgroundColor: "#ead6ce",
    padding: 23,
    borderRadius: 24,
    marginBottom: 25,
  },
  colorWheel: {
    width: 242,
    height: 242,
    borderRadius: 121,
    overflow: "hidden",
    borderWidth: 16,
    alignSelf: "center",
    marginBottom: 25,
    backgroundColor: "#c0959f",
  },
  mood: {
    minHeight: 44,
    padding: 12,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#b28a9e",
    marginVertical: 5,
  },
});
