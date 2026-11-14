"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <button className="account-signout" type="button" disabled={busy} onClick={async () => {
    setBusy(true);
    await fetch("/api/matchmaking", { method: "DELETE" }).catch(() => {});
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }}><LogOut size={17}/>{busy ? "SIGNING OUT" : "SIGN OUT"}</button>;
}
