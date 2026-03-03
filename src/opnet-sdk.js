/**
 * OPNet SDK Bridge for OrangeFarmer v3.0
 *
 * Wraps opnet package for real on-chain transactions.
 * Frontend rule: signer: null, mldsaSigner: null — OP_WALLET handles signing.
 */

import {
  getContract,
  JSONRpcProvider,
  OP_20_ABI,
  MOTOSWAP_ROUTER_ABI,
  MOTOSWAP_STAKING_ABI,
  NativeSwapAbi,
} from "opnet";
import { Address } from "@btc-vision/transaction";
import { networks } from "@btc-vision/bitcoin";

// ── Network config ──────────────────────────────────────────
const NETWORK_MAP = {
  regtest: {
    url: "https://regtest.opnet.org",
    network: networks.regtest,
    router: "0x80f8375d061d638a0b45a4eb4decbfd39e9abba913f464787194ce3c02d2ea5a",
    factory: "0x893f92bb75fadf5333bd588af45217f33cdd1120a1b740165184c012ea1c883d",
    nativeSwap: "0xb056ba05448cf4a5468b3e1190b0928443981a93c3aff568467f101e94302422",
    staking: "0x2e955b42e6ff0934ccb3d4f1ba4d0e219ba22831dfbcabe3ff5e185bdf942a5e",
    moto: "0x0a6732489a31e6de07917a28ff7df311fc5f98f6e1664943ac1c3fe7893bdab5",
    pill: "0xfb7df2f08d8042d4df0506c0d4cee3cfa5f2d7b02ef01ec76dd699551393a438",
    odys: "0xc573930e4c67f47246589ce6fa2dbd1b91b58c8fdd7ace336ce79e65120f79eb",
  },
  testnet: {
    url: "https://testnet.opnet.org",
    network: networks.opnetTestnet,
    nativeSwap: "0x035884f9ac2b6ae75d7778553e7d447899e9a82e247d7ced48f22aa102681e70",
    staking: "0xaccca433aec3878ebc041cde2a1a2656f928cc404377ebd8339f0bf2cdd66cbe",
    moto: "0x75bd98b086b71010448ec5722b6020ce1e0f2c09f5d680c84059db1295948cf8",
    router: null, factory: null, pill: null, odys: null,
  },
  mainnet: {
    url: "https://mainnet.opnet.org",
    network: networks.bitcoin,
    nativeSwap: "0x035884f9ac2b6ae75d7778553e7d447899e9a82e247d7ced48f22aa102681e70",
    staking: "0xaccca433aec3878ebc041cde2a1a2656f928cc404377ebd8339f0bf2cdd66cbe",
    moto: "0x75bd98b086b71010448ec5722b6020ce1e0f2c09f5d680c84059db1295948cf8",
    router: null, factory: null, pill: null, odys: null,
  },
};

// ── Internals ───────────────────────────────────────────────

function resolveTokenAddress(net, symbol) {
  const cfg = NETWORK_MAP[net] || NETWORK_MAP.regtest;
  const map = { MOTO: cfg.moto, PILL: cfg.pill, ODYS: cfg.odys };
  return map[symbol] || null;
}

const providerCache = {};
function getProvider(net) {
  const cfg = NETWORK_MAP[net] || NETWORK_MAP.regtest;
  if (!providerCache[net]) {
    providerCache[net] = new JSONRpcProvider({ url: cfg.url, network: cfg.network });
  }
  return { provider: providerCache[net], config: cfg };
}

const contractCache = {};
function getCachedContract(address, abi, provider, network, sender) {
  const key = `${address}-${sender || "none"}`;
  if (!contractCache[key]) {
    contractCache[key] = getContract(
      Address.fromString(address), abi, provider, network,
      sender ? Address.fromString(sender) : undefined
    );
  }
  return contractCache[key];
}

async function executeTransaction(simulation, senderAddress, onStatus) {
  if ("error" in simulation) throw new Error("Simulation failed: " + simulation.error);
  if (simulation.revert) throw new Error("Simulation reverted: " + simulation.revert);
  if (onStatus) onStatus("waiting-wallet");
  const receipt = await simulation.sendTransaction({
    signer: null,
    mldsaSigner: null,
    refundTo: Address.fromString(senderAddress),
  });
  return receipt;
}

// ── Exports: cache management ───────────────────────────────

export function clearContractCache() {
  Object.keys(contractCache).forEach(k => delete contractCache[k]);
  Object.keys(providerCache).forEach(k => delete providerCache[k]);
}

// ── Exports: read operations ────────────────────────────────

export async function getTokenBalance(net, tokenAddress, userAddress) {
  try {
    const { provider, config } = getProvider(net);
    const token = getCachedContract(tokenAddress, OP_20_ABI, provider, config.network, userAddress);
    const result = await token.balanceOf(Address.fromString(userAddress));
    if ("error" in result) return 0n;
    return result.properties?.balance || result.decoded?.[0] || 0n;
  } catch { return 0n; }
}

export async function getStakedBalance(net, userAddress) {
  try {
    const { provider, config } = getProvider(net);
    if (!config.staking) return 0n;
    const staking = getCachedContract(config.staking, MOTOSWAP_STAKING_ABI, provider, config.network, userAddress);
    const result = await staking.stakedBalance(Address.fromString(userAddress));
    if ("error" in result) return 0n;
    return result.properties?.balance || result.decoded?.[0] || 0n;
  } catch { return 0n; }
}

export async function getPendingRewards(net, userAddress) {
  try {
    const { provider, config } = getProvider(net);
    if (!config.staking) return 0n;
    const staking = getCachedContract(config.staking, MOTOSWAP_STAKING_ABI, provider, config.network, userAddress);
    const result = await staking.pendingRewards(Address.fromString(userAddress));
    if ("error" in result) return 0n;
    return result.properties?.rewards || result.decoded?.[0] || 0n;
  } catch { return 0n; }
}

// ── Exports: write — approval ───────────────────────────────

export async function approveToken(net, tokenAddress, spenderAddress, amount, senderAddress, onStatus) {
  const { provider, config } = getProvider(net);
  const token = getCachedContract(tokenAddress, OP_20_ABI, provider, config.network, senderAddress);
  if (onStatus) onStatus("approving");
  const simulation = await token.increaseAllowance(Address.fromString(spenderAddress), amount);
  return executeTransaction(simulation, senderAddress, onStatus);
}

// ── Exports: write — staking ────────────────────────────────

export async function stakeMoto(net, amount, senderAddress, onStatus) {
  const { provider, config } = getProvider(net);
  if (!config.staking) throw new Error("Staking not available on " + net);
  if (onStatus) onStatus("approving");
  await approveToken(net, config.moto, config.staking, amount, senderAddress, null);
  const staking = getCachedContract(config.staking, MOTOSWAP_STAKING_ABI, provider, config.network, senderAddress);
  if (onStatus) onStatus("simulating");
  const simulation = await staking.stake(amount);
  return executeTransaction(simulation, senderAddress, onStatus);
}

export async function unstakeMoto(net, amount, senderAddress, onStatus) {
  const { provider, config } = getProvider(net);
  if (!config.staking) throw new Error("Staking not available on " + net);
  const staking = getCachedContract(config.staking, MOTOSWAP_STAKING_ABI, provider, config.network, senderAddress);
  if (onStatus) onStatus("simulating");
  const simulation = await staking.unstake(amount);
  return executeTransaction(simulation, senderAddress, onStatus);
}

export async function claimRewards(net, senderAddress, onStatus) {
  const { provider, config } = getProvider(net);
  if (!config.staking) throw new Error("Staking not available on " + net);
  const staking = getCachedContract(config.staking, MOTOSWAP_STAKING_ABI, provider, config.network, senderAddress);
  if (onStatus) onStatus("simulating");
  const simulation = await staking.claimRewards();
  return executeTransaction(simulation, senderAddress, onStatus);
}

// ── Exports: write — MotoSwap Router ────────────────────────

export async function addLiquidity(net, tokenASymbol, tokenBSymbol, amountA, amountB, senderAddress, slippagePct, onStatus) {
  const { provider, config } = getProvider(net);
  if (!config.router) throw new Error("MotoSwap Router not available on " + net);
  const tokenAAddr = resolveTokenAddress(net, tokenASymbol);
  const tokenBAddr = resolveTokenAddress(net, tokenBSymbol);
  if (!tokenAAddr || !tokenBAddr) throw new Error("Cannot resolve token: " + tokenASymbol + " or " + tokenBSymbol);

  const router = getCachedContract(config.router, MOTOSWAP_ROUTER_ABI, provider, config.network, senderAddress);
  if (onStatus) onStatus("approving-tokenA");
  await approveToken(net, tokenAAddr, config.router, amountA, senderAddress, null);
  if (onStatus) onStatus("approving-tokenB");
  await approveToken(net, tokenBAddr, config.router, amountB, senderAddress, null);

  const slipMul = BigInt(100 - slippagePct);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  if (onStatus) onStatus("simulating");
  const simulation = await router.addLiquidity(
    Address.fromString(tokenAAddr), Address.fromString(tokenBAddr),
    amountA, amountB,
    (amountA * slipMul) / 100n, (amountB * slipMul) / 100n,
    Address.fromString(senderAddress), deadline
  );
  return executeTransaction(simulation, senderAddress, onStatus);
}

export async function removeLiquidity(net, tokenASymbol, tokenBSymbol, liquidity, senderAddress, onStatus) {
  const { provider, config } = getProvider(net);
  if (!config.router) throw new Error("MotoSwap Router not available on " + net);
  const tokenAAddr = resolveTokenAddress(net, tokenASymbol);
  const tokenBAddr = resolveTokenAddress(net, tokenBSymbol);
  if (!tokenAAddr || !tokenBAddr) throw new Error("Cannot resolve token: " + tokenASymbol + " or " + tokenBSymbol);

  const router = getCachedContract(config.router, MOTOSWAP_ROUTER_ABI, provider, config.network, senderAddress);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  if (onStatus) onStatus("simulating");
  const simulation = await router.removeLiquidity(
    Address.fromString(tokenAAddr), Address.fromString(tokenBAddr),
    liquidity, 0n, 0n, Address.fromString(senderAddress), deadline
  );
  return executeTransaction(simulation, senderAddress, onStatus);
}

export async function swapTokens(net, tokenInSymbol, tokenOutSymbol, amountIn, senderAddress, slippagePct, onStatus) {
  const { provider, config } = getProvider(net);
  if (!config.router) throw new Error("MotoSwap Router not available on " + net);
  const tokenInAddr = resolveTokenAddress(net, tokenInSymbol);
  const tokenOutAddr = resolveTokenAddress(net, tokenOutSymbol);
  if (!tokenInAddr || !tokenOutAddr) throw new Error("Cannot resolve token: " + tokenInSymbol + " or " + tokenOutSymbol);

  const router = getCachedContract(config.router, MOTOSWAP_ROUTER_ABI, provider, config.network, senderAddress);
  if (onStatus) onStatus("approving");
  await approveToken(net, tokenInAddr, config.router, amountIn, senderAddress, null);

  const path = [Address.fromString(tokenInAddr), Address.fromString(tokenOutAddr)];
  const quote = await router.getAmountsOut(amountIn, path);
  const expectedOut = quote.properties?.amounts?.[1] || 0n;
  const slipMul = BigInt(100 - slippagePct);
  const amountOutMin = (expectedOut * slipMul) / 100n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  if (onStatus) onStatus("simulating");
  const simulation = await router.swapExactTokensForTokens(
    amountIn, amountOutMin, path, Address.fromString(senderAddress), deadline
  );
  return executeTransaction(simulation, senderAddress, onStatus);
}

// ── Exports: write — NativeSwap (BTC<->Token, 2-phase) ─────

export async function nativeSwapReserve(net, tokenSymbol, btcAmount, senderAddress, onStatus) {
  const { provider, config } = getProvider(net);
  const addr = config.nativeSwap;
  if (!addr) throw new Error("NativeSwap not available on " + net);
  const tokenAddr = resolveTokenAddress(net, tokenSymbol);
  if (!tokenAddr) throw new Error("Cannot resolve token: " + tokenSymbol);

  const ns = getCachedContract(addr, NativeSwapAbi, provider, config.network, senderAddress);
  if (onStatus) onStatus("simulating");
  const simulation = await ns.reserve(Address.fromString(tokenAddr), btcAmount);
  return executeTransaction(simulation, senderAddress, onStatus);
}

export async function nativeSwapExecute(net, tokenSymbol, senderAddress, onStatus) {
  const { provider, config } = getProvider(net);
  const addr = config.nativeSwap;
  if (!addr) throw new Error("NativeSwap not available on " + net);
  const tokenAddr = resolveTokenAddress(net, tokenSymbol);
  if (!tokenAddr) throw new Error("Cannot resolve token: " + tokenSymbol);

  const ns = getCachedContract(addr, NativeSwapAbi, provider, config.network, senderAddress);
  if (onStatus) onStatus("simulating");
  const simulation = await ns.swap(Address.fromString(tokenAddr));
  return executeTransaction(simulation, senderAddress, onStatus);
}

// ── Exports: utilities ──────────────────────────────────────

export function toBigInt(amount, decimals = 8) {
  const str = typeof amount === "number" ? amount.toFixed(decimals) : amount.toString();
  const parts = str.split(".");
  const whole = parts[0] || "0";
  const frac = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + frac);
}

export function fromBigInt(bigintVal, decimals = 8) {
  if (!bigintVal || bigintVal === 0n) return 0;
  const str = bigintVal.toString().padStart(decimals + 1, "0");
  const whole = str.slice(0, str.length - decimals);
  const frac = str.slice(str.length - decimals);
  return parseFloat(whole + "." + frac);
}

export function getPoolDepositType(pool) {
  if (!pool) return "unsupported";
  if (pool.proto === "Staking") return "staking";
  if (pool.proto === "NativeSwap") return "nativeswap";
  if (pool.proto === "MotoSwap" || pool.proto === "MotoChef") {
    if (pool.t0 === "BTC" || pool.t0 === "WBTC" || pool.t1 === "BTC" || pool.t1 === "WBTC") {
      return "unsupported";
    }
    return "router";
  }
  return "unsupported";
}

export function getTokenAddress(net, symbol) {
  return resolveTokenAddress(net, symbol);
}

export function getNetworkConfig(net) {
  return NETWORK_MAP[net] || NETWORK_MAP.regtest;
}

export function isSDKAvailable() {
  try { return typeof getContract === "function"; } catch { return false; }
}
