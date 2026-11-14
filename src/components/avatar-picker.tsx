"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const allowed = ["image/jpeg", "image/png", "image/webp"];

export function AvatarPicker({ file, onChange, currentSrc = "/default-avatar.svg", canRemove = false, onRemove, disabled = false }: {
  file: File | null;
  onChange: (file: File | null) => void;
  currentSrc?: string;
  canRemove?: boolean;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  return <div className="avatar-picker">
    <div className="avatar-picker-image"><Image src={file && preview ? preview : currentSrc} alt="Your profile photo" fill sizes="96px" unoptimized/></div>
    <div className="avatar-picker-copy"><strong>PROFILE PHOTO</strong><span>JPG, PNG or WebP · 3 MB max</span><div className="avatar-picker-actions"><label className="avatar-picker-button">{file || canRemove ? "CHANGE PHOTO" : "ADD PHOTO"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={event => {
      const selected = event.target.files?.[0];
      event.target.value = "";
      if (!selected) return;
      if (!allowed.includes(selected.type)) { setError("Choose a JPG, PNG, or WebP photo."); return; }
      if (selected.size > 3 * 1024 * 1024) { setError("Choose a photo under 3 MB."); return; }
      setError("");
      setPreview(URL.createObjectURL(selected));
      onChange(selected);
    }}/></label>{(file || canRemove) && <button type="button" disabled={disabled} onClick={() => { setError(""); setPreview(null); onChange(null); onRemove?.(); }}>REMOVE</button>}</div>{error && <span className="avatar-picker-error" role="alert">{error}</span>}</div>
  </div>;
}
