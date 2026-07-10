"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * /moderation — écran d'exploitation FACILITATEUR (P1, vague 3).
 * Non lié depuis la nav publique : accès par URL directe.
 *
 * Sans session : formulaire mot de passe (POST /api/auth/login → cookie
 * httpOnly). Connecté : grille des entrées de la banque avec actions
 * Approuver / Rejeter (pending) et Supprimer (partout, retrait RGPD).
 * Fonctionnel avant tout — pas de sur-design.
 */

type Entry = {
  id: string;
  scene: string;
  label: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  moderatedAt: string | null;
  expired: boolean;
  mediaUrl: string | null;
};

type View = "checking" | "login" | "list";

const PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-full bg-brand-teal px-6 py-2.5 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40";
const GHOST =
  "inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-xs text-muted transition-colors hover:border-brand-teal/50 hover:text-mist disabled:cursor-not-allowed disabled:opacity-40";
const DANGER =
  "inline-flex items-center gap-2 rounded-full border border-red-500/40 px-4 py-2 font-mono text-xs text-red-300/90 transition-colors hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40";

const STATUS_BADGE: Record<Entry["status"], { label: string; cls: string }> = {
  pending: { label: "En attente", cls: "border-brand-blue/60 text-brand-blue" },
  approved: { label: "Approuvée", cls: "border-brand-teal/60 text-brand-teal" },
  rejected: { label: "Rejetée", cls: "border-line text-muted" },
};

export default function ModerationPage() {
  const [view, setView] = useState<View>("checking");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // NB : aucun setState avant le premier await (règle set-state-in-effect —
  // loadEntries est appelée depuis l'effet de montage).
  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/bank/moderation", { cache: "no-store" });
      if (res.status === 401) {
        setView("login");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Lecture impossible.");
      setEntries(Array.isArray(data?.entries) ? data.entries : []);
      setListError(null);
      setView("list");
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Erreur inconnue.");
      setView("list");
    }
  }, []);

  // Au montage : la session existante (cookie) décide de la vue.
  // (IIFE async : aucun setState synchrone dans le corps de l'effet.)
  useEffect(() => {
    (async () => {
      await loadEntries();
    })();
  }, [loadEntries]);

  const login = useCallback(
    async (password: string) => {
      setLoginError(null);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setLoginError(
          res.status === 401
            ? "Mot de passe incorrect."
            : "Connexion impossible. Réessayez.",
        );
        return;
      }
      await loadEntries();
    },
    [loadEntries],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setEntries([]);
    setView("login");
  }, []);

  // Action de modération + rechargement de la liste.
  const act = useCallback(
    async (entry: Entry, action: "approve" | "reject" | "delete") => {
      if (
        action === "reject" &&
        !window.confirm(
          `Rejeter « ${entry.label} » ? L'image sera définitivement supprimée (la ligne reste comme trace).`,
        )
      )
        return;
      if (
        action === "delete" &&
        !window.confirm(
          `Supprimer complètement « ${entry.label} » ? Ligne ET image disparaissent (retrait RGPD).`,
        )
      )
        return;

      setBusyId(entry.id);
      try {
        const res = await fetch(
          action === "delete"
            ? `/api/bank/${entry.id}`
            : `/api/bank/${entry.id}/${action}`,
          { method: action === "delete" ? "DELETE" : "POST" },
        );
        if (res.status === 401) {
          setView("login");
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setListError(data?.message || "Action impossible.");
          return;
        }
        await loadEntries();
      } finally {
        setBusyId(null);
      }
    },
    [loadEntries],
  );

  if (view === "checking") {
    return (
      <main className="flex flex-1 items-center justify-center pb-16">
        <span className="font-mono text-sm text-muted">Vérification…</span>
      </main>
    );
  }

  if (view === "login") return <Login onSubmit={login} error={loginError} />;

  const pendingCount = entries.filter((e) => e.status === "pending").length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-teal/80">
            Écran facilitateur
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-mist">
            Modération de la banque
          </h2>
          <p className="font-mono text-sm text-muted">
            {pendingCount} en attente · {entries.length} au total
          </p>
        </div>
        <button type="button" onClick={logout} className={GHOST}>
          Se déconnecter
        </button>
      </div>

      {listError && (
        <p className="rounded-2xl border border-brand-blue/30 bg-surface/60 p-4 text-sm text-mist/90">
          ⚠️ {listError}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-muted">Aucune entrée dans la banque.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/60 p-4"
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                {e.mediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.mediaUrl}
                    alt={`Entrée « ${e.label} »`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-[0.7rem] uppercase tracking-widest text-muted">
                    média purgé
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-widest ${STATUS_BADGE[e.status].cls}`}
                >
                  {STATUS_BADGE[e.status].label}
                </span>
                {e.expired && (
                  <span className="rounded-full border border-amber-500/50 px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-widest text-amber-300/90">
                    Expirée
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-mist">{e.label}</span>
                <span className="font-mono text-xs text-muted">
                  {new Date(e.createdAt).toLocaleString("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                {e.status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => act(e, "approve")}
                      disabled={busyId === e.id}
                      className={PRIMARY}
                    >
                      Approuver
                    </button>
                    <button
                      type="button"
                      onClick={() => act(e, "reject")}
                      disabled={busyId === e.id}
                      className={GHOST}
                    >
                      Rejeter
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => act(e, "delete")}
                  disabled={busyId === e.id}
                  className={DANGER}
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

/* ── Formulaire mot de passe ───────────────────────────────────────── */
function Login({
  onSubmit,
  error,
}: {
  onSubmit: (password: string) => Promise<void>;
  error: string | null;
}) {
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-16 text-center">
      <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-teal/80">
        Écran facilitateur
      </span>
      <h2 className="text-3xl font-bold tracking-tight text-mist">
        Modération de la banque
      </h2>
      <form
        className="flex w-full max-w-sm flex-col gap-4"
        onSubmit={async (ev) => {
          ev.preventDefault();
          setSending(true);
          await onSubmit(password);
          setSending(false);
        }}
      >
        <input
          type="password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          placeholder="Mot de passe facilitateur"
          autoFocus
          className="rounded-full border border-line bg-surface/60 px-6 py-3 text-center text-mist outline-none transition-colors focus:border-brand-teal/60"
        />
        {error && <p className="text-sm text-mist/90">⚠️ {error}</p>}
        <button
          type="submit"
          disabled={sending || password.length === 0}
          className={PRIMARY}
        >
          {sending ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
