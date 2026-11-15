"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

export function FriendActionButton({ targetId, initialStatus, requestedBy, userId }: { targetId: string; initialStatus: "pending" | "accepted" | null; requestedBy: string | null; userId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [requester, setRequester] = useState(requestedBy);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const action = status === "accepted" ? "remove" : status === "pending" ? requester === userId ? "remove" : "accept" : "request";
  const label = status === "accepted" ? "REMOVE FRIEND" : status === "pending" ? requester === userId ? "CANCEL REQUEST" : "ACCEPT FRIEND REQUEST" : "ADD FRIEND";
  async function update() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId, action }) });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error ?? "Could not update friendship."); }
      if (action === "request") { setStatus("pending"); setRequester(userId); }
      else if (action === "accept") setStatus("accepted");
      else { setStatus(null); setRequester(null); }
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update friendship."); }
    finally { setBusy(false); }
  }
  return <div><button type="button" disabled={busy} onClick={update}><UserPlus size={17}/> {busy ? "UPDATING" : label}</button>{error && <p role="alert">{error}</p>}</div>;
}
