import React, { useEffect, useMemo, useState } from "react";
import {
  Leaf, ArrowRight, Upload, CheckCircle2, Clock, Instagram, Phone, User,
  Search, ShieldCheck, Sparkles, RotateCcw, ChevronLeft, Store, LayoutDashboard,
  AlertTriangle, Image as ImageIcon, Film, Star, X, LogOut, Plus, Pencil,
  Trash2, Mail, Lock, Package, ClipboardList
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────
   Botanical Luxuriate · Creator Seeding Platform  v2  (Business Lab product)
   Now with sign-in: separate Admin and Creator accounts and interfaces.
   Admins manage listings (add / edit price, description, payouts / remove).
   Persists via window.storage. DEMO AUTH ONLY — credentials live in browser
   storage in plain text. In production, swap to a real auth provider
   (Supabase Auth / Clerk / NextAuth) and a server DB (Airtable + API routes).
   ──────────────────────────────────────────────────────────────────────── */

/* --------------------------------- SEED ----------------------------------- */
const seedBrands = [
  { slug: "bl", name: "Botanical Luxuriate", tag: "Ayurvedic Hair Care", display: "'Space Grotesk', sans-serif", accent: "#15803d", accent2: "#22c55e", bg: "#f0fdf4", card: "#ffffff", ink: "#14532d", sub: "#4b7c5d", line: "#dcfce7" },
  { slug: "gangaa", name: "Gangaa Naturals", tag: "Neem & Tulsi Care", display: "'Space Grotesk', sans-serif", accent: "#166534", accent2: "#4ade80", bg: "#f0fdf4", card: "#ffffff", ink: "#14532d", sub: "#4b7c5d", line: "#dcfce7" },
];

const seedProducts = [
  { id: "bl-tt", brand: "bl", name: "Tea Tree Anti-Dandruff Shampoo", price: 599, reviewPay: 150, reelPay: 500, amazon: "https://www.amazon.in/s?k=tea+tree+anti+dandruff+shampoo", note: "Flagship", description: "Sulphate-free tea tree shampoo that calms an itchy, flaky scalp and controls dandruff from the first wash. Chemical-free and gentle enough for daily use." },
  { id: "bl-cl", brand: "bl", name: "Curry Leaf Hair Oil", price: 499, reviewPay: 150, reelPay: 450, amazon: "https://www.amazon.in/s?k=curry+leaf+hair+oil", note: "Heritage", description: "Cold-infused curry leaf oil that strengthens roots, slows premature greying and adds natural shine. A South Indian heritage recipe." },
  { id: "bl-bh", brand: "bl", name: "Bhringraj Hair Oil", price: 549, reviewPay: 150, reelPay: 450, amazon: "https://www.amazon.in/s?k=bhringraj+hair+oil", note: "", description: "Bhringraj oil that nourishes the scalp, supports thicker-looking hair and tames frizz. Lightweight and non-sticky." },
  { id: "gn-al", brand: "gangaa", name: "Neem & Tulsi Anti-Lice Shampoo", price: 449, reviewPay: 100, reelPay: 400, amazon: "https://www.amazon.in/s?k=neem+tulsi+anti+lice+shampoo", note: "", description: "Neem and tulsi anti-lice shampoo that clears lice and nits gently, without harsh chemicals. Safe for the whole family." },
  { id: "gn-oil", brand: "gangaa", name: "Neem & Tulsi Hair Oil", price: 399, reviewPay: 100, reelPay: 400, amazon: "https://www.amazon.in/s?k=neem+tulsi+hair+oil", note: "", description: "Neem and tulsi hair oil that soothes the scalp, fights flakes and keeps hair healthy with daily care." },
];

const seedUsers = [
  { id: "admin1", role: "admin", email: "admin@businesslab.in", password: "admin123", name: "Thala", createdAt: Date.now() },
  { id: "cr1", role: "creator", email: "creator@test.in", password: "creator123", name: "Priya Kumar", phone: "9876543210", ig: "priya.styles", createdAt: Date.now() },
];

/* status pipeline ---------------------------------------------------------- */
const STATUS = {
  "Applied":        { stage: 0, label: "Applied",        kind: "go"   },
  "Order Submitted":{ stage: 1, label: "Order uploaded", kind: "wait" },
  "Order Verified": { stage: 2, label: "Order verified", kind: "wait" },
  "Refunded":       { stage: 2, label: "Refunded",       kind: "go"   },
  "Review Live":    { stage: 3, label: "Review live",    kind: "go"   },
  "Reel Submitted": { stage: 4, label: "Reel submitted", kind: "wait" },
  "Reel Live":      { stage: 5, label: "Reel live",      kind: "wait" },
  "Paid":           { stage: 5, label: "Paid",           kind: "done" },
};
const ALL_STATUSES = Object.keys(STATUS);
const RAIL = ["Applied", "Ordered", "Refunded", "Review", "Reel", "Paid"];

/* ------------------------------- STORAGE ---------------------------------- */
const K = {
  brands: "bl_seed_brands_v2", products: "bl_seed_products_v2",
  subs: "bl_seed_subs_v2", users: "bl_seed_users_v2", session: "bl_seed_session_v2",
};
async function loadKey(key, fb) { try { const r = await window.storage.get(key); return r && r.value ? JSON.parse(r.value) : fb; } catch { return fb; } }
async function saveKey(key, val) { try { await window.storage.set(key, JSON.stringify(val)); } catch (e) { console.error(e); } }
async function deleteKey(key) { try { await window.storage.delete(key); } catch { /* noop */ } }
async function saveShot(id, d) { try { await window.storage.set("bl_shot_" + id, d); } catch (e) { console.error(e); } }
async function getShot(id) { try { const r = await window.storage.get("bl_shot_" + id); return r ? r.value : null; } catch { return null; } }

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const max = 1100; let { width, height } = img;
        if (width > max || height > max) { const s = Math.min(max / width, max / height); width = Math.round(width * s); height = Math.round(height * s); }
        const c = document.createElement("canvas"); c.width = width; c.height = height;
        c.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL("image/jpeg", 0.72));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* -------------------------------- HELPERS --------------------------------- */
const uid = () => Math.random().toString(36).slice(2, 9);
const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const cleanIg = (s) => (s || "").replace(/^@+/, "").trim();
const validPhone = (s) => /^(\+?91[- ]?)?[6-9]\d{9}$/.test((s || "").replace(/[- ]/g, ""));
const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");

/* ─────────────────────── DESIGN TOKENS / STYLE INJECTOR ─────────────────── */
function StyleInjector() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

      :root {
        --chrome:          #0C1714;
        --chrome-2:        #162019;
        --chrome-border:   rgba(255,255,255,0.07);
        --chrome-muted:    rgba(255,255,255,0.45);
        --page:            #F4F7F5;
        --surface:         #FFFFFF;
        --surface-2:       #F0F4F2;
        --border:          #E0E8E4;
        --border-strong:   #C8D8D0;
        --text-1:          #0D1F16;
        --text-2:          #3D5449;
        --text-3:          #7A9989;
        --ring:            #15803d;
        --destructive:     #dc2626;
        --amber:           #d97706;
        --amber-bg:        #fffbeb;
        --amber-text:      #92400e;
        --radius-sm:       8px;
        --radius-md:       12px;
        --radius-lg:       16px;
        --radius-xl:       20px;
        --shadow-xs:       0 1px 2px rgba(0,0,0,0.05);
        --shadow-sm:       0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04);
        --shadow-md:       0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
        --shadow-lg:       0 20px 48px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06);
        --transition:      150ms ease-out;
      }

      *, *::before, *::after { box-sizing: border-box; }

      .bl-root { font-family: 'DM Sans', system-ui, sans-serif; color: var(--text-1); background: var(--page); }
      .bl-root * { transition-property: color, background-color, border-color, opacity, box-shadow, transform; transition-duration: var(--transition); transition-timing-function: ease-out; }

      /* Buttons */
      .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: var(--radius-md); font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 14px; line-height: 1; cursor: pointer; border: none; outline: none; text-decoration: none; white-space: nowrap; }
      .btn:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
      .btn:active { transform: scale(0.98); }
      .btn-primary { background: var(--brand, #15803d); color: #fff; padding: 10px 18px; }
      .btn-primary:hover { filter: brightness(1.08); }
      .btn-primary:disabled { background: #cbd5e1 !important; cursor: not-allowed; transform: none; }
      .btn-secondary { background: var(--surface); color: var(--text-1); border: 1px solid var(--border); padding: 10px 18px; }
      .btn-secondary:hover { background: var(--surface-2); border-color: var(--border-strong); }
      .btn-ghost { background: transparent; color: var(--text-2); padding: 8px 12px; }
      .btn-ghost:hover { background: var(--surface-2); color: var(--text-1); }
      .btn-full { width: 100%; }
      .btn-lg { padding: 13px 20px; font-size: 15px; border-radius: var(--radius-lg); }
      .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: var(--radius-sm); }
      .btn-danger { background: var(--destructive); color: #fff; padding: 10px 18px; }
      .btn-danger:hover { filter: brightness(1.1); }

      /* Inputs */
      .field-wrap { display: flex; align-items: center; gap: 6px; background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius-md); padding: 0 12px; }
      .field-wrap:focus-within { border-color: var(--ring); box-shadow: 0 0 0 3px rgba(21,128,61,0.12); }
      .field-wrap.error { border-color: var(--destructive); }
      .field-wrap.error:focus-within { box-shadow: 0 0 0 3px rgba(220,38,38,0.12); }
      .field-input { width: 100%; background: transparent; border: none; outline: none; font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--text-1); padding: 11px 4px; }
      .field-input::placeholder { color: var(--text-3); }
      .field-icon { color: var(--text-3); flex-shrink: 0; }
      .field-prefix { font-size: 14px; color: var(--text-3); flex-shrink: 0; }

      .inp-solo { width: 100%; background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius-md); padding: 10px 13px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--text-1); outline: none; }
      .inp-solo:focus { border-color: var(--ring); box-shadow: 0 0 0 3px rgba(21,128,61,0.12); }
      .inp-solo::placeholder { color: var(--text-3); }

      /* Cards */
      .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); }
      .card-inner { padding: 20px; }

      /* Tabs */
      .tab-bar { display: flex; gap: 4px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 4px; width: fit-content; }
      .tab-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: var(--radius-md); padding: 8px 16px; font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--text-2); transition: all 150ms ease-out; }
      .tab-btn.active { background: var(--surface); color: var(--text-1); box-shadow: var(--shadow-xs); }
      .tab-btn:hover:not(.active) { background: rgba(255,255,255,0.6); color: var(--text-1); }

      /* Chrome tabs (dark bg) */
      .chrome-tab { display: inline-flex; align-items: center; gap: 5px; border-radius: 8px; padding: 6px 12px; font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--chrome-muted); transition: all 150ms ease-out; }
      .chrome-tab.active { background: rgba(255,255,255,0.12); color: #fff; }
      .chrome-tab:hover:not(.active) { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.75); }

      /* Badges */
      .badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; padding: 4px 10px; font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.01em; }
      .badge-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

      /* Status rail */
      .rail-wrap { display: flex; align-items: center; width: 100%; }
      .rail-node { display: flex; flex-direction: column; align-items: center; min-width: 0; }
      .rail-circle { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; border: 2px solid; font-family: 'Space Grotesk', sans-serif; font-size: 10px; font-weight: 700; flex-shrink: 0; }
      .rail-label { margin-top: 5px; font-size: 9px; font-weight: 600; letter-spacing: 0.02em; text-align: center; text-transform: uppercase; }
      .rail-line { flex: 1; height: 2px; border-radius: 1px; margin: 0 4px; margin-bottom: 14px; }

      /* Section label */
      .section-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }

      /* Queue card */
      .queue-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px; text-align: left; cursor: pointer; box-shadow: var(--shadow-xs); }
      .queue-card:hover { box-shadow: var(--shadow-sm); transform: translateY(-1px); }
      .queue-card-bar { height: 3px; border-radius: 2px; margin-bottom: 12px; }

      /* Drawer */
      .drawer-overlay { position: fixed; inset: 0; z-index: 50; display: flex; justify-content: flex-end; background: rgba(0,0,0,0.45); backdrop-filter: blur(2px); }
      .drawer-panel { height: 100%; width: 100%; max-width: 420px; overflow-y: auto; background: var(--surface); box-shadow: var(--shadow-lg); }
      .drawer-header { position: sticky; top: 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); background: var(--surface); padding: 16px 20px; z-index: 1; }

      /* Table */
      .data-table { overflow: hidden; border-radius: var(--radius-lg); border: 1px solid var(--border); background: var(--surface); }
      .data-table-head { display: grid; border-bottom: 1px solid var(--border); background: var(--surface-2); padding: 10px 16px; }
      .data-table-row { display: grid; border-bottom: 1px solid #f1f5f3; padding: 12px 16px; align-items: center; }
      .data-table-row:last-child { border-bottom: none; }
      .data-table-row:hover { background: #fafcfa; }

      /* Misc */
      .divider { height: 1px; background: var(--border); margin: 0; }
      .tag-chip { display: inline-flex; align-items: center; border-radius: 6px; padding: 3px 8px; font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 600; }
      .waiting-bar { display: flex; align-items: center; gap: 8px; border-radius: var(--radius-md); padding: 10px 14px; font-size: 13px; font-weight: 500; background: var(--amber-bg); color: var(--amber-text); }
      .success-bar { display: flex; align-items: center; gap: 8px; border-radius: var(--radius-md); padding: 10px 14px; font-size: 13px; font-weight: 600; }
      .payout-win { text-align: center; border-radius: var(--radius-lg); padding: 14px; font-size: 13px; font-weight: 600; }

      @media (prefers-reduced-motion: reduce) {
        .bl-root * { transition: none !important; animation: none !important; }
      }
    `}</style>
  );
}

/* ─────────────────────────── SHARED SMALL BITS ──────────────────────────── */

function ProductArt({ p, brand }) {
  const word = p.name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("");
  return (
    <div style={{ background: `linear-gradient(135deg, ${brand.accent} 0%, ${brand.accent2} 100%)` }}
      className="relative h-40 w-full overflow-hidden flex items-center justify-center">
      <Leaf size={110} color="#fff" style={{ opacity: 0.08, position: "absolute", right: -14, bottom: -14, transform: "rotate(-18deg)" }} />
      <Leaf size={56} color="#fff" style={{ opacity: 0.08, position: "absolute", left: -6, top: -6 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", color: "rgba(255,255,255,0.9)", fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>{word}</span>
        {p.note && <span style={{ fontFamily: "'Space Grotesk', sans-serif", color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>{p.note}</span>}
      </div>
    </div>
  );
}

function Badge({ status, brand }) {
  const k = STATUS[status]?.kind;
  const map = {
    go:   { bg: "#f0fdf4", fg: brand?.accent || "#15803d", dot: brand?.accent2 || "#22c55e" },
    wait: { bg: "#fffbeb", fg: "#92400e", dot: "#d97706" },
    done: { bg: "#f0fdf4", fg: "#14532d", dot: "#16a34a" },
  }[k] || { bg: "#f1f5f9", fg: "#475569", dot: "#94a3b8" };
  return (
    <span className="badge" style={{ background: map.bg, color: map.fg }}>
      <span className="badge-dot" style={{ background: map.dot }} />
      {STATUS[status]?.label || status}
    </span>
  );
}

function StatusRail({ status, brand }) {
  const cur = STATUS[status]?.stage ?? 0;
  return (
    <div className="rail-wrap">
      {RAIL.map((label, idx) => {
        const done = idx < cur, active = idx === cur;
        const col = (done || active) ? brand.accent : "var(--border-strong)";
        return (
          <React.Fragment key={label}>
            <div className="rail-node">
              <div className="rail-circle" style={{
                borderColor: col,
                color: done ? "#fff" : active ? brand.accent : "var(--text-3)",
                background: done ? brand.accent : active ? `${brand.accent}15` : "var(--surface)",
              }}>
                {done ? <CheckCircle2 size={13} /> : idx + 1}
              </div>
              <span className="rail-label" style={{ color: active ? brand.accent : "var(--text-3)", fontWeight: active ? 700 : 500 }}>{label}</span>
            </div>
            {idx < RAIL.length - 1 && (
              <div className="rail-line" style={{ background: idx < cur ? brand.accent : "var(--border)" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Row({ k, v, strong, big, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "var(--text-2)" }}>{k}</span>
      <span style={{ color: strong ? accent : "var(--text-1)", fontWeight: strong ? 700 : 500, fontSize: big ? 15 : 13 }}>{v}</span>
    </div>
  );
}

function Empty({ brand, title, body }) {
  return (
    <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${brand.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
        <Leaf size={20} style={{ color: brand.accent }} />
      </div>
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-1)", fontWeight: 700, fontSize: 16, marginTop: 12, marginBottom: 0 }}>{title}</h3>
      <p style={{ color: "var(--text-2)", fontSize: 13, marginTop: 6, marginBottom: 0 }}>{body}</p>
    </div>
  );
}

function Btn({ children, color, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className="btn btn-full"
      style={{ background: disabled ? "#cbd5e1" : color, color: "#fff", padding: "10px 16px", cursor: disabled ? "not-allowed" : "pointer" }}>
      {children}
    </button>
  );
}

/* ============================== ROOT APP ================================== */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState(seedBrands);
  const [products, setProducts] = useState(seedProducts);
  const [subs, setSubs] = useState([]);
  const [users, setUsers] = useState(seedUsers);
  const [session, setSession] = useState(null);
  const [brandSlug, setBrandSlug] = useState("bl");

  useEffect(() => {
    (async () => {
      const b = await loadKey(K.brands, null);
      const p = await loadKey(K.products, null);
      const u = await loadKey(K.users, null);
      const s = await loadKey(K.subs, []);
      const sess = await loadKey(K.session, null);
      if (!b) await saveKey(K.brands, seedBrands); else setBrands(b);
      if (!p) await saveKey(K.products, seedProducts); else setProducts(p);
      const userList = u || seedUsers;
      if (!u) await saveKey(K.users, seedUsers); else setUsers(u);
      setSubs(s || []);
      if (sess?.userId) { const me = userList.find(x => x.id === sess.userId); if (me) setSession({ role: me.role, userId: me.id, name: me.name, email: me.email }); }
      setLoading(false);
    })();
  }, []);

  const brand = brands.find(b => b.slug === brandSlug) || brands[0];
  const me = users.find(u => u.id === session?.userId);

  const persistSubs = async (next) => { setSubs(next); await saveKey(K.subs, next); };
  const addSub = async (sub) => persistSubs([sub, ...subs]);
  const updateSub = async (id, patch) => persistSubs(subs.map(s => s.id === id ? { ...s, ...patch } : s));
  const persistProducts = async (next) => { setProducts(next); await saveKey(K.products, next); };
  const persistUsers = async (next) => { setUsers(next); await saveKey(K.users, next); };
  const resetDemo = async () => { await saveKey(K.subs, []); setSubs([]); };

  const login = async (sess) => { setSession(sess); await saveKey(K.session, { userId: sess.userId }); };
  const logout = async () => { setSession(null); await deleteKey(K.session); setBrandSlug("bl"); };

  if (loading) return (
    <div className="bl-root" style={{ display: "flex", height: 480, alignItems: "center", justifyContent: "center" }}>
      <StyleInjector />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #15803d, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Leaf size={18} color="#fff" style={{ animation: "spin 2s linear infinite" }} />
        </div>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>Loading platform…</span>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!session) return (
    <div className="bl-root">
      <StyleInjector />
      <AuthGate users={users} persistUsers={persistUsers} onLogin={login} />
    </div>
  );

  return (
    <div className="bl-root" style={{ "--brand": brand.accent } as React.CSSProperties}>
      <StyleInjector />

      {/* ── Global Header ── */}
      <header style={{ background: "var(--chrome)", borderBottom: "1px solid var(--chrome-border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 20px", flexWrap: "wrap" }}>

          {/* Logo + role */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #15803d, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles size={15} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", letterSpacing: "-0.01em", lineHeight: 1.2 }}>Business Lab</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 600, color: "var(--chrome-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {session.role === "admin" ? "Admin Console" : "Creator Portal"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Brand switcher — desktop */}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3, gap: 2 }} className="hidden sm:flex">
              {brands.map(b => (
                <button key={b.slug} onClick={() => setBrandSlug(b.slug)} className="chrome-tab" style={brandSlug === b.slug ? { background: "rgba(255,255,255,0.12)", color: "#fff" } : {}}>
                  {b.name.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* User chip */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "6px 10px" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: session.role === "admin" ? "#7c3aed" : brand.accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {(session.name || "U")[0]}
              </div>
              <div className="hidden sm:block">
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>{session.name}</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "var(--chrome-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{session.role}</div>
              </div>
              <button onClick={logout} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "var(--chrome-muted)", marginLeft: 2, display: "flex" }} title="Sign out"
                onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "var(--chrome-muted)"}>
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Brand switcher — mobile */}
        <div className="sm:hidden" style={{ display: "flex", gap: 6, padding: "8px 16px 10px", borderTop: "1px solid var(--chrome-border)" }}>
          {brands.map(b => (
            <button key={b.slug} onClick={() => setBrandSlug(b.slug)} className="chrome-tab" style={brandSlug === b.slug ? { background: "rgba(255,255,255,0.12)", color: "#fff" } : {}}>
              {b.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </header>

      {session.role === "admin"
        ? <AdminApp brand={brand} brands={brands} products={products} subs={subs} updateSub={updateSub} resetDemo={resetDemo} brandSlug={brandSlug} persistProducts={persistProducts} />
        : <CreatorApp brand={brand} brands={brands} products={products.filter(p => p.brand === brandSlug)} subs={subs} addSub={addSub} updateSub={updateSub} profile={me} session={session} />}
    </div>
  );
}

/* ============================== AUTH GATE ================================= */
function AuthGate({ users, persistUsers, onLogin }) {
  const [tab, setTab] = useState("creator");
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [ig, setIg] = useState("");
  const [err, setErr] = useState("");

  const reset = () => { setEmail(""); setPassword(""); setName(""); setPhone(""); setIg(""); setErr(""); };

  const doLogin = (role) => {
    const u = users.find(x => x.email.toLowerCase() === email.toLowerCase().trim() && x.password === password && x.role === role);
    if (!u) { setErr("Email or password is incorrect for this account type."); return; }
    onLogin({ role: u.role, userId: u.id, name: u.name, email: u.email });
  };

  const doSignup = async () => {
    if (!name.trim()) return setErr("Enter your name");
    if (!validEmail(email)) return setErr("Enter a valid email");
    if (password.length < 6) return setErr("Use a password of at least 6 characters");
    if (!validPhone(phone)) return setErr("Enter a valid 10-digit mobile number");
    if (!cleanIg(ig)) return setErr("Enter your Instagram handle");
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase().trim())) return setErr("An account with this email already exists");
    const u = { id: uid(), role: "creator", email: email.trim(), password, name: name.trim(), phone: phone.replace(/[- ]/g, ""), ig: cleanIg(ig), createdAt: Date.now() };
    await persistUsers([...users, u]);
    onLogin({ role: "creator", userId: u.id, name: u.name, email: u.email });
  };

  const accentColor = tab === "admin" ? "#7c3aed" : "#15803d";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", minHeight: 620 }} className="md:grid-cols-2">

      {/* ── Dark hero panel ── */}
      <div className="hidden md:flex" style={{ position: "relative", flexDirection: "column", justifyContent: "space-between", background: "var(--chrome)", padding: "40px 44px", overflow: "hidden" }}>
        {/* Mesh gradient bg */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 15%, rgba(21,128,61,0.35) 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(34,197,94,0.2) 0%, transparent 50%)", pointerEvents: "none" }} />
        {/* Grid pattern */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #15803d, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={17} color="#fff" />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>Business Lab</span>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <div className="section-eyebrow" style={{ color: "#4ade80", marginBottom: 16 }}>
            <Leaf size={12} /> Creator Seeding Platform
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 38, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 14 }}>
            Creator Seeding,<br />done right.
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.65, maxWidth: 340, marginBottom: 28 }}>
            Get products into the hands of creators, refund them in full, and pay for the reels they make — all tracked in one place.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { icon: <ShieldCheck size={12} />, label: "Verified orders" },
              { icon: <Film size={12} />, label: "Paid reels" },
              { icon: <Package size={12} />, label: "Multi-brand" },
            ].map(({ icon, label }) => (
              <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)", fontFamily: "'Space Grotesk', sans-serif" }}>
                <span style={{ color: "#4ade80" }}>{icon}</span> {label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ position: "relative", fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
          Demo build · accounts stored locally in your browser
        </div>
      </div>

      {/* ── Auth card ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--page)", padding: "32px 24px" }}>
        <div style={{ width: "100%", maxWidth: 360 }}>

          {/* Mobile logo */}
          <div className="md:hidden" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--chrome)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={16} color="#4ade80" />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, color: "var(--text-1)" }}>Business Lab</span>
          </div>

          {/* Role toggle */}
          <div className="tab-bar" style={{ width: "100%", marginBottom: 20 }}>
            <button className={`tab-btn${tab === "creator" ? " active" : ""}`} style={{ flex: 1, justifyContent: "center" }} onClick={() => { setTab("creator"); reset(); }}>
              <Store size={13} /> Creator
            </button>
            <button className={`tab-btn${tab === "admin" ? " active" : ""}`} style={{ flex: 1, justifyContent: "center" }} onClick={() => { setTab("admin"); setSignup(false); reset(); }}>
              <LayoutDashboard size={13} /> Admin
            </button>
          </div>

          <div className="card" style={{ padding: "24px" }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: "var(--text-1)", marginBottom: 4 }}>
              {tab === "admin" ? "Admin sign in" : signup ? "Create creator account" : "Creator sign in"}
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55, marginBottom: 20 }}>
              {tab === "admin" ? "Manage listings, verify orders and release payouts." : signup ? "Join campaigns, get refunded, and get paid for reels." : "Welcome back — pick up where you left off."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tab === "creator" && signup && (
                <AuthField icon={<User size={15} className="field-icon" />} value={name} set={setName} placeholder="Full name" />
              )}
              <AuthField icon={<Mail size={15} className="field-icon" />} value={email} set={setEmail} placeholder="Email" type="email" />
              <AuthField icon={<Lock size={15} className="field-icon" />} value={password} set={setPassword} placeholder="Password" type="password" />
              {tab === "creator" && signup && (<>
                <AuthField icon={<Phone size={15} className="field-icon" />} value={phone} set={setPhone} placeholder="Mobile number" prefix="+91" />
                <AuthField icon={<Instagram size={15} className="field-icon" />} value={ig} set={setIg} placeholder="Instagram handle" prefix="@" />
              </>)}
            </div>

            {err && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 12, padding: "8px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
                <AlertTriangle size={13} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: "#dc2626", fontWeight: 500, margin: 0 }}>{err}</p>
              </div>
            )}

            <button
              onClick={() => { setErr(""); tab === "admin" ? doLogin("admin") : signup ? doSignup() : doLogin("creator"); }}
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 16, background: accentColor }}
            >
              {tab === "admin" ? "Sign in to console" : signup ? "Create account" : "Sign in"}
              <ArrowRight size={15} />
            </button>

            {tab === "creator" && (
              <button onClick={() => { setSignup(!signup); setErr(""); }}
                style={{ marginTop: 12, width: "100%", textAlign: "center", fontSize: 13, fontWeight: 500, color: "var(--text-2)", background: "transparent", border: "none", cursor: "pointer", padding: "6px 0" }}>
                {signup ? "Already have an account? Sign in" : "New here? Create a creator account"}
              </button>
            )}

            <div style={{ marginTop: 16, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border)", padding: "10px 12px", fontSize: 11, color: "var(--text-2)", lineHeight: 1.7 }}>
              <span style={{ fontWeight: 700, color: "var(--text-1)" }}>Demo logins</span><br />
              Admin — admin@businesslab.in / admin123<br />
              Creator — creator@test.in / creator123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthField({ icon, value, set, placeholder, type = "text", prefix }) {
  return (
    <div className="field-wrap">
      {icon}
      {prefix && <span className="field-prefix">{prefix}</span>}
      <input type={type} value={value} onChange={e => set(e.target.value)} placeholder={placeholder} className="field-input" />
    </div>
  );
}

/* ============================ CREATOR APP ================================= */
function CreatorApp({ brand, brands, products, subs, addSub, updateSub, profile, session }) {
  const [tab, setTab] = useState("campaigns");
  const [screen, setScreen] = useState("catalog");
  const [active, setActive] = useState(null);
  const [lastSub, setLastSub] = useState(null);
  const mineCount = subs.filter(s => s.creatorId === session.userId).length;

  const goApply = (p) => { setActive(p); setScreen("apply"); };
  const backToList = () => { setScreen("catalog"); };

  return (
    <div style={{ background: "var(--page)", color: "var(--text-1)", minHeight: 560 }}>

      {/* Creator hero section */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "28px 24px 0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div className="section-eyebrow" style={{ color: brand.accent, marginBottom: 8 }}>
            <Leaf size={11} /> {brand.tag}
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 28, color: "var(--text-1)", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 6 }}>
            {brand.name} <span style={{ color: brand.accent }}>Creator Program</span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6, maxWidth: 520, marginBottom: 20 }}>
            Get the product free, keep it, and earn for the reel you create.
          </p>

          {/* Sub-nav */}
          <div className="tab-bar">
            {[["campaigns", "Campaigns", Store], ["applications", "My Applications", ClipboardList]].map(([key, label, Icon]) => (
              <button key={key} className={`tab-btn${tab === key ? " active" : ""}`}
                onClick={() => { setTab(key); setScreen("catalog"); }}
                style={tab === key ? { color: brand.accent } : {}}>
                <Icon size={13} />
                {label}
                {key === "applications" && mineCount > 0 && (
                  <span style={{ background: tab === key ? `${brand.accent}20` : "var(--border)", color: tab === key ? brand.accent : "var(--text-2)", borderRadius: 999, padding: "1px 7px", fontSize: 10, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{mineCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        {tab === "applications"
          ? <MyApplications subs={subs} session={session} brands={brands} updateSub={updateSub} />
          : (<>
            {screen === "catalog" && <Catalog brand={brand} products={products} onPick={goApply} />}
            {screen === "apply" && active && <ApplyForm brand={brand} product={active} profile={profile} session={session} onBack={backToList} onDone={async (sub) => { await addSub(sub); setLastSub(sub); setScreen("submitted"); window.open(active.amazon, "_blank"); }} />}
            {screen === "submitted" && lastSub && <SubmittedStep brand={brand} product={active} sub={lastSub} updateSub={updateSub} onGoTrack={() => setTab("applications")} />}
          </>)}
      </div>
    </div>
  );
}

function Catalog({ brand, products, onPick }) {
  if (!products.length) return <Empty brand={brand} title="No active campaigns" body="This brand has no products open for seeding right now. Check back soon." />;
  return (
    <>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: "var(--text-1)", letterSpacing: "-0.01em", marginBottom: 16 }}>Open campaigns</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {products.map(p => {
          const payout = p.reviewPay + p.reelPay;
          return (
            <div key={p.id} className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <ProductArt p={p} brand={brand} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 0 }}>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text-1)", lineHeight: 1.3, marginBottom: 6 }}>{p.name}</h3>
                {p.description && <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>}

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "line-through" }}>{inr(p.price)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: brand.accent, fontFamily: "'Space Grotesk', sans-serif" }}>Free after refund</span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  <span className="tag-chip" style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>Refund {inr(p.price)}</span>
                  <span className="tag-chip" style={{ background: `${brand.accent}15`, color: brand.accent, border: `1px solid ${brand.accent}30` }}>+{inr(payout)} payout</span>
                </div>

                <button onClick={() => onPick(p)} className="btn btn-primary btn-full" style={{ marginTop: "auto", background: brand.accent }}>
                  Join campaign <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ApplyForm({ brand, product, profile, session, onBack, onDone }) {
  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [ig, setIg] = useState(profile?.ig || "");
  const [err, setErr] = useState({});

  const submit = () => {
    const e = {};
    if (!name.trim()) e.name = "Enter your name";
    if (!validPhone(phone)) e.phone = "Enter a valid 10-digit mobile number";
    if (!cleanIg(ig)) e.ig = "Enter your Instagram handle";
    setErr(e); if (Object.keys(e).length) return;
    onDone({
      id: uid(), creatorId: session.userId, email: session.email, brand: product.brand, productId: product.id, productName: product.name,
      price: product.price, reviewPay: product.reviewPay, reelPay: product.reelPay,
      name: name.trim(), phone: phone.replace(/[- ]/g, ""), ig: cleanIg(ig),
      status: "Applied", orderId: "", hasShot: false, reviewLink: "", reelLink: "",
      refundRef: "", payoutRef: "", notes: "", createdAt: Date.now(),
    });
  };

  const fieldRow = (label, icon, value, setter, key, placeholder, prefix?) => (
    <div key={key}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-2)", marginBottom: 6 }}>{label}</label>
      <div className={`field-wrap${err[key] ? " error" : ""}`}>
        {icon} {prefix && <span className="field-prefix">{prefix}</span>}
        <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder} className="field-input" />
      </div>
      {err[key] && <p style={{ fontSize: 11, color: "var(--destructive)", marginTop: 4, fontWeight: 500 }}>{err[key]}</p>}
    </div>
  );

  return (
    <div>
      <button onClick={onBack} className="btn btn-ghost" style={{ marginBottom: 16, paddingLeft: 4 }}>
        <ChevronLeft size={15} /> Back to campaigns
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }} className="md:grid-cols-5">
        {/* Product summary */}
        <div className="card" style={{ overflow: "hidden" }} className="md:col-span-2">
          <ProductArt p={product} brand={brand} />
          <div style={{ padding: "16px" }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text-1)", marginBottom: 6 }}>{product.name}</h3>
            {product.description && <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 14 }}>{product.description}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <Row k="Product cost" v={inr(product.price)} />
              <Row k="Refunded to you" v={inr(product.price)} strong accent={brand.accent} />
              <Row k="Reel payout" v={inr(product.reelPay)} />
              <Row k="Review thank-you" v={inr(product.reviewPay)} />
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
                <Row k="You take home" v={inr(product.price + product.reviewPay + product.reelPay)} strong big accent={brand.accent} />
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-3">
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 22, color: "var(--text-1)", letterSpacing: "-0.01em", marginBottom: 6 }}>Confirm your details</h2>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55, marginBottom: 20 }}>We've pre-filled these from your account. Next, you'll be taken to the Amazon listing.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {fieldRow("Full name", <User size={15} className="field-icon" />, name, setName, "name", "Priya Kumar")}
            {fieldRow("Mobile number", <Phone size={15} className="field-icon" />, phone, setPhone, "phone", "98765 43210", "+91")}
            {fieldRow("Instagram handle", <Instagram size={15} className="field-icon" />, ig, setIg, "ig", "yourhandle", "@")}
          </div>

          <button onClick={submit} className="btn btn-primary btn-full btn-lg" style={{ marginTop: 20, background: brand.accent }}>
            Continue to Amazon <ArrowRight size={15} />
          </button>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 14, fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>
            <ShieldCheck size={14} style={{ color: brand.accent, flexShrink: 0, marginTop: 1 }} />
            Buy at full price, screenshot the order, and we refund you in full after a quick check.
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmittedStep({ brand, product, sub, updateSub, onGoTrack }) {
  const [orderId, setOrderId] = useState("");
  const [shot, setShot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const onFile = async (e) => { const f = e.target.files?.[0]; if (f) setShot(await compressImage(f)); };
  const submitProof = async () => {
    if (!orderId.trim() || !shot) return; setBusy(true);
    await saveShot(sub.id, shot);
    await updateSub(sub.id, { orderId: orderId.trim(), hasShot: true, status: "Order Submitted" });
    setBusy(false); setDone(true);
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      {/* Confirmation card */}
      <div className="card" style={{ padding: 24, textAlign: "center", marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: brand.accent, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <CheckCircle2 size={22} color="#fff" />
        </div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 22, color: "var(--text-1)", marginBottom: 6 }}>You're in, {sub.name.split(" ")[0]}!</h2>
        <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 12 }}>The Amazon listing opened in a new tab. Once you've placed your order, upload proof below.</p>
        <a href={product.amazon} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: brand.accent, textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"} onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
          Open the Amazon listing again <ArrowRight size={13} />
        </a>
      </div>

      {!done ? (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text-1)", marginBottom: 16 }}>Upload your order proof</h3>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-2)", marginBottom: 6 }}>Amazon Order ID</label>
            <input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="408-1234567-1234567" className="inp-solo" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-2)", marginBottom: 6 }}>Order screenshot</label>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: "2px dashed var(--border)", borderRadius: 12, padding: "24px 16px", cursor: "pointer", textAlign: "center" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = brand.accent} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
              {shot ? <img src={shot} alt="order proof" style={{ maxHeight: 160, borderRadius: 8 }} /> : (
                <>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${brand.accent}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Upload size={16} style={{ color: brand.accent }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>Tap to upload your order confirmation</span>
                </>
              )}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
            </label>
          </div>

          <button disabled={!orderId.trim() || !shot || busy} onClick={submitProof} className="btn btn-primary btn-full"
            style={{ background: (!orderId.trim() || !shot) ? "#cbd5e1" : brand.accent, cursor: (!orderId.trim() || !shot || busy) ? "not-allowed" : "pointer" }}>
            {busy ? "Submitting…" : "Submit for verification"}
          </button>
          <button onClick={onGoTrack} style={{ display: "block", width: "100%", marginTop: 10, textAlign: "center", fontSize: 12, fontWeight: 500, color: "var(--text-3)", background: "transparent", border: "none", cursor: "pointer", padding: "6px 0" }}>
            I'll upload later — go to my applications
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
            <Clock size={18} style={{ color: "#d97706" }} />
          </div>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text-1)", marginBottom: 6 }}>Proof received — we're verifying your order.</p>
          <p style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 14 }}>Track progress anytime under My Applications.</p>
          <button onClick={onGoTrack} className="btn btn-primary" style={{ background: brand.accent }}>Go to my applications</button>
        </div>
      )}
    </div>
  );
}

function MyApplications({ subs, session, brands, updateSub }) {
  const mine = useMemo(() => subs.filter(s => s.creatorId === session.userId), [subs, session.userId]);
  const fallback = brands[0];
  if (!mine.length) return <Empty brand={fallback} title="No applications yet" body="Head to Campaigns and join one to get started — you'll track every step here." />;
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: "var(--text-1)", letterSpacing: "-0.01em", marginBottom: 16 }}>My Applications</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {mine.map(s => <TrackCard key={s.id} sub={s} brand={brands.find(b => b.slug === s.brand) || fallback} brandName={(brands.find(b => b.slug === s.brand) || fallback).name} updateSub={updateSub} />)}
      </div>
    </div>
  );
}

function TrackCard({ sub, brand, brandName, updateSub }) {
  const [review, setReview] = useState(sub.reviewLink || "");
  const [reel, setReel] = useState(sub.reelLink || "");
  const [orderId, setOrderId] = useState(sub.orderId || "");
  const [shot, setShot] = useState(null);
  const onFile = async (e) => { const f = e.target.files?.[0]; if (f) setShot(await compressImage(f)); };

  const action = () => {
    switch (sub.status) {
      case "Applied": return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>Placed your order? Add proof to start your refund.</p>
          <input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Amazon Order ID" className="inp-solo" style={{ fontSize: 13 }} />
          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "2px dashed var(--border)", borderRadius: 10, padding: "10px 12px", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>
            {shot ? <img src={shot} alt="" style={{ maxHeight: 96, borderRadius: 6 }} /> : <><ImageIcon size={14} style={{ color: brand.accent }} /> Upload order screenshot</>}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
          </label>
          <button disabled={!orderId.trim() || !shot}
            onClick={async () => { await saveShot(sub.id, shot); await updateSub(sub.id, { orderId: orderId.trim(), hasShot: true, status: "Order Submitted" }); }}
            className="btn btn-full" style={{ background: (!orderId.trim() || !shot) ? "#cbd5e1" : brand.accent, color: "#fff", cursor: (!orderId.trim() || !shot) ? "not-allowed" : "pointer", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
            Submit proof
          </button>
        </div>
      );
      case "Order Submitted": return <Waiting text="We're checking your order. Refund follows once verified." />;
      case "Order Verified": return <Waiting text="Order verified! Your refund is being processed." />;
      case "Refunded": return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: brand.accent }}>Refund sent{sub.refundRef ? ` · ref ${sub.refundRef}` : ""}. Now add your honest review link.</p>
          <input value={review} onChange={e => setReview(e.target.value)} placeholder="Paste your Amazon review link" className="inp-solo" style={{ fontSize: 13 }} />
          <button disabled={!review.trim()} onClick={() => updateSub(sub.id, { reviewLink: review.trim(), status: "Review Live" })}
            className="btn btn-full" style={{ background: !review.trim() ? "#cbd5e1" : brand.accent, color: "#fff", cursor: !review.trim() ? "not-allowed" : "pointer", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
            Submit review link
          </button>
        </div>
      );
      case "Review Live": return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: brand.accent }}>Thanks! Now create your reel and paste the link to get paid.</p>
          <input value={reel} onChange={e => setReel(e.target.value)} placeholder="Paste your Instagram reel link" className="inp-solo" style={{ fontSize: 13 }} />
          <button disabled={!reel.trim()} onClick={() => updateSub(sub.id, { reelLink: reel.trim(), status: "Reel Submitted" })}
            className="btn btn-full" style={{ background: !reel.trim() ? "#cbd5e1" : brand.accent, color: "#fff", cursor: !reel.trim() ? "not-allowed" : "pointer", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
            Submit reel link
          </button>
        </div>
      );
      case "Reel Submitted": return <Waiting text="Reel received — we're reviewing it before payout." />;
      case "Reel Live": return <Waiting text="Reel approved! Your payout is on the way." />;
      case "Paid": return (
        <div className="payout-win" style={{ background: "#f0fdf4", color: brand.accent, border: `1px solid ${brand.accent}30` }}>
          <CheckCircle2 size={15} style={{ display: "inline", marginRight: 6 }} />
          All done — you've been paid{sub.payoutRef ? ` · ref ${sub.payoutRef}` : ""}. Thank you!
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text-1)", marginBottom: 3 }}>{sub.productName}</h3>
          <p style={{ fontSize: 12, color: "var(--text-2)" }}>
            <span style={{ fontWeight: 600 }}>{brandName}</span> · applied {new Date(sub.createdAt).toLocaleDateString("en-IN")}
          </p>
        </div>
        <Badge status={sub.status} brand={brand} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <StatusRail status={sub.status} brand={brand} />
      </div>
      {action()}
    </div>
  );
}

function Waiting({ text }) {
  return (
    <div className="waiting-bar">
      <Clock size={14} style={{ flexShrink: 0 }} /> {text}
    </div>
  );
}

/* ============================== ADMIN APP ================================= */
function AdminApp({ brand, brands, products, subs, updateSub, resetDemo, brandSlug, persistProducts }) {
  const [tab, setTab] = useState("ops");
  return (
    <div style={{ background: "var(--page)", minHeight: 560 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 20, color: "var(--text-1)", letterSpacing: "-0.01em", marginBottom: 4 }}>
              Admin Console · <span style={{ color: brand.accent }}>{brand.name}</span>
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-2)" }}>Manage listings, verify orders, and release payouts.</p>
          </div>
          <button onClick={resetDemo} className="btn btn-secondary btn-sm">
            <RotateCcw size={12} /> Reset submissions
          </button>
        </div>

        <div className="tab-bar" style={{ marginBottom: 20 }}>
          {[["ops", "Operations", ClipboardList], ["listings", "Listings", Package]].map(([key, label, Icon]) => (
            <button key={key} className={`tab-btn${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {tab === "ops"
          ? <AdminOps brand={brand} subs={subs} updateSub={updateSub} brandSlug={brandSlug} />
          : <AdminListings brand={brand} brands={brands} products={products} brandSlug={brandSlug} persistProducts={persistProducts} />}
      </div>
    </div>
  );
}

function AdminOps({ brand, subs, updateSub, brandSlug }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const rows = subs.filter(s => s.brand === brandSlug).filter(s => statusFilter === "all" ? true : s.status === statusFilter);
  const counts = useMemo(() => {
    const c = { needsOrder: 0, needsRefund: 0, needsReel: 0, needsPay: 0 };
    subs.filter(s => s.brand === brandSlug).forEach(s => {
      if (s.status === "Order Submitted") c.needsOrder++;
      if (s.status === "Order Verified") c.needsRefund++;
      if (s.status === "Reel Submitted") c.needsReel++;
      if (s.status === "Reel Live") c.needsPay++;
    });
    return c;
  }, [subs, brandSlug]);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        <QueueCard label="Orders to verify"  n={counts.needsOrder}  color="#d97706" onClick={() => setStatusFilter("Order Submitted")} />
        <QueueCard label="Refunds to send"   n={counts.needsRefund} color="#2563eb" onClick={() => setStatusFilter("Order Verified")} />
        <QueueCard label="Reels to approve"  n={counts.needsReel}   color="#7c3aed" onClick={() => setStatusFilter("Reel Submitted")} />
        <QueueCard label="Payouts to release" n={counts.needsPay}   color="#16a34a" onClick={() => setStatusFilter("Reel Live")} />
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>Filter</span>
        {[["all", "All"], ...ALL_STATUSES.map(st => [st, STATUS[st].label])].map(([val, lbl]) => (
          <button key={val} onClick={() => setStatusFilter(val)}
            style={{ borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", border: "1px solid", cursor: "pointer",
              background: statusFilter === val ? "var(--text-1)" : "var(--surface)",
              color: statusFilter === val ? "#fff" : "var(--text-2)",
              borderColor: statusFilter === val ? "var(--text-1)" : "var(--border)" }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Data table */}
      <div className="data-table">
        <div className="data-table-head hidden sm:grid" style={{ gridTemplateColumns: "3fr 3fr 2fr 2fr 2fr", gap: 8 }}>
          {["Creator", "Product", "Order ID", "Status", ""].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)" }}>{h}</div>
          ))}
        </div>

        {rows.length === 0 && (
          <div style={{ padding: "40px 16px", textAlign: "center", fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>No submissions in this view.</div>
        )}

        {rows.map(s => (
          <div key={s.id} className="data-table-row" style={{ gridTemplateColumns: "1fr", gap: 8 }} className="grid grid-cols-1 sm:grid-cols-12 data-table-row">
            <div style={{ gridColumn: "span 3" }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--text-1)" }}>{s.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                <Instagram size={10} /> @{s.ig} · {s.phone}
              </div>
            </div>
            <div style={{ gridColumn: "span 3", fontSize: 13, color: "var(--text-2)" }}>{s.productName}</div>
            <div style={{ gridColumn: "span 2", fontSize: 12, color: "var(--text-3)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>{s.orderId || "—"}</div>
            <div style={{ gridColumn: "span 2" }}><Badge status={s.status} brand={brand} /></div>
            <div style={{ gridColumn: "span 2", textAlign: "right" }}>
              <button onClick={() => setOpen(s)} className="btn btn-sm" style={{ background: "var(--text-1)", color: "#fff" }}>Open</button>
            </div>
          </div>
        ))}
      </div>

      {open && <AdminDrawer sub={subs.find(x => x.id === open.id) || open} brand={brand} updateSub={updateSub} onClose={() => setOpen(null)} />}
    </>
  );
}

function QueueCard({ label, n, color, onClick }) {
  return (
    <button className="queue-card" onClick={onClick} style={{ textAlign: "left" }}>
      <div className="queue-card-bar" style={{ background: n ? color : "var(--border)" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: n ? color : "var(--border)", letterSpacing: "-0.02em", lineHeight: 1 }}>{n}</span>
        {n > 0 && <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", fontFamily: "'Space Grotesk', sans-serif" }}>{label}</div>
    </button>
  );
}

function AdminDrawer({ sub, brand, updateSub, onClose }) {
  const [shot, setShot] = useState(null);
  const [refundRef, setRefundRef] = useState(sub.refundRef || "");
  const [payoutRef, setPayoutRef] = useState(sub.payoutRef || "");
  const [notes, setNotes] = useState(sub.notes || "");
  useEffect(() => { if (sub.hasShot) getShot(sub.id).then(setShot); }, [sub.id, sub.hasShot]);
  const set = (patch) => updateSub(sub.id, patch);

  const quick = () => {
    switch (sub.status) {
      case "Order Submitted": return <Btn color="#16a34a" onClick={() => set({ status: "Order Verified" })}>Verify order</Btn>;
      case "Order Verified": return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={refundRef} onChange={e => setRefundRef(e.target.value)} placeholder="Refund UPI / txn ref" className="inp-solo" />
          <Btn color="#2563eb" disabled={!refundRef.trim()} onClick={() => set({ status: "Refunded", refundRef: refundRef.trim() })}>Mark refund sent</Btn>
        </div>
      );
      case "Refunded": return <p style={{ fontSize: 12, color: "var(--text-3)" }}>Waiting on creator to post their review.</p>;
      case "Review Live": return <p style={{ fontSize: 12, color: "var(--text-3)" }}>Waiting on creator to submit their reel.</p>;
      case "Reel Submitted": return <Btn color="#7c3aed" onClick={() => set({ status: "Reel Live" })}>Approve reel (it's live)</Btn>;
      case "Reel Live": return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={payoutRef} onChange={e => setPayoutRef(e.target.value)} placeholder="Payout UPI / txn ref" className="inp-solo" />
          <Btn color="#16a34a" disabled={!payoutRef.trim()} onClick={() => set({ status: "Paid", payoutRef: payoutRef.trim() })}>Mark paid</Btn>
        </div>
      );
      case "Paid": return <div style={{ background: "#f0fdf4", color: "#15803d", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>Completed.</div>;
      default: return <p style={{ fontSize: 12, color: "var(--text-3)" }}>Creator hasn't uploaded order proof yet.</p>;
    }
  };

  const sectionLabel = (t) => (
    <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)", marginBottom: 8 }}>{t}</div>
  );

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text-1)" }}>{sub.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>@{sub.ig} · {sub.phone}</div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 8 }}><X size={16} /></button>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>

          <div className="card" style={{ padding: 14 }}>
            <StatusRail status={sub.status} brand={brand} />
          </div>

          <div>
            {sectionLabel("Product")}
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text-1)", marginBottom: 8 }}>{sub.productName}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[["Refund", inr(sub.price)], ["Reel", inr(sub.reelPay)], ["Review", inr(sub.reviewPay)]].map(([k, v]) => (
                <span key={k} className="tag-chip" style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>{k} {v}</span>
              ))}
            </div>
          </div>

          <div>
            {sectionLabel("Order ID")}
            <div style={{ fontSize: 14, color: "var(--text-1)", fontFamily: "'Space Grotesk', sans-serif" }}>{sub.orderId || "Not submitted"}</div>
          </div>

          <div>
            {sectionLabel("Order screenshot")}
            {sub.hasShot
              ? (shot ? <img src={shot} alt="order proof" style={{ borderRadius: 10, border: "1px solid var(--border)", width: "100%" }} /> : <div style={{ fontSize: 13, color: "var(--text-3)" }}>Loading image…</div>)
              : <div style={{ fontSize: 13, color: "var(--text-3)" }}>Not uploaded</div>}
          </div>

          {(sub.reviewLink || sub.reelLink) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sectionLabel("Links")}
              {sub.reviewLink && <LinkRow icon={<Star size={12} />} label="Review" url={sub.reviewLink} />}
              {sub.reelLink && <LinkRow icon={<Film size={12} />} label="Reel" url={sub.reelLink} />}
            </div>
          )}

          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            {sectionLabel("Next action")}
            {quick()}
          </div>

          <div>
            {sectionLabel("Manual status override")}
            <select value={sub.status} onChange={e => set({ status: e.target.value })} className="inp-solo" style={{ cursor: "pointer" }}>
              {ALL_STATUSES.map(st => <option key={st} value={st}>{STATUS[st].label}</option>)}
            </select>
          </div>

          <div>
            {sectionLabel("Internal notes")}
            <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => set({ notes })} rows={2} placeholder="Flag fraud, follow-ups, etc." className="inp-solo" style={{ resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "var(--amber-bg)", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px" }}>
            <AlertTriangle size={13} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: "var(--amber-text)", margin: 0, lineHeight: 1.55 }}>
              Refund via UPI, not an Amazon refund — an Amazon refund cancels the order and kills the review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkRow({ icon, label, url }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 10, border: "1px solid var(--border)", padding: "9px 12px", background: "var(--surface)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--text-2)", fontFamily: "'Space Grotesk', sans-serif" }}>{icon} {label}</span>
      <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 500, color: "#2563eb", textDecoration: "none", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"} onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
        {url}
      </a>
    </div>
  );
}

/* ----------------------------- ADMIN LISTINGS ----------------------------- */
function AdminListings({ brand, brands, products, brandSlug, persistProducts }) {
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const list = products.filter(p => p.brand === brandSlug);

  const save = async (prod) => {
    if (products.some(p => p.id === prod.id)) await persistProducts(products.map(p => p.id === prod.id ? prod : p));
    else await persistProducts([prod, ...products]);
    setEditing(null);
  };
  const remove = async (id) => { await persistProducts(products.filter(p => p.id !== id)); setConfirmId(null); };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text-1)", marginBottom: 2 }}>Listings for {brand.name}</h3>
          <p style={{ fontSize: 13, color: "var(--text-2)" }}>{list.length} active {list.length === 1 ? "product" : "products"}. Switch brands in the top bar.</p>
        </div>
        <button onClick={() => setEditing({ new: true, brand: brandSlug })} className="btn btn-primary" style={{ background: brand.accent }}>
          <Plus size={14} /> Add listing
        </button>
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center", borderStyle: "dashed" }}>
          <Package size={28} style={{ color: "var(--border-strong)", margin: "0 auto 10px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", marginBottom: 10 }}>No listings for this brand yet.</p>
          <button onClick={() => setEditing({ new: true, brand: brandSlug })} style={{ fontSize: 13, fontWeight: 700, color: brand.accent, background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
            Add the first one
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {list.map(p => (
            <div key={p.id} className="card" style={{ display: "flex", gap: 12, padding: 14 }}>
              <div style={{ width: 68, height: 68, flexShrink: 0, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ background: `linear-gradient(135deg, ${brand.accent}, ${brand.accent2})`, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
                    {p.name.split(" ").slice(0, 2).map(w => w[0]).join("")}
                  </span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--text-1)", lineHeight: 1.3 }}>{p.name}</h4>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <button onClick={() => setEditing({ ...p })} className="btn btn-ghost btn-sm" style={{ padding: 6 }} title="Edit"><Pencil size={13} /></button>
                    <button onClick={() => setConfirmId(p.id)} className="btn btn-ghost btn-sm" style={{ padding: 6, color: "#dc2626" }} title="Remove"
                      onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description || "No description."}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {[[inr(p.price), "var(--surface-2)"], [`Reel ${inr(p.reelPay)}`, "var(--surface-2)"], [`Review ${inr(p.reviewPay)}`, "var(--surface-2)"]].map(([lbl, bg]) => (
                    <span key={lbl} className="tag-chip" style={{ background: bg, color: "var(--text-2)", border: "1px solid var(--border)", fontSize: 10 }}>{lbl}</span>
                  ))}
                </div>
                {confirmId === p.id && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "7px 10px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", flex: 1 }}>Remove this listing?</span>
                    <button onClick={() => remove(p.id)} className="btn btn-danger btn-sm">Remove</button>
                    <button onClick={() => setConfirmId(null)} className="btn btn-ghost btn-sm">Cancel</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <ListingForm brand={brand} brands={brands} initial={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </>
  );
}

function ListingForm({ brand, brands, initial, onCancel, onSave }) {
  const isNew = !!initial.new;
  const [f, setF] = useState({
    id: initial.id || ("p-" + uid()), brand: initial.brand || brand.slug, name: initial.name || "",
    description: initial.description || "", note: initial.note || "",
    price: initial.price ?? "", reviewPay: initial.reviewPay ?? "", reelPay: initial.reelPay ?? "",
    amazon: initial.amazon || "",
  });
  const [err, setErr] = useState("");
  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));
  const submit = () => {
    if (!f.name.trim()) return setErr("Enter a product name");
    if (!(Number(f.price) > 0)) return setErr("Enter a valid price");
    if (!f.amazon.trim()) return setErr("Enter the Amazon listing URL");
    onSave({ ...f, name: f.name.trim(), description: f.description.trim(), note: f.note.trim(), amazon: f.amazon.trim(), price: Number(f.price), reviewPay: Number(f.reviewPay) || 0, reelPay: Number(f.reelPay) || 0 });
  };

  const lbl = { display: "block", fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-2)", marginBottom: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)", padding: 16 }} onClick={onCancel}>
      <div style={{ width: "100%", maxWidth: 480, overflow: "hidden", borderRadius: 20, background: "var(--surface)", boxShadow: "var(--shadow-lg)" }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", padding: "16px 20px" }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text-1)", margin: 0 }}>{isNew ? "Add listing" : "Edit listing"}</h3>
          <button onClick={onCancel} className="btn btn-ghost btn-sm" style={{ padding: 7 }}><X size={16} /></button>
        </div>

        <div style={{ maxHeight: "65vh", overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>Brand</label>
            <select value={f.brand} onChange={e => upd("brand", e.target.value)} className="inp-solo" style={{ cursor: "pointer" }}>
              {brands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Product name</label>
            <input value={f.name} onChange={e => upd("name", e.target.value)} placeholder="Tea Tree Anti-Dandruff Shampoo" className="inp-solo" />
          </div>
          <div>
            <label style={lbl}>Description</label>
            <textarea value={f.description} onChange={e => upd("description", e.target.value)} rows={3} placeholder="What the product does, key benefits, who it's for…" className="inp-solo" style={{ resize: "vertical" }} />
          </div>
          <div>
            <label style={lbl}>Badge / tag (optional)</label>
            <input value={f.note} onChange={e => upd("note", e.target.value)} placeholder="Flagship, Heritage, New…" className="inp-solo" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div><label style={lbl}>Price (₹)</label><input type="number" value={f.price} onChange={e => upd("price", e.target.value)} placeholder="599" className="inp-solo" /></div>
            <div><label style={lbl}>Reel payout (₹)</label><input type="number" value={f.reelPay} onChange={e => upd("reelPay", e.target.value)} placeholder="500" className="inp-solo" /></div>
            <div><label style={lbl}>Review pay (₹)</label><input type="number" value={f.reviewPay} onChange={e => upd("reviewPay", e.target.value)} placeholder="150" className="inp-solo" /></div>
          </div>
          <div>
            <label style={lbl}>Amazon listing URL</label>
            <input value={f.amazon} onChange={e => upd("amazon", e.target.value)} placeholder="https://www.amazon.in/dp/…" className="inp-solo" />
          </div>
          {err && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
              <AlertTriangle size={13} style={{ color: "#dc2626" }} />
              <p style={{ fontSize: 12, color: "#dc2626", fontWeight: 500, margin: 0 }}>{err}</p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--border)", padding: "16px 20px" }}>
          <button onClick={onCancel} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button onClick={submit} className="btn btn-primary" style={{ flex: 1, background: brand.accent }}>{isNew ? "Add listing" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}
