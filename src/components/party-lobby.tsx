"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import { ArrowRight, Check, Crown, Search, UserPlus, UsersRound, X } from "lucide-react";

type Member = { id: string; handle: string; hasAvatar: boolean };
type Friend = { id: string; handle: string; hasAvatar: boolean; inParty: number; queued: number };
type Invite = { id: string; partyId: string; inviter: string };
type OutgoingInvite = { id: string; inviteeId: string; invitee: string };
type Data = { party: null | { id: string; leaderId: string; isLeader: boolean; members: Member[] }; incoming: Invite[]; outgoing: OutgoingInvite[]; friends: Friend[] };

export function PartyLobby({ userId, playerHandle, mode, onPartyChange }: { userId: string; playerHandle: string; mode: "1v1" | "2v2" | "3v3"; onPartyChange: (active: boolean) => void }) {
  const [data, setData] = useState<Data>({ party: null, incoming: [], outgoing: [], friends: [] });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/party", { cache: "no-store" });
      if (response.ok) {
        const next = await response.json() as Data;
        setData(next);
        setLoaded(true);
        onPartyChange(Boolean(next.party));
      }
    } catch { setMessage("Party connection interrupted."); }
  }, [onPartyChange]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [refresh]);

  useEffect(() => {
    if (!inviteOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInviteOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [inviteOpen]);

  async function action(actionName: string, values: Record<string, string> = {}) {
    setBusy(values.targetId ?? values.inviteId ?? actionName);
    setMessage("");
    try {
      const response = await fetch("/api/party", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName, ...values }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setMessage(result.error ?? "Party action failed."); return false; }
      await refresh();
      return true;
    } catch { setMessage("Party connection interrupted."); return false; }
    finally { setBusy(""); }
  }

  const members = data.party?.members ?? [{ id: userId, handle: playerHandle, hasAvatar: true }];
  const capacity = Number(mode[0]);
  const outgoingIds = new Set(data.outgoing.map(invite => invite.inviteeId));
  const filteredFriends = useMemo(() => {
    const query = friendSearch.trim().toLocaleLowerCase();
    return data.friends.filter(friend => !query || friend.handle.toLocaleLowerCase().includes(query));
  }, [data.friends, friendSearch]);

  async function inviteFriend(friendId: string) {
    const sent = await action("invite", { targetId: friendId });
    if (sent) {
      setFriendSearch("");
      setInviteOpen(false);
    }
  }

  if (mode === "1v1") return null;

  return <section className="party-lobby" aria-label="Party lobby">
    <header className="party-lobby-head"><div><UsersRound size={20}/><h2>PARTY</h2></div></header>
    {data.incoming.length > 0 && <div className="party-invites"><strong>PARTY INVITES</strong>{data.incoming.map(invite => <div className="party-invite-row" key={invite.id}><span>{invite.inviter} invited you</span><button type="button" disabled={busy === invite.id} onClick={() => void action("accept", { inviteId: invite.id })} aria-label="Accept invite"><Check size={16}/></button><button type="button" disabled={busy === invite.id} onClick={() => void action("decline", { inviteId: invite.id })} aria-label="Decline invite"><X size={16}/></button></div>)}</div>}
    {data.outgoing.length > 0 && <div className="party-invites"><strong>AWAITING RESPONSE</strong>{data.outgoing.map(invite => <div className="party-invite-row" key={invite.id}><span>{invite.invitee}</span><small>INVITED</small>{data.party?.isLeader && <button type="button" disabled={busy === invite.id} onClick={() => void action("cancelInvite", { inviteId: invite.id })} aria-label={`Cancel invite to ${invite.invitee}`}><X size={16}/></button>}</div>)}</div>}
    <div className="party-lobby-roster">
      {members.map(member => <div className="party-lobby-member" key={member.id}>
        <span className="party-lobby-avatar">{member.hasAvatar ? <Image src={`/api/profile/avatar?userId=${encodeURIComponent(member.id)}`} alt="" fill sizes="38px" unoptimized/> : member.handle.slice(0, 1).toUpperCase()}</span>
        <span className="party-lobby-member-copy"><strong>{member.handle}</strong><small>{member.id === userId ? (data.party ? "PARTY LEADER" : "YOU") : member.id === data.party?.leaderId ? "PARTY LEADER" : "PARTY MEMBER"}</small></span>
        {member.id === userId || member.id === data.party?.leaderId ? <Crown size={15} className="party-crown"/> : <button className="party-kick" type="button" disabled={!data.party?.isLeader || Boolean(busy)} onClick={() => void action("kick", { targetId: member.id })} aria-label={`Remove ${member.handle}`}><X size={15}/></button>}
      </div>)}
      {Array.from({ length: Math.max(0, capacity - members.length) }, (_, index) => {
        const canInvite = !data.party || data.party.isLeader;
        return <div className="party-lobby-open" key={`slot-${index}`}>
          <span><UserPlus size={17}/></span>
          {canInvite ? <button className="party-open-invite" type="button" disabled={Boolean(busy)} onClick={() => { setMessage(""); setInviteOpen(true); }}><strong>INVITE FRIEND</strong><small>CHOOSE FROM YOUR FRIENDS</small><ArrowRight size={17}/></button> : <strong>WAITING FOR INVITE</strong>}
        </div>;
      })}
    </div>
    <footer className="party-lobby-footer">
      {data.party ? <button type="button" disabled={Boolean(busy)} onClick={() => void action("leave")}>LEAVE PARTY</button> : <Link href="/players" className="party-find-friends"><span className="party-find-friends-icon"><UserPlus size={19}/></span><strong>FIND FRIENDS</strong><ArrowRight className="party-find-friends-arrow" size={19}/></Link>}
    </footer>
    {message && <p className="party-lobby-error" role="status">{message}</p>}
    {inviteOpen && createPortal(<div className="party-invite-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setInviteOpen(false); }}>
      <section className="party-invite-dialog" role="dialog" aria-modal="true" aria-labelledby="party-invite-title">
        <header className="party-invite-dialog-head">
          <span className="party-invite-dialog-icon"><UsersRound size={21}/></span>
          <div><small>BUILD YOUR SQUAD</small><h2 id="party-invite-title">FRIENDS TO INVITE</h2><p>{data.friends.length ? `${data.friends.length} friend${data.friends.length === 1 ? "" : "s"} in your list · ${Math.max(0, capacity - members.length)} open slot${capacity - members.length === 1 ? "" : "s"}` : "Invite a friend to join your team."}</p></div>
          <button type="button" className="party-invite-close" disabled={Boolean(busy)} onClick={() => setInviteOpen(false)} aria-label="Close friends to invite"><X size={20}/></button>
        </header>
        <label className="party-invite-search"><Search size={17}/><input autoFocus value={friendSearch} onChange={event => setFriendSearch(event.target.value)} placeholder="Search friends" aria-label="Search friends"/><kbd>/</kbd></label>
        <div className="party-invite-friend-list" aria-live="polite">
          {!loaded ? <div className="party-invite-empty"><UsersRound size={24}/><strong>LOADING FRIENDS</strong><span>Getting your friend list…</span></div> : filteredFriends.length ? filteredFriends.map(friend => {
            const reason = friend.inParty ? "IN A PARTY" : friend.queued ? "IN QUEUE" : outgoingIds.has(friend.id) ? "INVITE SENT" : "READY";
            const unavailable = reason !== "READY";
            return <div className={`party-invite-friend ${unavailable ? "party-invite-friend-unavailable" : ""}`} key={friend.id}>
              <span className="party-invite-friend-avatar">{friend.hasAvatar ? <Image src={`/api/profile/avatar?userId=${encodeURIComponent(friend.id)}`} alt="" fill sizes="42px" unoptimized/> : friend.handle.slice(0, 1).toUpperCase()}</span>
              <span className="party-invite-friend-info"><strong>{friend.handle}</strong><small><i className={unavailable ? "" : "party-friend-ready-dot"}/>{reason}</small></span>
              {unavailable ? <span className="party-invite-state">{reason}</span> : <button type="button" className="party-invite-send" disabled={Boolean(busy)} onClick={() => void inviteFriend(friend.id)}>{busy === friend.id ? "SENDING" : "INVITE"}<ArrowRight size={15}/></button>}
            </div>;
          }) : data.friends.length ? <div className="party-invite-empty"><Search size={24}/><strong>NO FRIENDS FOUND</strong><span>Try a different name.</span></div> : <div className="party-invite-empty"><UsersRound size={26}/><strong>NO FRIENDS TO INVITE YET</strong><span>Add friends first, then bring them into your squad.</span><Link href="/players" onClick={() => setInviteOpen(false)}>FIND PLAYERS<ArrowRight size={15}/></Link></div>}
        </div>
        <footer className="party-invite-dialog-foot"><span><i/>INVITES ARRIVE IN THEIR PARTY TAB</span><button type="button" disabled={Boolean(busy)} onClick={() => setInviteOpen(false)}>DONE</button></footer>
      </section>
    </div>, document.body)}
  </section>;
}
