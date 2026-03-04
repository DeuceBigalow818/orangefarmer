/**
 * OPNet SDK Bridge — OrangeFarmer v3.2
 *
 * KEY FIXES (v3.0 → v3.2):
 * ────────────────────────────────────────────────────
 * 1) MOTOSWAP_STAKING_ABI (not STAKING_ABI) for deployed MotoSwap staking:
 *    - stake(amount)          — bigint
 *    - unstake(amount)        — bigint
 *    - claimRewards()         — no args
 *    - stakedBalance(address) — read
 *    - pendingRewards(address)— read
 *
 * 2) sendTransaction MUST include all params on frontend:
 *    { signer: null, mldsaSigner: null, refundTo, maximumAllowedSatToSpend, network, feeRate }
 *
 * 3) Testnet/mainnet addresses are null until contracts are deployed on those networks.
 *    When mainnet launches, just fill in the addresses in NETWORK_MAP.mainnet.
 *
 * 4) Updated package versions to match current OPNet docs:
 *    opnet ^1.8.1-rc.15, @btc-vision/transaction ^1.8.0-rc.9, @btc-vision/bitcoin ^7.0.0-rc.6
 */

let opnetLib = null;
let txLib = null;
let btcLib = null;
let loaded = false;

// ── Lazy load to catch import errors at runtime ─────────────
async function ensureLoaded() {
  if (loaded) return;
  try {
    opnetLib = await import("opnet");
    txLib = await import("@btc-vision/transaction");
    btcLib = await import("@btc-vision/bitcoin");
    loaded = true;
  } catch (err) {
    console.error("[SDK] Import failed:", err);
    throw new Error("OPNet SDK import failed: " + err.message);
  }
}

// ── Network config ──────────────────────────────────────────
// HOW TO ADD MAINNET:
//   When contracts are deployed on mainnet, fill in each address below.
//   The network object must be `networks.bitcoin` (from @btc-vision/bitcoin).
const NETWORK_MAP = {
  regtest: {
    url: "https://regtest.opnet.org",
    networkKey: "regtest",
    router:     "0x80f8375d061d638a0b45a4eb4decbfd39e9abba913f464787194ce3c02d2ea5a",
    factory:    "0x893f92bb75fadf5333bd588af45217f33cdd1120a1b740165184c012ea1c883d",
    nativeSwap: "0xb056ba05448cf4a5468b3e1190b0928443981a93c3aff568467f101e94302422",
    staking:    "0x2e955b42e6ff0934ccb3d4f1ba4d0e219ba22831dfbcabe3ff5e185bdf942a5e",
    moto:       "0x0a6732489a31e6de07917a28ff7df311fc5f98f6e1664943ac1c3fe7893bdab5",
    pill:       "0xfb7df2f08d8042d4df0506c0d4cee3cfa5f2d7b02ef01ec76dd699551393a438",
    odys:       "0xc573930e4c67f47246589ce6fa2dbd1b91b58c8fdd7ace336ce79e65120f79eb",
  },
  testnet: {
    url: "https://testnet.opnet.org",
    networkKey: "opnetTestnet",
    // ⚠ Verified 2026-03-04: no DeFi contracts on testnet (btc_getCode → -32099)
    router: null, factory: null, nativeSwap: null,
    staking: null, moto: null, pill: null, odys: null,
  },
  mainnet: {
    url: "https://mainnet.opnet.org",
    networkKey: "bitcoin",
    // ──────────────────────────────────────────────────────────
    // TODO: FILL THESE IN WHEN MAINNET CONTRACTS ARE DEPLOYED
    // ──────────────────────────────────────────────────────────
    router:     null,  // MotoSwap Router
    factory:    null,  // MotoSwap Factory
    nativeSwap: null,  // NativeSwap DEX
    staking:    null,  // MOTO Staking
    moto:       null,  // MOTO token
    pill:       null,  // PILL token
    odys:       null,  // ODYS token
  },
};

// ── Internals ───────────────────────────────────────────────

function getNetworkObj(net) {
  const cfg = NETWORK_MAP[net] || NETWORK_MAP.regtest;
  // btcLib.networks.regtest / .opnetTestnet / .bitcoin
  return btcLib.networks[cfg.networkKey];
}

function resolveTokenAddress(net, symbol) {
  const cfg = NETWORK_MAP[net] || NETWORK_MAP.regtest;
  return { MOTO: cfg.moto, PILL: cfg.pill, ODYS: cfg.odys }[symbol] || null;
}

const providerCache = {};
function getProvider(net) {
  const cfg = NETWORK_MAP[net] || NETWORK_MAP.regtest;
  if (!providerCache[net]) {
    providerCache[net] = new opnetLib.JSONRpcProvider({
      url: cfg.url,
      network: getNetworkObj(net),
    });
  }
  return providerCache[net];
}

const contractCache = {};
function getCached(address, abi, provider, networkObj, sender) {
  const key = `${address}|${sender || "x"}`;
  if (!contractCache[key]) {
    contractCache[key] = opnetLib.getContract(
      txLib.Address.fromString(address),
      abi,
      provider,
      networkObj,
      sender ? txLib.Address.fromString(sender) : undefined,
    );
  }
  return contractCache[key];
}

/**
 * Send a simulated tx on-chain.
 * FRONTEND: signer=null, mldsaSigner=null. OP_WALLET handles signing.
 */
async function send(simulation, refundTo, networkObj, onStatus) {
  if (!simulation) throw new Error("Simulation returned null/undefined");
  if (simulation.error) throw new Error("Simulation error: " + simulation.error);
  if (simulation.revert) throw new Error("Simulation revert: " + simulation.revert);

  if (onStatus) onStatus("waiting-wallet");

  const receipt = await simulation.sendTransaction({
    signer:                     null,      // OP_WALLET signs
    mldsaSigner:                null,      // OP_WALLET signs
    refundTo:                   refundTo,
    maximumAllowedSatToSpend:   100_000n,  // 0.001 BTC fee cap
    network:                    networkObj,
    feeRate:                    0,         // auto
  });

  return receipt;
}

// ── Public: cache ───────────────────────────────────────────

export function clearContractCache() {
  for (const k of Object.keys(contractCache)) delete contractCache[k];
  for (const k of Object.keys(providerCache)) delete providerCache[k];
}

// ── Public: read ────────────────────────────────────────────

export async function getTokenBalance(net, tokenAddress, userAddress) {
  await ensureLoaded();
  try {
    const nw = getNetworkObj(net);
    const p = getProvider(net);
    const token = getCached(tokenAddress, opnetLib.OP_20_ABI, p, nw, userAddress);
    const r = await token.balanceOf(txLib.Address.fromString(userAddress));
    return r?.properties?.balance ?? r?.decoded?.[0] ?? 0n;
  } catch (e) { console.warn("[SDK] getTokenBalance:", e); return 0n; }
}

export async function getStakedBalance(net, userAddress) {
  await ensureLoaded();
  const cfg = NETWORK_MAP[net] || NETWORK_MAP.regtest;
  if (!cfg.staking) return 0n;
  try {
    const nw = getNetworkObj(net);
    const p = getProvider(net);
    const stk = getCached(cfg.staking, opnetLib.MOTOSWAP_STAKING_ABI, p, nw, userAddress);
    const r = await stk.stakedBalance(txLib.Address.fromString(userAddress));
    return r?.properties?.balance ?? r?.decoded?.[0] ?? 0n;
  } catch (e) { console.warn("[SDK] getStakedBalance:", e); return 0n; }
}

export async function getPendingRewards(net, userAddress) {
  await ensureLoaded();
  const cfg = NETWORK_MAP[net] || NETWORK_MAP.regtest;
  if (!cfg.staking) return 0n;
  try {
    const nw = getNetworkObj(net);
    const p = getProvider(net);
    const stk = getCached(cfg.staking, opnetLib.MOTOSWAP_STAKING_ABI, p, nw, userAddress);
    const r = await stk.pendingRewards(txLib.Address.fromString(userAddress));
    return r?.properties?.rewards ?? r?.decoded?.[0] ?? 0n;
  } catch (e) { console.warn("[SDK] getPendingRewards:", e); return 0n; }
}

// ── Public: write — staking (MOTOSWAP_STAKING_ABI) ─────────

export async function stakeMoto(net, amount, senderAddress, onStatus) {
  await ensureLoaded();
  const cfg = NETWORK_MAP[net] || NETWORK_MAP.regtest;
  if (!cfg.staking) throw new Error("Staking contract not deployed on " + net);
  if (!cfg.moto) throw new Error("MOTO token not deployed on " + net);

  const nw = getNetworkObj(net);
  const p = getProvider(net);

  // 1) approve
  if (onStatus) onStatus("approving");
  const token = getCached(cfg.moto, opnetLib.OP_20_ABI, p, nw, senderAddress);
  const approveSim = await token.increaseAllowance(txLib.Address.fromString(cfg.staking), amount);
  await send(approveSim, senderAddress, nw, null);

  // 2) stake
  if (onStatus) onStatus("simulating");
  const stk = getCached(cfg.staking, opnetLib.MOTOSWAP_STAKING_ABI, p, nw, senderAddress);
  const sim = await stk.stake(amount);
  return send(sim, senderAddress, nw, onStatus);
}

export async function unstakeMoto(net, amount, senderAddress, onStatus) {
  await ensureLoaded();
  const cfg = NETWORK_MAP[net] || NETWORK_MAP.regtest;
  if (!cfg.staking) throw new Error("Staking contract not deployed on " + net);

  const nw = getNetworkObj(net);
  const p = getProvider(net);
  const stk = getCached(cfg.staking, opnetLib.MOTOSWAP_STAKING_ABI, p, nw, senderAddress);
  if (onStatus) onStatus("simulating");
  // MOTOSWAP_STAKING_ABI: unstake(amount) — pass the exact bigint amount
  const sim = await stk.unstake(amount);
  return send(sim, senderAddress, nw, onStatus);
}

export async function claimRewards(net, senderAddress, onStatus) {
  await ensureLoaded();
  const cfg = NETWORK_MAP[net] || NETWORK_MAP.regtest;
  if (!cfg.staking) throw new Error("Staking contract not deployed on " + net);

  const nw = getNetworkObj(net);
  const p = getProvider(net);
  const stk = getCached(cfg.staking, opnetLib.MOTOSWAP_STAKING_ABI, p, nw, senderAddress);
  if (onStatus) onStatus("simulating");
  // MOTOSWAP_STAKING_ABI: claimRewards() — no arguments
  const sim = await stk.claimRewards();
  return send(sim, senderAddress, nw, onStatus);
}

// ── Public: write — MotoSwap Router ─────────────────────────

export async function addLiquidity(net, tA, tB, amtA, amtB, sender, slipPct, onStatus) {
  await ensureLoaded();
  const cfg = NETWORK_MAP[net] || NETWORK_MAP.regtest;
  if (!cfg.router) throw new Error("MotoSwap Router not deployed on " + net);
  const aA = resolveTokenAddress(net, tA), aB = resolveTokenAddress(net, tB);
  if (!aA || !aB) throw new Error("Token not found: " + tA + " or " + tB);

  const nw = getNetworkObj(net);
  const p = getProvider(net);

  // approve both
  if (onStatus) onStatus("approving-tokenA");
  const tokA = getCached(aA, opnetLib.OP_20_ABI, p, nw, sender);
  await send(await tokA.increaseAllowance(txLib.Address.fromString(cfg.router), amtA), sender, nw, null);
  if (onStatus) onStatus("approving-tokenB");
  const tokB = getCached(aB, opnetLib.OP_20_ABI, p, nw, sender);
  await send(await tokB.increaseAllowance(txLib.Address.fromString(cfg.router), amtB), sender, nw, null);

  const slip = BigInt(100 - slipPct);
  const dl = BigInt(Math.floor(Date.now() / 1000) + 3600);
  if (onStatus) onStatus("simulating");
  const router = getCached(cfg.router, opnetLib.MOTOSWAP_ROUTER_ABI, p, nw, sender);
  const sim = await router.addLiquidity(
    txLib.Address.fromString(aA), txLib.Address.fromString(aB),
    amtA, amtB, (amtA * slip) / 100n, (amtB * slip) / 100n,
    txLib.Address.fromString(sender), dl,
  );
  return send(sim, sender, nw, onStatus);
}

// ── Public: write — NativeSwap ──────────────────────────────

export async function nativeSwapReserve(net, tokenSym, btcAmt, sender, onStatus) {
  await ensureLoaded();
  const cfg = NETWORK_MAP[net] || NETWORK_MAP.regtest;
  if (!cfg.nativeSwap) throw new Error("NativeSwap not deployed on " + net);
  const tAddr = resolveTokenAddress(net, tokenSym);
  if (!tAddr) throw new Error("Token not found: " + tokenSym);

  const nw = getNetworkObj(net);
  const p = getProvider(net);
  const ns = getCached(cfg.nativeSwap, opnetLib.NativeSwapAbi, p, nw, sender);
  if (onStatus) onStatus("simulating");
  const sim = await ns.reserve(txLib.Address.fromString(tAddr), btcAmt);
  return send(sim, sender, nw, onStatus);
}

export async function nativeSwapExecute(net, tokenSym, sender, onStatus) {
  await ensureLoaded();
  const cfg = NETWORK_MAP[net] || NETWORK_MAP.regtest;
  if (!cfg.nativeSwap) throw new Error("NativeSwap not deployed on " + net);
  const tAddr = resolveTokenAddress(net, tokenSym);
  if (!tAddr) throw new Error("Token not found: " + tokenSym);

  const nw = getNetworkObj(net);
  const p = getProvider(net);
  const ns = getCached(cfg.nativeSwap, opnetLib.NativeSwapAbi, p, nw, sender);
  if (onStatus) onStatus("simulating");
  const sim = await ns.swap(txLib.Address.fromString(tAddr));
  return send(sim, sender, nw, onStatus);
}

// ── Public: utilities ───────────────────────────────────────

export function toBigInt(amount, decimals = 8) {
  const s = typeof amount === "number" ? amount.toFixed(decimals) : String(amount);
  const [w, f = ""] = s.split(".");
  return BigInt((w || "0") + f.padEnd(decimals, "0").slice(0, decimals));
}

export function fromBigInt(val, decimals = 8) {
  if (!val || val === 0n) return 0;
  const s = val.toString().padStart(decimals + 1, "0");
  return parseFloat(s.slice(0, s.length - decimals) + "." + s.slice(s.length - decimals));
}

export function getPoolDepositType(pool) {
  if (!pool) return "unsupported";
  if (pool.proto === "Staking") return "staking";
  if (pool.proto === "NativeSwap") return "nativeswap";
  if (pool.proto === "MotoSwap" || pool.proto === "MotoChef") return "router";
  return "unsupported";
}

export function getTokenAddress(net, sym) { return resolveTokenAddress(net, sym); }
export function getNetworkConfig(net) { return NETWORK_MAP[net] || NETWORK_MAP.regtest; }

export async function isSDKAvailable() {
  try {
    await ensureLoaded();
    return typeof opnetLib.getContract === "function";
  } catch { return false; }
}
