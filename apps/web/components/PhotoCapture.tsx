"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Camera frames remain on this device. Starting requires explicit consent and a user gesture. */
export default function PhotoCapture({
  allowed,
  onPhoto,
}: {
  allowed: boolean;
  onPhoto: (file: File) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null),
    fence = useRef(0),
    callback = useRef(onPhoto);
  callback.current = onPhoto;
  const [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);
  const close = useCallback(() => {
    fence.current++;
    stop();
    dialog.current?.close();
    setBusy(false);
    setReady(false);
  }, [stop]);
  useEffect(() => {
    if (!allowed) close();
  }, [allowed, close]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) close();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      fence.current++;
      stop();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [close, stop]);
  async function start() {
    if (!allowed || busy) return;
    const ticket = ++fence.current;
    setBusy(true);
    setReady(false);
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera access requires HTTPS and a supported browser. You can choose an existing photo.",
      );
      setBusy(false);
      return;
    }
    try {
      const camera = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (ticket !== fence.current) {
        camera.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = camera;
      if (!video.current || !dialog.current) {
        stop();
        return;
      }
      video.current.srcObject = camera;
      dialog.current.showModal();
      await video.current.play();
    } catch (reason) {
      if (ticket !== fence.current) return;
      stop();
      dialog.current?.close();
      if (ticket === fence.current)
        setError(
          reason instanceof DOMException && reason.name === "NotAllowedError"
            ? "Camera permission was denied or blocked. Allow camera access in your browser settings, or choose a photo."
            : "The camera could not be opened. It may be unavailable or in use. You can choose a photo instead.",
        );
    } finally {
      if (ticket === fence.current) setBusy(false);
    }
  }
  function capture() {
    if (!allowed || !ready || busy || !video.current) return;
    const ticket = fence.current,
      source = video.current;
    const canvas = document.createElement("canvas");
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
    const context = canvas.getContext("2d");
    if (!context || !canvas.width || !canvas.height) {
      setError("The camera is not ready. Try again.");
      return;
    }
    setBusy(true);
    context.drawImage(source, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (ticket !== fence.current) return;
        if (!blob) {
          setBusy(false);
          setError("This frame could not be saved. Try again.");
          return;
        }
        close();
        callback.current(
          new File([blob], "camera-photo.jpg", { type: "image/jpeg" }),
        );
      },
      "image/jpeg",
      0.92,
    );
  }
  return (
    <>
      <button
        type="button"
        className="button secondary"
        disabled={!allowed || busy}
        onClick={() => void start()}
        aria-describedby="photo-consent-help"
      >
        {busy ? "Opening camera…" : "Take a photo"}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <dialog
        ref={dialog}
        className="photo-camera-dialog"
        aria-labelledby="photo-camera-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <h2 id="photo-camera-title">Take a private photo</h2>
        <p>
          The camera stays on only while this dialog is open. No photo is
          uploaded.
        </p>
        <video
          ref={video}
          autoPlay
          muted
          playsInline
          onLoadedMetadata={() =>
            setReady(
              Boolean(
                stream.current &&
                  video.current?.videoWidth &&
                  video.current?.videoHeight,
              ),
            )
          }
          aria-label="Live camera preview"
        />
        <div className="actions">
          <button
            type="button"
            className="button"
            disabled={!ready || busy}
            onClick={capture}
          >
            Use this photo
          </button>
          <button type="button" className="button secondary" onClick={close}>
            Cancel camera
          </button>
        </div>
      </dialog>
    </>
  );
}
