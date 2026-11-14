"use client";

import { useState } from "react";
import { AvatarPicker } from "@/components/avatar-picker";

export function AvatarSettings({ hasAvatar }: { hasAvatar: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [present, setPresent] = useState(hasAvatar);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function change(selected: File | null) {
    setFile(selected);
    if (!selected) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.set("avatar", selected);
    try {
      const response = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) { setMessage(body.error ?? "Could not save the photo."); return; }
      setPresent(true);
      setVersion(Date.now());
      window.dispatchEvent(new Event("player-avatar-updated"));
      setMessage("Photo updated.");
    } catch { setMessage("Could not connect. Try again."); }
    finally { setFile(null); setBusy(false); }
  }

  async function remove() {
    if (!present) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!response.ok) { setMessage("Could not remove the photo."); return; }
      setPresent(false);
      setVersion(Date.now());
      window.dispatchEvent(new Event("player-avatar-updated"));
      setMessage("Default photo restored.");
    } catch { setMessage("Could not connect. Try again."); }
    finally { setBusy(false); }
  }

  return <section className="account-avatar" aria-label="Profile photo"><AvatarPicker file={file} onChange={change} currentSrc={present ? `/api/profile/avatar?v=${version}` : "/default-avatar.svg"} canRemove={present} onRemove={remove} disabled={busy}/>{message && <p role="status" className="account-avatar-status">{message}</p>}</section>;
}
