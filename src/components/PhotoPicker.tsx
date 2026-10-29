"use client";
import { useRef, useState } from "react";

const MAX = 900;

/** Picks a photo, shrinks it in the browser to a small JPEG, and puts it in the form as "photo". */
export function PhotoPicker({ currentUrl, name }: { currentUrl: string | null; name: string }) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [busy, setBusy] = useState(false);
  const hidden = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !hidden.current) return;
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
      if (!blob) return;
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "photo.jpg", { type: "image/jpeg" }));
      hidden.current.files = dt.files;
      setPreview(URL.createObjectURL(blob));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden border border-edge bg-panel text-xs text-muted">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Your photo" className="h-full w-full object-cover" />
        ) : (
          "No photo"
        )}
      </div>
      <label className="btn-line cursor-pointer">
        {busy ? "Preparing…" : preview ? "Change photo" : "Add photo"}
        <input type="file" accept="image/*" className="sr-only" onChange={onPick} />
      </label>
      <input ref={hidden} type="file" name={name} className="hidden" tabIndex={-1} aria-hidden />
    </div>
  );
}
