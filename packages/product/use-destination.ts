import { useEffect, useRef, useState } from "react";
import { travelProblem, validWeather } from "./companion";
import type {
  CompanionConnection,
  TravelPlan,
  WeatherResult,
} from "./companion";
export function useDestination(connection?: CompanionConnection) {
  const [plan, setPlan] = useState<TravelPlan>({
    destination: "",
    country: "",
    start: "",
    end: "",
    activities: "",
    preferences: "",
    sourcing: "before-departure",
  });
  const [weather, setWeather] = useState<WeatherResult | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [packing, setPacking] = useState<
    { id: string; name: string; packed: boolean }[]
  >([]);
  const ticket = useRef(0),
    abort = useRef<AbortController | null>(null);
  function cancel() {
    ticket.current++;
    abort.current?.abort();
    setBusy(false);
  }
  useEffect(
    () => () => {
      ticket.current++;
      abort.current?.abort();
    },
    [],
  );
  useEffect(() => {
    cancel();
    setWeather(null);
    setMessage("");
  }, [connection]);
  function edit<K extends keyof TravelPlan>(key: K, value: TravelPlan[K]) {
    cancel();
    setPlan((p) => ({ ...p, [key]: value }));
    setWeather(null);
    setMessage("");
  }
  async function check() {
    const problem = travelProblem(plan);
    if (problem) {
      setMessage(problem);
      return;
    }
    if (!connection?.weather) {
      setMessage(
        "Weather service is not connected. No forecast or seasonal estimate has been generated.",
      );
      return;
    }
    const id = ++ticket.current,
      controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setMessage("");
    try {
      const result = await connection.weather(plan, controller.signal);
      if (ticket.current !== id) return;
      if (!validWeather(result, plan)) throw Error();
      setWeather(result);
    } catch {
      if (ticket.current === id) {
        setWeather(null);
        setMessage(
          "Weather could not be verified. Your trip and packing notes are preserved.",
        );
      }
    } finally {
      if (ticket.current === id) setBusy(false);
    }
  }
  useEffect(() => {
    if (!weather) return;
    const timer = setTimeout(
      () => {
        setWeather(null);
        setMessage(
          "Weather evidence expired. Check again before using it to plan.",
        );
      },
      Math.max(
        0,
        Math.min(2147483647, Date.parse(weather.expiresAt) - Date.now()),
      ),
    );
    return () => clearTimeout(timer);
  }, [weather]);
  return {
    plan,
    edit,
    weather:
      weather && Date.parse(weather.expiresAt) > Date.now() ? weather : null,
    busy,
    message,
    check,
    cancel,
    packing,
    setPacking,
  };
}
