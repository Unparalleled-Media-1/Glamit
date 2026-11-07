import { useEffect, useRef, useState } from "react";
import { featureKeys, validAnalysis, validPreview } from "./companion";
import type {
  AnalysisResult,
  CompanionConnection,
  Corrections,
  FeatureKey,
  LookDirection,
  PreviewResult,
} from "./companion";
/** Private session state; never browser/device storage. Identity/photo/correction changes invalidate descendants. */
export function usePersonalResults(
  connection: CompanionConnection | undefined,
  photoUri: string | undefined,
  goals: readonly string[],
) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [corrections, setCorrections] = useState<Corrections>({});
  const [correctionRevision, setCorrectionRevision] = useState(0);
  const [direction, setDirection] = useState<LookDirection | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [busy, setBusy] = useState<"analysis" | "preview" | null>(null);
  const [error, setError] = useState("");
  const scope = useRef({ connection, photoUri });
  const currentScope =
    scope.current.connection === connection &&
    scope.current.photoUri === photoUri;
  const revision = useRef(0),
    ticket = useRef(0),
    abort = useRef<AbortController | null>(null);
  function cancel() {
    ticket.current++;
    abort.current?.abort();
    abort.current = null;
    setBusy(null);
  }
  useEffect(() => {
    scope.current = { connection, photoUri };
    revision.current++;
    cancel();
    setAnalysis(null);
    setCorrections({});
    setCorrectionRevision(0);
    setDirection(null);
    setPreview(null);
    setError("");
    return () => {
      ticket.current++;
      abort.current?.abort();
    };
  }, [photoUri, connection]);
  function correct(key: FeatureKey, value: string) {
    if (!featureKeys.includes(key)) return;
    cancel();
    setCorrections((s) => ({ ...s, [key]: value.slice(0, 240) }));
    setCorrectionRevision((n) => n + 1);
    setPreview(null);
    setError("");
  }
  function choose(d: LookDirection) {
    cancel();
    setDirection(d);
    setPreview(null);
    setError("");
  }
  async function run(kind: "analysis" | "preview") {
    if (!photoUri || !connection || busy) return;
    const controller = new AbortController();
    abort.current?.abort();
    abort.current = controller;
    const id = ++ticket.current,
      photoRevision = revision.current;
    setBusy(kind);
    setError("");
    try {
      if (kind === "analysis") {
        if (!connection.analyze) throw Error();
        const result = await connection.analyze(
          { photoUri, photoRevision, goals, consent: true },
          controller.signal,
        );
        if (id !== ticket.current) return;
        if (!validAnalysis(result, connection.subject, photoRevision))
          throw Error();
        setAnalysis(result);
        setCorrections({});
        setCorrectionRevision(0);
        setDirection(null);
        setPreview(null);
      } else {
        if (!connection.tryOn || !analysis || !direction) throw Error();
        const result = await connection.tryOn(
          {
            photoUri,
            photoRevision,
            analysisId: analysis.id,
            corrections,
            correctionRevision,
            direction,
            consent: true,
          },
          controller.signal,
        );
        if (id !== ticket.current) return;
        if (
          !validPreview(
            result,
            connection,
            analysis,
            correctionRevision,
            direction.id,
          )
        )
          throw Error();
        setPreview(result);
      }
    } catch {
      if (id === ticket.current)
        setError(
          "The service could not complete a verified result. Your original and choices are preserved. Retry when the connection is available.",
        );
    } finally {
      if (id === ticket.current) setBusy(null);
    }
  }
  useEffect(() => {
    if (!preview) return;
    const timer = setTimeout(
      () => setPreview(null),
      Math.max(
        0,
        Math.min(2147483647, Date.parse(preview.expiresAt) - Date.now()),
      ),
    );
    return () => clearTimeout(timer);
  }, [preview]);
  const visiblePreview =
    preview && Date.parse(preview.expiresAt) > Date.now() ? preview : null;
  return {
    analysis: currentScope ? analysis : null,
    corrections: currentScope ? corrections : {},
    correctionRevision,
    direction: currentScope ? direction : null,
    preview: currentScope ? visiblePreview : null,
    busy,
    error,
    correct,
    choose,
    cancel,
    run,
  };
}
export type PersonalResultsState = ReturnType<typeof usePersonalResults>;
