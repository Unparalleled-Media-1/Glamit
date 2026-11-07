import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Page } from "../../packages/product/platform";
import type { Journey } from "../../packages/product/journey";
import { changePart } from "../../packages/product/journey";
import {
  editorialProducts,
  productMoods,
} from "../../packages/product/editorial-products";
import design from "../../packages/product/consumer-design.json";
const colors = design.palette;
const serif =
  Platform.OS === "ios" ? design.fonts.iosHeading : design.fonts.androidHeading;
function Action({
  title,
  onPress,
  outline = false,
  disabled = false,
}: {
  title: string;
  onPress?: () => void;
  outline?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.action, outline && s.outline, disabled && s.unavailable]}
    >
      <Text
        style={[
          s.actionText,
          outline && { color: colors.mauve },
          disabled && { color: colors.muted },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
function ProductArt({ panel, height }: { panel: number; height: number }) {
  const [width, setWidth] = useState(300);
  const w = Math.min(width, height * 0.75);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height, overflow: "hidden", backgroundColor: "#eadbd0" }}
    >
      <Image
        source={require("./assets/beauty-products.webp")}
        accessibilityLabel="Original unbranded editorial product study, not a purchasable listing"
        style={{
          position: "absolute",
          width: w * 4,
          height: (w * 4) / 3,
          left: -panel * w + (width - w) / 2,
          top: (height - (w * 4) / 3) / 2,
        }}
      />
    </View>
  );
}
type Props = {
  page: "shop" | "product";
  data: Journey;
  setData: Dispatch<SetStateAction<Journey>>;
  selected: number;
  select: (n: number) => void;
  go: (p: Page) => void;
  studio: () => void;
};
export default function GoldenCommerce(p: Props) {
  const [category, setCategory] = useState("All");
  const [mood, setMood] = useState(0);
  const [showLocation, setShowLocation] = useState(false);
  const [country, setCountry] = useState(p.data.country);
  const [city, setCity] = useState(p.data.city);
  const [currency, setCurrency] = useState(p.data.currency);
  const [detail, setDetail] = useState(false);
  const insets = useSafeAreaInsets();
  const item = editorialProducts[p.selected] || editorialProducts[0];
  const openLocation = () => {
    setCountry(p.data.country);
    setCity(p.data.city);
    setCurrency(p.data.currency);
    setShowLocation(true);
  };
  const location = (
    <Pressable
      accessibilityRole="button"
      onPress={openLocation}
      style={s.location}
    >
      <Text style={s.locationTitle}>
        {p.data.city || p.data.country || "Choose shopping destination"}
      </Text>
      <Text style={s.caption}>{p.data.currency} · Your selection</Text>
    </Pressable>
  );
  return (
    <>
      {p.page === "shop" ? (
        <>
          <Text style={s.overline}>THE BEAUTY EDIT</Text>
          <Text accessibilityRole="header" style={s.title}>
            Objects of{"\n"}everyday beauty.
          </Text>
          <Text style={s.body}>
            A little color. A daily ritual. A direction to make your own.
          </Text>
          {location}
          <View style={s.feature}>
            <ProductArt panel={0} height={300} />
            <View style={s.featureCopy}>
              <Text style={s.overline}>A STUDY IN EXPRESSION</Text>
              <Text style={s.featureTitle}>
                A little color.{"\n"}A lasting impression.
              </Text>
              <Action
                title="Explore the lip study"
                onPress={() => {
                  p.select(0);
                  p.go("product");
                }}
              />
            </View>
            <Text style={s.sample}>EDITORIAL STUDY / NOT FOR SALE</Text>
          </View>
          <Text style={s.overline}>CURATED FOR EXPLORATION</Text>
          <Text accessibilityRole="header" style={s.h2}>
            The small things,{"\n"}beautifully considered.
          </Text>
          <View style={s.tabs}>
            {["All", "Makeup", "Skincare", "Hair"].map((v) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: category === v }}
                key={v}
                style={[s.tab, category === v && s.selected]}
                onPress={() => setCategory(v)}
              >
                <Text
                  style={[s.tabText, category === v && { color: colors.white }]}
                >
                  {v}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={s.grid}>
            {editorialProducts.map((v, i) =>
              category === "All" || category === v.category ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={"View " + v.name}
                  key={v.id}
                  style={s.card}
                  onPress={() => {
                    p.select(i);
                    setMood(0);
                    p.go("product");
                  }}
                >
                  <View style={s.picture}>
                    <ProductArt panel={v.panel} height={215} />
                  </View>
                  <Text style={s.cardCategory}>
                    {v.category} / Editorial sample
                  </Text>
                  <Text style={s.cardTitle}>{v.name}</Text>
                  <Text style={s.caption}>{v.kind} · No verified offer</Text>
                </Pressable>
              ) : null,
            )}
          </View>
          <View style={s.boundary}>
            <Text style={s.h2}>Real offers need real evidence.</Text>
            <Text style={s.body}>
              Merchant identity, price, variants, stock and delivery appear only
              with qualified listings.
            </Text>
            <Text style={s.label}>Best Matches</Text>
            <Text style={s.caption}>No verified catalog connected.</Text>
            <Text style={[s.label, { marginTop: 15 }]}>Sponsored</Text>
            <Text style={s.caption}>
              No qualified placements. Sponsorship never replaces suitability.
            </Text>
            <Action
              outline
              title="Open Get This Look"
              onPress={() => p.go("complete")}
            />
          </View>
        </>
      ) : (
        <>
          <Action
            outline
            title="Back to the beauty edit"
            onPress={() => p.go("shop")}
          />
          <View style={s.detailPicture}>
            <ProductArt panel={item.panel} height={380} />
            <Text style={s.sample}>SAMPLE PACKAGING / NOT FOR SALE</Text>
          </View>
          <Text style={s.overline}>
            {item.category.toUpperCase()} / A GLAM STUDY
          </Text>
          <Text accessibilityRole="header" style={s.title}>
            {item.name}
          </Text>
          <Text style={s.body}>{item.description}</Text>
          <View style={s.price}>
            <Text style={s.priceTitle}>Offer not verified</Text>
            <Text style={s.caption}>
              Illustration only. No price, merchant or stock is claimed.
            </Text>
          </View>
          <Text style={s.label}>Explore a color mood</Text>
          <View style={s.swatches}>
            {productMoods.map((v, i) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={v.name + " reference color"}
                accessibilityState={{ selected: mood === i }}
                key={v.name}
                onPress={() => setMood(i)}
                style={[
                  s.swatch,
                  { backgroundColor: v.color },
                  mood === i && { borderWidth: 4, borderColor: "#dcc1cf" },
                ]}
              />
            ))}
          </View>
          <Text style={s.caption}>
            {productMoods[mood].name} · Illustrative reference, not a verified
            product variant. Image unchanged.
          </Text>
          {location}
          <Action title="Explore in AI Studio" onPress={p.studio} />
          <Action
            outline
            title={
              item.part
                ? "Use as a " + item.part.toLowerCase() + " reference"
                : "Plan my skincare routine"
            }
            onPress={() => {
              const part = item.part;
              if (part) {
                p.setData((d) =>
                  changePart(
                    d,
                    part,
                    `${item.name} ${productMoods[mood].name} editorial reference — product unverified`,
                  ),
                );
                p.go("builder");
              } else p.go("guide");
            }}
          />
          <Action title="Purchase requires a verified offer" disabled />
          <Action
            outline
            title="Merchant, availability & delivered total"
            onPress={() => setDetail(!detail)}
          />
          {detail && (
            <Text style={s.body}>
              Merchant, price, sizes, shade variants, stock, delivery, taxes and
              full cost are unknown. No fit guarantee or returns policy is
              verified. The central 10% completed-item-sale policy remains
              unchanged; it is not a sample price or service fee. Studio
              generation/comparison requires a qualified provider.
            </Text>
          )}
        </>
      )}
      <Modal
        visible={showLocation}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocation(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.overlay}
        >
          <View
            accessibilityViewIsModal
            style={[s.sheet, { paddingBottom: 24 + insets.bottom }]}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text accessibilityRole="header" style={s.h2}>
                Where should your look take you?
              </Text>
              <Text style={s.body}>
                Choose your shopping destination. No device location is
                collected or guessed.
              </Text>
              <Text style={s.label}>Shopping country</Text>
              <TextInput
                accessibilityLabel="Shopping country"
                style={s.input}
                value={country}
                maxLength={160}
                onChangeText={setCountry}
              />
              <Text style={s.label}>Shopping city</Text>
              <TextInput
                accessibilityLabel="Shopping city"
                style={s.input}
                value={city}
                maxLength={160}
                onChangeText={setCity}
              />
              <Text style={s.label}>Shopping currency</Text>
              <View style={s.tabs}>
                {["ZAR", "USD", "GBP", "EUR"].map((v) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: currency === v }}
                    style={[s.tab, currency === v && s.selected]}
                    onPress={() => setCurrency(v)}
                    key={v}
                  >
                    <Text
                      style={[
                        s.tabText,
                        currency === v && { color: colors.white },
                      ]}
                    >
                      {v}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.caption}>
                A preference, not a currency conversion or availability
                guarantee.
              </Text>
              <Action
                title="Use this destination"
                onPress={() => {
                  p.setData((d) => ({
                    ...d,
                    country: country.trim(),
                    city: city.trim(),
                    currency,
                  }));
                  setShowLocation(false);
                }}
              />
              <Action
                outline
                title="Close shopping destination"
                onPress={() => setShowLocation(false)}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  overline: {
    fontSize: 8,
    letterSpacing: 1.6,
    color: colors.mauve,
    fontWeight: "600",
    marginBottom: 13,
  },
  title: {
    fontFamily: serif,
    fontSize: 40,
    lineHeight: 43,
    color: colors.ink,
    letterSpacing: -1.1,
    marginBottom: 20,
  },
  body: { fontSize: 12, lineHeight: 22, color: colors.muted, marginBottom: 18 },
  caption: { fontSize: 10, lineHeight: 18, color: colors.muted },
  h2: {
    fontFamily: serif,
    fontSize: 29,
    lineHeight: 32,
    color: colors.ink,
    letterSpacing: -0.7,
    marginBottom: 20,
  },
  action: {
    minHeight: 50,
    borderRadius: 25,
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.charcoal,
    marginVertical: 7,
  },
  actionText: {
    fontSize: 11,
    color: colors.white,
    fontWeight: "500",
    textAlign: "center",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#bd9bad",
  },
  unavailable: {
    backgroundColor: "#eee7e5",
    borderWidth: 1,
    borderColor: colors.line,
  },
  location: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 24,
    backgroundColor: colors.white,
    minHeight: 56,
    padding: 14,
    marginVertical: 18,
  },
  locationTitle: { fontSize: 12, color: colors.ink, marginBottom: 4 },
  feature: {
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 28,
    backgroundColor: "#efdfd6",
  },
  featureCopy: {
    position: "absolute",
    left: 15,
    top: 45,
    right: 55,
    backgroundColor: "#efdfd6cc",
    padding: 18,
    borderRadius: 15,
  },
  featureTitle: {
    fontFamily: serif,
    fontSize: 30,
    lineHeight: 32,
    color: colors.ink,
    letterSpacing: -0.7,
  },
  sample: {
    position: "absolute",
    bottom: 12,
    right: 12,
    fontSize: 6,
    letterSpacing: 0.7,
    color: "#7a556a",
    backgroundColor: "#fff8f3dd",
    padding: 7,
    borderRadius: 15,
  },
  tabs: { flexDirection: "row", gap: 7, marginVertical: 18 },
  tab: {
    flex: 1,
    minHeight: 44,
    padding: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#d2bac5",
    justifyContent: "center",
    alignItems: "center",
  },
  selected: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  tabText: { fontSize: 10, color: colors.mauve },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "48%", marginBottom: 20 },
  picture: { borderRadius: 15, overflow: "hidden" },
  cardCategory: { fontSize: 8, color: "#997487", marginVertical: 11 },
  cardTitle: {
    fontFamily: serif,
    fontSize: 21,
    lineHeight: 25,
    color: colors.ink,
    marginBottom: 9,
  },
  boundary: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingVertical: 25,
    marginTop: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.mauve,
    marginBottom: 10,
  },
  detailPicture: {
    position: "relative",
    borderRadius: 22,
    overflow: "hidden",
    marginVertical: 18,
  },
  price: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingVertical: 20,
    marginVertical: 22,
  },
  priceTitle: {
    fontFamily: serif,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 8,
  },
  swatches: { flexDirection: "row", gap: 15, marginVertical: 15 },
  swatch: { width: 44, height: 44, borderRadius: 22 },
  overlay: {
    flex: 1,
    backgroundColor: "#20162077",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "90%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    backgroundColor: colors.white,
  },
  input: {
    minHeight: 48,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c6a8b7",
    color: colors.ink,
    marginBottom: 20,
    backgroundColor: colors.ivory,
  },
});
