import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  analysisContexts,
  categories,
  requirementProblem,
  displayMinor,
} from "../../packages/product/catalog";
import type {
  AnalysisContext,
  RequirementDraft,
  RecommendationResult,
  RecommendationMatch,
} from "../../packages/product/catalog";
export default function ContextualRecommendations({
  context,
  saved,
  onSave,
  onDelete,
  onComplete,
  results,
  onReview,
}: {
  context: AnalysisContext;
  saved: RequirementDraft[];
  onSave: (r: RequirementDraft) => void;
  onDelete: (id: string) => void;
  onComplete: () => void;
  results?: RecommendationResult;
  onReview?: (match: RecommendationMatch) => void;
}) {
  const config = analysisContexts.find((n) => n.id === context)!;
  const [category, setCategory] = useState<string>(config.category);
  const [tags, setTags] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("ZAR");
  const [message, setMessage] = useState("");
  const button = (title: string, action: () => void) => (
    <Pressable accessibilityRole="button" style={s.button} onPress={action}>
      <Text style={s.white}>{title}</Text>
    </Pressable>
  );
  function matchCards(items: RecommendationMatch[], sponsored = false) {
    return items
      .filter((m) => Date.parse(m.offer_expires_at) > Date.now())
      .map((m) => (
        <View key={m.listing_id} style={s.card}>
          <Text style={s.eyebrow}>
            {sponsored ? "SPONSORED" : m.match_type + " · ORGANIC"}
          </Text>
          <Text style={s.heading}>{m.title}</Text>
          <Text style={s.body}>
            {m.merchant}
            {m.condition ? " · " + m.condition : ""}
          </Text>
          <Text style={s.body}>
            {m.service_quote_required
              ? "Indicative service price"
              : "Item price"}
            : {displayMinor(m.price_minor, m.currency)}
            {"\n"}
            {m.delivered_total_minor === null
              ? "Full delivered / service total unconfirmed"
              : "Delivered total: " +
                displayMinor(m.delivered_total_minor, m.currency)}
          </Text>
          <Text style={s.small}>
            Reviewed merchant assertion. Source expiry:{" "}
            {new Date(m.offer_expires_at).toLocaleString()}. Revalidation is
            required before any handoff; services require feasibility and an
            accepted quote, not an automatic booking.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !onReview }}
            disabled={!onReview}
            style={s.button}
            onPress={() => onReview?.(m)}
          >
            <Text style={s.white}>
              {m.service_quote_required
                ? "Review professional quote request"
                : "Review merchant handoff"}
            </Text>
          </Pressable>
        </View>
      ));
  }
  function save() {
    const values = tags
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    const issue = requirementProblem(values, country);
    if (issue) {
      setMessage(issue);
      return;
    }
    onSave({
      id: String(Date.now()),
      context,
      category,
      tags: values,
      country,
      currency,
    });
    setMessage(
      "Requirements saved in this app session. No verified listing or notification was created.",
    );
  }
  return (
    <View style={s.section}>
      <Text style={s.eyebrow}>GUIDANCE TO REAL POSSIBILITIES</Text>
      <Text accessibilityRole="header" style={s.heading}>
        Personalized Recommendations
      </Text>
      <Text style={s.body}>
        {results
          ? "Approved source records match your chosen requirements. No private facial data is shared."
          : "No personal recommendation has been computed yet. Prepare your own product or professional requirements while the analysis and catalog providers are disconnected."}
      </Text>
      <View style={s.card}>
        <Text style={s.label}>Product / service category</Text>
        <View style={s.chips}>
          {categories.map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: category === n }}
              style={[s.chip, category === n && s.selected]}
              onPress={() => setCategory(n)}
            >
              <Text style={category === n ? s.white : s.small}>{n}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.label}>Style requirement tags, separated by commas</Text>
        <TextInput
          accessibilityLabel="Style requirement tags"
          style={s.input}
          value={tags}
          maxLength={500}
          autoCapitalize="none"
          onChangeText={setTags}
          placeholder="braids, protective-style"
        />
        <Text style={s.label}>Delivery country code</Text>
        <TextInput
          accessibilityLabel="Delivery country code"
          style={s.input}
          value={country}
          maxLength={2}
          autoCapitalize="characters"
          onChangeText={(v) => setCountry(v.toUpperCase())}
          placeholder="ZA"
        />
        <Text style={s.label}>Currency</Text>
        <View style={s.chips}>
          {["ZAR", "USD", "EUR", "GBP"].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: currency === n }}
              style={[s.chip, currency === n && s.selected]}
              onPress={() => setCurrency(n)}
            >
              <Text style={currency === n ? s.white : s.small}>{n}</Text>
            </Pressable>
          ))}
        </View>
        {button("Save recommendation requirements", save)}
        {!!message && (
          <Text accessibilityLiveRegion="polite" style={s.body}>
            {message}
          </Text>
        )}
      </View>
      <Text accessibilityRole="header" style={s.heading}>
        Where to Buy / Book
      </Text>
      {results && matchCards(results.organic)}
      {results && matchCards(results.sponsored, true)}
      <View style={s.card}>
        <Text style={s.eyebrow}>BEST MATCHES · ORGANIC</Text>
        {!results?.organic.some(
          (m) => Date.parse(m.offer_expires_at) > Date.now(),
        ) && (
          <Text style={s.heading}>
            No verified matching listings currently available.
          </Text>
        )}
        <Text style={s.body}>
          Merchant, price, stock, delivery and professional availability appear
          only when verified. Similarity alone is not an Exact match. Services
          need a quote before a booking.
        </Text>
      </View>
      <View style={[s.card, s.sponsored]}>
        <Text style={s.eyebrow}>SPONSORED MATCHES</Text>
        {!results?.sponsored.some(
          (m) => Date.parse(m.offer_expires_at) > Date.now(),
        ) && <Text style={s.heading}>No qualified sponsored placements.</Text>}
        <Text style={s.body}>
          {results?.sponsored.length
            ? "Paid placements must pass the same suitability checks. "
            : "Suppressed until eligibility, consent and ad delivery qualify. "}
          Payment never changes an analysis or makes an irrelevant product a
          match. Private facial data is not shared.
        </Text>
      </View>
      {button("Complete the Look", onComplete)}
      <Text style={s.small}>
        Availability notifications require a connected service; none is
        scheduled.
      </Text>
      {saved
        .filter((r) => r.context === context)
        .map((r) => (
          <View key={r.id} style={s.card}>
            <Text style={s.label}>Saved session requirement</Text>
            <Text style={s.body}>
              {r.category} · {r.tags.join(", ")} · {r.country} / {r.currency}
            </Text>
            {button("Delete saved requirement", () => onDelete(r.id))}
          </View>
        ))}
    </View>
  );
}
const s = StyleSheet.create({
  section: {
    marginTop: 28,
    paddingTop: 25,
    borderTopWidth: 1,
    borderColor: "#ddd6d2",
  },
  card: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd6d2",
    borderRadius: 20,
    padding: 20,
    marginVertical: 12,
  },
  sponsored: { backgroundColor: "#f7f3f9", borderColor: "#bfaacb" },
  heading: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "600",
    color: "#17151a",
    marginBottom: 15,
  },
  body: { fontSize: 14, lineHeight: 23, color: "#69636c", marginVertical: 12 },
  small: { fontSize: 12, color: "#69636c", lineHeight: 20 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginVertical: 13,
    color: "#17151a",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: "#8f3157",
    marginVertical: 10,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginVertical: 10 },
  chip: {
    padding: 13,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#aba0a9",
    borderRadius: 24,
  },
  selected: { backgroundColor: "#17151a" },
  white: { fontSize: 13, color: "white", textAlign: "center" },
  button: {
    minHeight: 48,
    padding: 15,
    borderRadius: 25,
    backgroundColor: "#17151a",
    marginVertical: 10,
    justifyContent: "center",
  },
  input: {
    minHeight: 50,
    padding: 13,
    borderWidth: 1,
    borderColor: "#847c87",
    borderRadius: 12,
    color: "#17151a",
    fontSize: 16,
  },
});
