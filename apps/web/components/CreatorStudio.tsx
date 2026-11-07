"use client";
import { useState } from "react";
import { socialProviders } from "../../../packages/product/creator";
import type { CreatorProvider } from "../../../packages/product/creator";
import { useCreator } from "../../../packages/product/use-creator";
import { publicAuthKey } from "../lib/passwordless";

export default function CreatorStudio({ token }: { token?: string }) {
  const { data, busy, message, act } = useCreator(publicAuthKey, token);
  const [provider, setProvider] = useState<CreatorProvider>("tiktok");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState(""), [mediaUrl, setMediaUrl] = useState(""), [rights, setRights] = useState(false);
  const [collection, setCollection] = useState(""), [sponsored, setSponsored] = useState(false), [disclosure, setDisclosure] = useState("");
  return <section className="panel creator-studio" aria-labelledby="creator-title" aria-busy={busy}>
    <p className="eyebrow">Your creative space</p><h2 id="creator-title">Creator Studio</h2>
    <p>Bring your beauty stories together. Keep profile links, inspiration and collection drafts in your GLAM Beauty account.</p>
    <p className="fine">Separate from social sign-in. Manual links are unverified. Social import, publishing, campaign execution, attribution and payouts are unavailable.</p>
    {!token ? <p>Sign in above to open your private studio.</p> : <>
      {busy && <p role="status">Loading or saving your studio…</p>}
      {message && <p role="status">{message}</p>}
      <form key={data.profile?.revision || "new"} onSubmit={async e => { e.preventDefault(); const values = new FormData(e.currentTarget); await act(data.profile ? "PATCH" : "POST", "/profile", { handle: values.get("creator-handle"), display_name: values.get("creator-name"), bio: values.get("creator-bio"), ...(data.profile ? { expected_revision: data.profile.revision } : {}) }); }}>
        <h3>{data.profile ? "Your creator profile" : "Create a private creator profile"}</h3>
        <label>Creator handle<input name="creator-handle" required pattern="[a-z0-9][a-z0-9_-]{2,39}" maxLength={40} defaultValue={data.profile?.handle} /></label>
        <label>Creator display name<input name="creator-name" required maxLength={160} defaultValue={data.profile?.display_name} /></label>
        <label>Creator bio<textarea name="creator-bio" maxLength={4000} defaultValue={data.profile?.bio} /></label>
        <button className="button" disabled={busy}>Save private creator profile</button>
        <p className="fine">Saving requires an explicitly verified adult account. This does not grant a business role or publish a public page.</p>
      </form>
      {data.profile && <>
        <h3>Social profiles</h3>
        <label>Social platform<select value={provider} onChange={e => setProvider(e.target.value as CreatorProvider)}>{socialProviders.map(p => <option key={p} value={p}>{p === "youtube" ? "YouTube" : p === "tiktok" ? "TikTok" : p[0].toUpperCase() + p.slice(1)}</option>)}</select></label>
        <form onSubmit={async e => { e.preventDefault(); if (await act("POST", "/connections", { provider, profile_url: url })) setUrl(""); }}>
          <label>Public social profile URL<input type="url" required value={url} maxLength={2048} onChange={e => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@yourhandle" /></label>
          <button className="button secondary" disabled={busy}>Save unverified profile link</button>
        </form>
        {data.connections.filter(c => c.status !== "revoked").map(c => <article key={c.id} className="draft"><strong>{c.provider}</strong><p><a href={c.profile_url} target="_blank" rel="noopener noreferrer">Open public profile</a> · {c.status === "manual_unverified" ? "Manual · unverified" : c.status}</p><button className="text-button" disabled={busy} onClick={() => void act("DELETE", "/connections/" + c.id)}>Remove {c.provider} link</button></article>)}
        <h3>Portfolio drafts</h3>
        <form onSubmit={async e => { e.preventDefault(); if (await act("POST", "/media", { provider, source_url: mediaUrl, title, rights_confirmed: rights })) { setTitle(""); setMediaUrl(""); setRights(false); } }}>
          <label>Content title<input required value={title} maxLength={240} onChange={e => setTitle(e.target.value)} /></label>
          <label>Public {provider} content URL<input type="url" required value={mediaUrl} maxLength={2048} onChange={e => setMediaUrl(e.target.value)} /></label>
          <label className="check"><input type="checkbox" required checked={rights} onChange={e => setRights(e.target.checked)} />I own this content or have permission to use it.</label>
          <button className="button secondary" disabled={busy}>Save portfolio draft</button>
        </form>
        {data.media.map(m => <article key={m.id} className="draft"><h4>{m.title}</h4><p>{m.provider} · Private draft · Creator submitted</p><button className="text-button" disabled={busy} onClick={() => void act("DELETE", "/media/" + m.id)}>Delete {m.title}</button></article>)}
        <h3>Collection drafts</h3>
        <form onSubmit={async e => { e.preventDefault(); if (await act("POST", "/collections", { title: collection, sponsored, disclosure, rights_confirmed: true, product_ids: [] })) setCollection(""); }}>
          <label>Collection title<input required value={collection} maxLength={240} onChange={e => setCollection(e.target.value)} /></label>
          <label className="check"><input type="checkbox" checked={sponsored} onChange={e => setSponsored(e.target.checked)} />This collection is sponsored</label>
          {sponsored && <label>Sponsorship disclosure<input required value={disclosure} maxLength={1000} onChange={e => setDisclosure(e.target.value)} /></label>}
          <label className="check"><input type="checkbox" required />I have the rights to this collection.</label>
          <button className="button secondary" disabled={busy}>Save private collection draft</button>
        </form>
        <p className="fine">Product selection and shoppable publication require qualified marketplace matches and publication approval.</p>
        {data.collections.map(c => <article className="draft" key={c.id}><h4>{c.title}</h4><p>Private draft{c.sponsored ? " · Sponsored: " + c.disclosure : ""}</p><button className="text-button" disabled={busy} onClick={() => void act("DELETE", "/collections/" + c.id)}>Delete {c.title}</button></article>)}
        <h3>Earnings</h3><p>No verified earnings data is connected. No balance or payout is available. Creator commission requires an explicit agreement; the existing 10% marketplace item commission remains separate.</p>
      </>}
    </>}
  </section>;
}
