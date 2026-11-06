import { useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Page, Photo } from "../../packages/product/platform";
import { featureKeys, featureLabels } from "../../packages/product/companion";
import type {
  CompanionConnection,
  LookDirection,
} from "../../packages/product/companion";
import type { PersonalResultsState } from "../../packages/product/use-personal-results";
import type { useDestination } from "../../packages/product/use-destination";
import type { MarketplaceState } from "../../packages/product/use-marketplace";
import { displayMinor } from "../../packages/product/catalog";
import design from "../../packages/product/consumer-design.json";
const c = design.palette;
const serif =
  Platform.OS === "ios" ? design.fonts.iosHeading : design.fonts.androidHeading;
function Action({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, disabled && { opacity: 0.55 }]}
    >
      <Text style={s.buttonText}>{title}</Text>
    </Pressable>
  );
}
function Copy({ children }: { children: React.ReactNode }) {
  return <Text style={s.body}>{children}</Text>;
}
function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text accessibilityRole="header" style={s.heading}>
      {children}
    </Text>
  );
}
export function PersonalResults({
  photo,
  personal: p,
  connection,
  go,
  onDirection,
}: {
  photo: Photo | null;
  personal: PersonalResultsState;
  connection?: CompanionConnection;
  go: (p: Page) => void;
  onDirection: (d: LookDirection) => void;
}) {
  const [consent, setConsent] = useState(false);
  return (
    <View style={s.root}>
      <Copy>PERSONALIZED RESULTS / SIXTH GOLDEN PATTERN</Copy>
      <Heading>Your features. Your possibilities.</Heading>
      {photo ? (
        <Image
          source={{ uri: photo.uri }}
          style={s.portrait}
          accessibilityLabel="Your unchanged original photo"
        />
      ) : (
        <View style={s.card}>
          <Heading>Start with you.</Heading>
          <Copy>
            Your photo and a qualified analysis are needed. No personal
            estimates have been computed.
          </Copy>
        </View>
      )}
      <Action
        title={photo ? "Change my photo" : "Prepare my photo"}
        onPress={() => go("consent")}
      />
      <View style={s.card}>
        <Heading>
          {p.analysis ? "Your Results" : "A little clarity starts here."}
        </Heading>
        <Copy>
          {p.analysis
            ? `${p.analysis.provider} · ${p.analysis.model} · ${p.analysis.completedAt}`
            : "Analysis service is not connected. No photo is uploaded by selecting permission."}
        </Copy>
        {!p.analysis && (
          <>
            <View style={s.row}>
              <Switch
                accessibilityLabel="Authorize analysis processing"
                value={consent}
                onValueChange={setConsent}
              />
              <Text style={[s.body, s.flex]}>
                I authorize processing with the connected analysis service.
              </Text>
            </View>
            <Action
              title={
                p.busy === "analysis"
                  ? "Analyzing…"
                  : connection?.analyze
                    ? "Analyze my photo"
                    : "Analysis connection required"
              }
              disabled={!photo || !consent || !connection?.analyze || !!p.busy}
              onPress={() => p.run("analysis")}
            />
          </>
        )}
        {p.busy && <Action title="Cancel request" onPress={p.cancel} />}
        <Copy>{p.error}</Copy>
      </View>
      {featureKeys.map((k) => {
        const f = p.analysis?.findings.find((f) => f.key === k);
        return (
          <View key={k} style={s.card}>
            <Copy>{featureLabels[k]}</Copy>
            <Heading>
              {p.corrections[k]?.trim() || f?.estimate || "Not computed"}
            </Heading>
            <Copy>
              {p.corrections[k]?.trim()
                ? "Your correction"
                : f?.certainty || "Awaiting analysis"}
            </Copy>
            <Copy>
              {f?.uncertainty ||
                "A real estimate and its limitations will appear after processing."}
            </Copy>
            {f && <Copy>Original estimate: {f.estimate || "Unavailable"}</Copy>}
            <Copy>Your {featureLabels[k].toLowerCase()} note</Copy>
            <TextInput
              accessibilityLabel={
                "Your " + featureLabels[k].toLowerCase() + " note"
              }
              style={s.input}
              value={p.corrections[k] || ""}
              maxLength={240}
              onChangeText={(v) => p.correct(k, v)}
            />
            <Action
              title={"Clear " + featureLabels[k] + " note"}
              onPress={() => p.correct(k, "")}
            />
          </View>
        );
      })}
      <View style={s.card}>
        <Heading>Explore what feels like you.</Heading>
        {p.analysis?.directions.map((d) => (
          <View key={d.id}>
            <Heading>{d.title}</Heading>
            <Copy>{d.rationale}</Copy>
            <Action
              title={"Explore " + d.title + " in AI Studio"}
              onPress={() => onDirection(d)}
            />
          </View>
        ))}
        {!p.analysis && (
          <Copy>
            No AI look recommendations have been generated. You may explore
            editorial references.
          </Copy>
        )}
        <Action
          title="Explore Studio references"
          onPress={() => go("studio")}
        />
        <Action
          title="Find local products & professionals"
          onPress={() => go("complete")}
        />
      </View>
    </View>
  );
}
export function PersonalPreview({
  personal: p,
  connection,
  photo,
}: {
  personal: PersonalResultsState;
  connection?: CompanionConnection;
  photo: Photo | null;
}) {
  const [consent, setConsent] = useState(false),
    [original, setOriginal] = useState(true);
  if (!p.direction) return null;
  return (
    <View style={s.card}>
      <Heading>{p.direction.title}</Heading>
      <Copy>{p.direction.rationale}</Copy>
      <Copy>
        Your corrections accompany this request. The original is preserved.
      </Copy>
      <Switch
        accessibilityLabel="Authorize try-on processing"
        value={consent}
        onValueChange={setConsent}
      />
      <Action
        title={
          p.busy === "preview"
            ? "Generating preview…"
            : connection?.tryOn
              ? "Generate my chosen look"
              : "Try-on connection required"
        }
        disabled={!consent || !connection?.tryOn || !!p.busy}
        onPress={() => p.run("preview")}
      />
      {p.busy && <Action title="Cancel request" onPress={p.cancel} />}
      <Copy>{p.error}</Copy>
      {p.preview && photo && (
        <>
          <Copy>
            {original ? "Original photo" : "Generated visualization"} ·{" "}
            {p.preview.provider}
          </Copy>
          <Image
            source={{ uri: original ? photo.uri : p.preview.imageUrl }}
            style={s.portrait}
            accessibilityLabel={
              original
                ? "Your unchanged original"
                : "Qualified generated personal preview"
            }
          />
          <Action
            title={original ? "Show generated preview" : "Show original"}
            onPress={() => setOriginal((v) => !v)}
          />
        </>
      )}
    </View>
  );
}
export function Destination({
  trip: t,
  connection,
  go,
}: {
  trip: ReturnType<typeof useDestination>;
  connection?: CompanionConnection;
  go: (p: Page) => void;
}) {
  const [item, setItem] = useState("");
  const field = (
    label: string,
    key:
      | "destination"
      | "country"
      | "start"
      | "end"
      | "activities"
      | "preferences",
  ) => (
    <View key={key}>
      <Copy>{label}</Copy>
      <TextInput
        accessibilityLabel={label}
        style={s.input}
        value={t.plan[key]}
        maxLength={key === "country" ? 2 : 1000}
        placeholder={
          key === "start" || key === "end" ? "YYYY-MM-DD" : undefined
        }
        onChangeText={(v) =>
          t.edit(key, key === "country" ? v.toUpperCase() : v)
        }
      />
    </View>
  );
  return (
    <View style={s.root}>
      <Copy>DESTINATION & WEATHER STYLIST</Copy>
      <Heading>Away, in your own style.</Heading>
      <View style={s.card}>
        {field("Destination city or region", "destination")}
        {field("Destination country code", "country")}
        {field("Arrival date", "start")}
        {field("Departure date", "end")}
        {field("Activities and occasions", "activities")}
        {field("Comfort, fabric and coverage preferences", "preferences")}
        <Copy>
          Sourcing:{" "}
          {t.plan.sourcing === "before-departure"
            ? "Buy before departure"
            : "Find at destination"}
        </Copy>
        <Action
          title="Change sourcing preference"
          onPress={() =>
            t.edit(
              "sourcing",
              t.plan.sourcing === "before-departure"
                ? "at-destination"
                : "before-departure",
            )
          }
        />
        <Action
          title={t.busy ? "Checking weather…" : "Check weather availability"}
          disabled={t.busy}
          onPress={t.check}
        />
        {t.busy && <Action title="Cancel weather request" onPress={t.cancel} />}
        <Copy>{t.message}</Copy>
      </View>
      <View style={s.card}>
        <Heading>
          {t.weather ? "Weather evidence" : "Leave room for the unknown."}
        </Heading>
        <Copy>
          {t.weather
            ? `${t.weather.provider} · ${t.weather.timezone} · retrieved ${t.weather.retrievedAt}`
            : connection?.weather
              ? "Choose valid dates and request weather."
              : "No weather provider is connected. No forecast or seasonal estimate is fabricated."}
        </Copy>
        {t.weather?.days.map((d) => (
          <View key={d.date}>
            <Copy>
              {d.date} ·{" "}
              {d.status === "seasonal_estimate"
                ? "Seasonal estimate — not a forecast"
                : d.status}
            </Copy>
            <Copy>
              {d.lowC === null ? "Low unknown" : d.lowC + "°C low"} /{" "}
              {d.highC === null ? "high unknown" : d.highC + "°C high"}
            </Copy>
            <Copy>{d.note}</Copy>
          </View>
        ))}
        <Copy>No weather-based AI outfit has been generated.</Copy>
      </View>
      <View style={s.card}>
        <Heading>Pack what matters.</Heading>
        <Copy>Add a packing item</Copy>
        <TextInput
          accessibilityLabel="Add a packing item"
          value={item}
          maxLength={160}
          style={s.input}
          onChangeText={setItem}
        />
        <Action
          title="Add to packing list"
          disabled={!item.trim()}
          onPress={() => {
            t.setPacking((s) => [
              ...s,
              {
                id: Date.now().toString() + s.length,
                name: item.trim(),
                packed: false,
              },
            ]);
            setItem("");
          }}
        />
        {t.packing.map((i) => (
          <View key={i.id}>
            <View style={s.row}>
              <Switch
                accessibilityLabel={i.name + " packed"}
                value={i.packed}
                onValueChange={() =>
                  t.setPacking((s) =>
                    s.map((v) =>
                      v.id === i.id ? { ...v, packed: !v.packed } : v,
                    ),
                  )
                }
              />
              <Text style={[s.body, s.flex]}>{i.name}</Text>
            </View>
            <Action
              title={"Remove " + i.name}
              onPress={() =>
                t.setPacking((s) => s.filter((v) => v.id !== i.id))
              }
            />
          </View>
        ))}
        <Copy>Your own checklist. Changing dates preserves packed items.</Copy>
      </View>
      <Action title="Shape my travel look" onPress={() => go("builder")} />
      <Action title="AI Personal Stylist" onPress={() => go("advisor")} />
      <Action title="Event Stylist" onPress={() => go("event")} />
    </View>
  );
}
export function Marketplace({
  page,
  market: m,
  connection,
  go,
}: {
  page: Page;
  market: MarketplaceState;
  connection?: CompanionConnection;
  go: (p: Page) => void;
}) {
  const q = m.quote,
    r = m.receipt;
  return (
    <View style={s.root}>
      <Heading>
        {page === "cart"
          ? "Your considered collection."
          : page === "checkout"
            ? "The final details."
            : r?.state === "paid"
              ? "Your order is confirmed."
              : "Your order status."}
      </Heading>
      <Copy>{m.message}</Copy>
      {page === "cart" || page === "offer" ? (
        <View style={s.card}>
          {m.review && (
            <>
              <Heading>{m.review.title}</Heading>
              <Copy>
                {m.review.merchant} · {m.review.variant_id} ·{" "}
                {m.review.quantity_available} available
              </Copy>
              <Action
                title="Add verified variant to cart"
                onPress={() => {
                  m.add();
                  go("cart");
                }}
              />
            </>
          )}
          {m.items.length ? (
            m.items.map((i) => (
              <View key={i.offer.listing_id + ":" + i.offer.variant_id}>
                <Heading>{i.offer.title}</Heading>
                <Copy>
                  {i.offer.merchant} · {i.offer.variant_id} · Quantity{" "}
                  {i.quantity}
                </Copy>
                <Action
                  title={"Remove " + i.offer.title}
                  onPress={() =>
                    m.remove(i.offer.listing_id, i.offer.variant_id)
                  }
                />
              </View>
            ))
          ) : (
            <Copy>
              Your cart is waiting. Editorial product studies are not
              purchasable.
            </Copy>
          )}
          <Action
            title="Request checkout quote"
            disabled={!m.items.length || !connection?.quote || m.busy}
            onPress={async () => {
              await m.request("quote");
              go("checkout");
            }}
          />
        </View>
      ) : page === "checkout" ? (
        <View style={s.card}>
          <Heading>
            {q ? "Review your server quote" : "A verified quote comes first."}
          </Heading>
          {q ? (
            <>
              <Copy>
                Total {displayMinor(q.totalMinor, q.currency)} · expires{" "}
                {q.expiresAt}
              </Copy>
              <Copy>{q.delivery}</Copy>
              <Copy>{q.returns}</Copy>
              <Action
                title="Continue to secure checkout"
                onPress={() => {
                  if (Date.parse(q.expiresAt) > Date.now())
                    void Linking.openURL(q.hostedUrl);
                }}
              />
            </>
          ) : (
            <Copy>
              No payment details are collected. Stock, delivery, returns and the
              full server total must be confirmed.
            </Copy>
          )}
          <Copy>
            The existing 10% eligible item-sale commission stays server-side,
            with no new surcharge.
          </Copy>
        </View>
      ) : (
        <View style={s.card}>
          <Heading>{r ? "Order " + r.id : "No order is confirmed."}</Heading>
          <Copy>
            {r
              ? r.state
              : "Confirmation requires a verified order-service response."}
          </Copy>
          {r?.merchantOrders.map((o) => (
            <Copy key={o.id}>
              {o.merchant} · {o.id} · {o.state}
            </Copy>
          ))}
          <Action
            title="Check verified order status"
            disabled={!connection?.order || !m.canCheckOrder || m.busy}
            onPress={() => m.request("order")}
          />
        </View>
      )}
      <Action title="Cart" onPress={() => go("cart")} />
      <Action
        title="Find products & professionals"
        onPress={() => go("complete")}
      />
      <Action title="Order status" onPress={() => go("orders")} />
    </View>
  );
}
const s = StyleSheet.create({
  root: { gap: 20 },
  card: {
    backgroundColor: c.white,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: design.radius.card,
    padding: 24,
    gap: 12,
  },
  heading: { fontFamily: serif, fontSize: 30, lineHeight: 35, color: c.ink },
  body: { color: "#65535e", fontSize: 14, lineHeight: 23 },
  portrait: {
    height: 380,
    width: "100%",
    borderRadius: 24,
    resizeMode: "contain",
  },
  input: {
    borderWidth: 1,
    borderColor: c.mauve,
    borderRadius: 16,
    minHeight: 48,
    padding: 12,
    color: c.ink,
    backgroundColor: c.ivory,
  },
  button: {
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: c.ink,
    justifyContent: "center",
  },
  buttonText: { color: c.white, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
});
