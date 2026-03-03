# 🚜 OrangeFarmer

**Your Ultimate DeFi Tool** — Automated yield farming bot for OPNet (Bitcoin L1 Smart Contracts).

## Features

- **OP_WALLET Integration** — Direct connection to OP_WALLET browser extension
- **4 Strategies** — Conservative, Balanced, Aggressive, Custom
- **8 Liquidity Pools** — MotoSwap, NativeSwap, MOTO Staking
- **30s Monitoring Cycle** — Syncs with Bitcoin blocks and optimal fee rates
- **Smart Fee Optimization** — Delays expensive operations during high-fee periods
- **Auto-compound** — Automatic reward reinvestment
- **Risk-based Pool Filtering** — Strategy determines accessible pools
- **Real-time Logs** — Full operation transparency

## Tech Stack

- React 18 + Vite 6
- OPNet RPC (Bitcoin L1)
- OP_WALLET Provider API
- Single-file component architecture

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/orangefarmer.git
cd orangefarmer
npm install
npm run dev
```

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/orangefarmer)

Or manually:

```bash
npm install -g vercel
vercel
```

## Networks

| Network | RPC Endpoint |
|---------|-------------|
| Regtest | https://regtest.opnet.org |
| Testnet | https://testnet.opnet.org |
| Mainnet | https://mainnet.opnet.org |

## License

MIT
