import { useEffect, useRef, useState } from "react";
import { creatorEmpty, creatorRequest } from "./creator";
import type { CreatorState } from "./creator";
export function useCreator(publicKey: string, token?: string) {
  const [data, setData] = useState<CreatorState>(creatorEmpty), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const fence = useRef(0);
  useEffect(() => { const ticket = ++fence.current; setData(creatorEmpty); setMessage(""); setBusy(Boolean(token));
    if (token) void creatorRequest<CreatorState>(publicKey, token, "GET").then(value => { if (ticket === fence.current) setData(value); }).catch(error => { if (ticket === fence.current) setMessage(error.message); }).finally(() => { if (ticket === fence.current) setBusy(false); });
    return () => { ++fence.current; };
  }, [publicKey, token]);
  async function act(method: string, path: string, body?: unknown) {
    if (!token || busy) return false;
    const ticket = ++fence.current; setBusy(true); setMessage("");
    try {
      await creatorRequest(publicKey, token, method, path, body);
      const value = await creatorRequest<CreatorState>(publicKey, token, "GET");
      if (ticket !== fence.current) return false;
      setData(value); setMessage("Saved to your private Creator Studio. Nothing was published."); return true;
    } catch (error) { if (ticket === fence.current) setMessage(error instanceof Error ? error.message : "Save could not be confirmed."); return false; }
    finally { if (ticket === fence.current) setBusy(false); }
  }
  return { data, busy, message, act };
}
