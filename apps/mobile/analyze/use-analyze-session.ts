import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { File } from "expo-file-system";
import type { CoreAccount } from "../../../packages/auth/core";
import type { AnalysisGoal } from "../../../packages/product/analysis";
import { useNativeAnalysis } from "../NativeAnalysisJourney";
import { CaptureFiles, type CapturePhoto } from "./capture-photo";

export function useAnalyzeSession(account: CoreAccount | null, privacyRevision = 0) {
  const [files] = useState(() => new CaptureFiles());
  const [photo, setPhoto] = useState<CapturePhoto | null>(null);
  const [goals, setGoals] = useState<AnalysisGoal[]>([]);
  const [foregroundRevision, setForegroundRevision] = useState(0);
  const [withdrawalRequest, setWithdrawalRequest] = useState(0);
  const [cleanupFailed, setCleanupFailed] = useState(false);
  const subject = account?.profile.id || "anonymous";
  const owner = useRef(subject), currentPhoto = useRef(photo);
  currentPhoto.current = owner.current === subject ? photo : null;
  const readPhoto = useCallback(async () => {
    const selected = currentPhoto.current;
    if (!selected || files.photo?.uri !== selected.uri) throw Error("Current private photo required");
    const bytes = await new File(selected.uri).arrayBuffer();
    if (currentPhoto.current !== selected || files.photo?.uri !== selected.uri || bytes.byteLength !== selected.bytes) throw Error("Private photo changed");
    return bytes;
  }, [files]);
  const operations = useNativeAnalysis({ account, apiOrigin: process.env.EXPO_PUBLIC_GLAM_API_ORIGIN || "", photoUri: currentPhoto.current?.uri, readPhoto, goals, privacyRevision: privacyRevision + foregroundRevision });
  const selectPhoto = useCallback((value: CapturePhoto | null) => setPhoto(value), []);
  const selectGoals = useCallback((values: string[]) => {
    const result: AnalysisGoal[] = [];
    if (values.some(v => v !== "Try a new colour palette")) result.push("Understand my features", "Makeup techniques");
    if (values.includes("Try a new colour palette")) result.push("Discover my colors");
    setGoals(result);
  }, []);
  const clear = useCallback(() => { currentPhoto.current = null; setPhoto(null); const clean = files.clear(); setCleanupFailed(!clean); return clean; }, [files]);
  // Start withdrawal after the photo scope has changed. Otherwise clearing the
  // photo would abort the withdrawal request during the next render.
  const withdraw = () => { clear(); setWithdrawalRequest(n => n + 1); };
  useEffect(() => { if (withdrawalRequest) void operations.withdraw(); }, [withdrawalRequest]);
  useEffect(() => {
    if (owner.current !== subject) { owner.current = subject; clear(); setGoals([]); }
  }, [subject, clear]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "background") { clear(); setForegroundRevision(n => n + 1); }
    });
    return () => { subscription.remove(); files.clear(); };
  }, [clear, files]);
  return { files, photo: owner.current === subject ? photo : null, goals, selectPhoto, selectGoals, clear, cleanupFailed, withdraw, readPhoto, operations };
}
export type AnalyzeSession = ReturnType<typeof useAnalyzeSession>;
