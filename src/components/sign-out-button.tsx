"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return <button className="account-signout" type="button" disabled={busy} onClick={async () => {
    setBusy(true);
    await fetch("/api/matchmaking", { method: "DELETE" }).catch(() => {});
    await authClient.signOut();
    window.location.replace("/");
  }}><LogOut size={17}/>{busy ? "SIGNING OUT" : "SIGN OUT"}</button>;
}
