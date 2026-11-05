import { useEffect, useRef, useState } from "react";
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
import {
  emptyMerchantDraft,
  enhancementOptions,
  merchantDraftProblem,
} from "../../packages/product/catalog";
import type { MerchantDraft } from "../../packages/product/catalog";
import { photoIssue } from "../../packages/product/platform";
export default function MerchantSnapList() {
  const [stage, setStage] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const owned = useRef<string[]>([]);
  const attempt = useRef(0);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState({ ...emptyMerchantDraft });
  const [saved, setSaved] = useState<MerchantDraft[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  function deleteCache(uri: string) {
    if (!uri.startsWith(Paths.cache.uri))
      throw Error("Only app-owned copies can be cleared");
    const f = new File(uri);
    if (f.exists) f.delete();
  }
  useEffect(
    () => () => {
      attempt.current++;
      owned.current.forEach((uri) => {
        try {
          deleteCache(uri);
        } catch {
          /* Never delete source library files. */
        }
      });
    },
    [],
  );
  const button = (title: string, action?: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[s.button, disabled && s.disabled]}
      onPress={action}
    >
      <Text style={[s.white, disabled && s.disabledText]}>{title}</Text>
    </Pressable>
  );
  async function pick(camera = false) {
    if (!rights || busy) return;
    const run = ++attempt.current;
    const pending: string[] = [];
    setBusy(true);
    setMessage("");
    try {
      const p = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!p.granted)
        throw Error(
          "Photo permission was denied. You can still prepare a manual draft.",
        );
      const result = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 1,
            exif: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsMultipleSelection: true,
            selectionLimit: 8,
            quality: 1,
            exif: false,
          });
      if (result.canceled) return;
      let bytes = 0;
      for (const asset of result.assets) {
        pending.push(asset.uri);
        const size = asset.fileSize ?? new File(asset.uri).size;
        bytes += size;
        const issue = photoIssue({
          bytes: size,
          width: asset.width,
          height: asset.height,
        });
        if (issue) throw Error(issue);
      }
      if (bytes > 32 * 1048576 || pending.length > 8)
        throw Error("Use at most eight images totaling no more than 32 MB.");
      if (run !== attempt.current) {
        pending.forEach(deleteCache);
        return;
      }
      for (const uri of owned.current) deleteCache(uri);
      owned.current = pending;
      setImages(pending);
    } catch (e) {
      pending
        .filter((uri) => !owned.current.includes(uri))
        .forEach((uri) => {
          try {
            deleteCache(uri);
          } catch {
            owned.current = [...owned.current, uri];
          }
        });
      if (run === attempt.current)
        setMessage(
          e instanceof Error
            ? e.message
            : "Product photos could not be opened.",
        );
    } finally {
      if (run === attempt.current) setBusy(false);
    }
  }
  function save() {
    const next = { ...draft, photoCount: images.length };
    const issue = merchantDraftProblem(next, saved);
    if (issue) {
      setMessage(issue);
      return;
    }
    setSaved([...saved, { ...next, id: String(Date.now()) }]);
    setMessage(
      "Session listing draft saved. Photos are not uploaded; nothing is approved, published or indexed.",
    );
  }
  const input = (key: keyof typeof draft, label: string) => (
    <View key={key}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={String(draft[key])}
        maxLength={key === "description" ? 3000 : 300}
        style={s.input}
        onChangeText={(v) => setDraft({ ...draft, [key]: v })}
      />
    </View>
  );
  return (
    <View style={s.section}>
      <Text accessibilityRole="header" style={s.title}>
        Merchant Snap & List
      </Text>
      <Text style={s.body}>
        Product originals stay intact. This local tools session has no business
        authority. Leaving it clears app-owned photo previews.
      </Text>
      <Text style={s.label}>
        {
          [
            "1. Snap",
            "2. AI Enhance",
            "3. Merchant Review",
            "4. Publish & Match",
          ][stage]
        }
      </Text>
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={s.notice}>
          {message}
        </Text>
      )}
      {stage === 0 ? (
        <>
          <View style={s.row}>
            <Switch
              accessibilityLabel="Product image rights"
              value={rights}
              disabled={busy}
              onValueChange={setRights}
            />
            <Text style={s.flex}>
              I have permission to use these product images.
            </Text>
          </View>
          {button(
            busy ? "Opening photo picker…" : "Choose product images",
            () => pick(),
            !rights || busy,
          )}
          {button("Take product photo", () => pick(true), !rights || busy)}
          {images.map((uri, i) => (
            <View key={uri}>
              <Image
                style={s.photo}
                source={{ uri }}
                accessibilityLabel={`Original product photo ${i + 1}, unchanged`}
              />
              <Text style={s.body}>Original · Not enhanced</Text>
            </View>
          ))}
          {button(
            "Clear cached product photos",
            () => {
              attempt.current++;
              setBusy(false);
              try {
                owned.current.forEach(deleteCache);
                owned.current = [];
                setImages([]);
                setMessage(
                  "App-owned photo copies cleared; source library originals are unchanged.",
                );
              } catch {
                setMessage(
                  "A cached copy could not be cleared. Retry deletion before leaving.",
                );
              }
            },
            !images.length,
          )}
          {button("Continue to enhancement options", () => setStage(1), busy)}
        </>
      ) : stage === 1 ? (
        <>
          {enhancementOptions.map((n) => (
            <View style={s.row} key={n}>
              <Switch
                accessibilityLabel={n}
                value={options.includes(n)}
                onValueChange={() =>
                  setOptions(
                    options.includes(n)
                      ? options.filter((v) => v !== n)
                      : [...options, n],
                  )
                }
              />
              <Text style={s.flex}>{n}</Text>
            </View>
          ))}
          <Text style={s.notice}>
            No qualified provider or private storage is connected. No
            enhancement, OCR, barcode match or translation ran.
          </Text>
          {button("Run AI preparation — connection required", undefined, true)}
          {button("Continue with a manual listing draft", () => setStage(2))}
        </>
      ) : stage === 2 ? (
        <>
          {input("title", "Product title")}
          {input("sku", "Source SKU")}
          {input("category", "Category")}
          {input("description", "Factual description")}
          {input("price", "Merchant price")}
          {input("currency", "Currency")}
          {input("stock", "Confirmed stock quantity")}
          {input("country", "Delivery country code")}
          {input("source", "Source evidence reference")}
          {input("destination", "Merchant HTTPS destination")}
          <View style={s.row}>
            <Switch
              accessibilityLabel="Merchant factual review"
              value={draft.reviewed}
              onValueChange={(v) => setDraft({ ...draft, reviewed: v })}
            />
            <Text style={s.flex}>
              I reviewed image rights, product identity, variants, price, stock,
              condition, shipping and all claims. No invented SPF, ingredients,
              medical benefits or certifications.
            </Text>
          </View>
          {button("Save reviewed session listing draft", save)}
          {button("Review publication requirements", () => setStage(3))}
        </>
      ) : (
        <>
          <Text style={s.body}>
            Publication requires verified merchant access, validated original
            media, a current factual revision, content approval, fresh
            commercial evidence and transactional indexing. Published products
            can match every relevant analysis; ads never override relevance.
          </Text>
          {button("Publish — verified connection required", undefined, true)}
          {button("Promote — qualified advertising required", undefined, true)}
        </>
      )}
      {stage > 0 && button("Back", () => setStage(stage - 1))}
      {saved.map((d) => (
        <View key={d.id} style={s.draft}>
          <Text style={s.label}>{d.title}</Text>
          <Text style={s.body}>{d.sku} · Session draft · Not published</Text>
          {button("Delete session listing draft", () =>
            setSaved(saved.filter((n) => n.id !== d.id)),
          )}
        </View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  section: {
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ddd6d2",
    backgroundColor: "white",
    marginVertical: 15,
  },
  title: { fontSize: 26, fontWeight: "600", color: "#17151a" },
  body: { fontSize: 14, lineHeight: 23, color: "#69636c", marginVertical: 14 },
  notice: {
    backgroundColor: "#eee8f3",
    padding: 15,
    borderRadius: 14,
    fontSize: 13,
    lineHeight: 22,
    color: "#49354d",
    marginVertical: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#17151a",
    marginVertical: 14,
  },
  input: {
    minHeight: 50,
    padding: 13,
    borderWidth: 1,
    borderColor: "#847c87",
    borderRadius: 12,
    fontSize: 16,
    color: "#17151a",
  },
  button: {
    minHeight: 48,
    borderRadius: 25,
    padding: 15,
    backgroundColor: "#17151a",
    justifyContent: "center",
    marginVertical: 8,
  },
  disabled: { backgroundColor: "#e9e4e1" },
  white: {
    fontSize: 13,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
  disabledText: { color: "#625b64" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 12,
    minHeight: 48,
  },
  flex: { flex: 1, fontSize: 14, lineHeight: 22, color: "#17151a" },
  photo: {
    height: 280,
    width: "100%",
    resizeMode: "contain",
    borderRadius: 15,
    backgroundColor: "#eee8e4",
  },
  draft: {
    borderTopWidth: 1,
    borderColor: "#ddd6d2",
    paddingTop: 18,
    marginTop: 20,
  },
});
