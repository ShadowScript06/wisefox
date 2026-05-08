# Wisefox

> **Paper trading SaaS platform** — real-time market data, a full order matching engine, margin & leverage, stop-loss/take-profit automation, price alerts, a trading journal, AI-powered performance feedback, and Razorpay-based subscription billing. Trade without risking real money. Improve with AI insights.

---
## Live Demo

- [Visit Wisefox](https://wisefox.vercel.app/)

---

# Wisefox

[![Live Demo](https://img.shields.io/badge/Live-Demo-green?style=for-the-badge)](https://wisefox.vercel.app)

## Demo

![Demo](./videos/wisefoxDemo.mp4)

---


## Landing
![Landing](./screenshots/landing.png)

---

## Dashboard
![Dashboard](./screenshots/dashboard.png)

---

## Trading Terminal

![Trading](./screenshots/account.png)

---

## Journal

![Journal](./screenshots/journal.png)

---

## AI Feedback

![AI](./screenshots/aifeedback.png)

---

## Account Stats

![Stats](./screenshots/overview.png)

---

## Architecture

![Architecture](./screenshots/architecture.png)


## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Core Engine: Order Matching & Trading Logic](#core-engine-order-matching--trading-logic)
- [WebSocket Real-Time System](#websocket-real-time-system)
- [Caching Strategy](#caching-strategy)
- [Subscription & Plan System](#subscription--plan-system)
- [Contributing](#contributing)

---

## Overview

Wisefox is a full-stack TypeScript SaaS that simulates a real derivatives trading environment. Users create paper trading accounts, place market and limit orders with leverage, manage open positions, set stop-loss and take-profit levels, and track their performance through a detailed journal. An AI feedback engine analyses journal entries and provides personalised insights.

Live market prices are sourced from Delta India's WebSocket feed and augmented with Gaussian noise to simulate realistic tick-by-tick movement. A 2-second main loop drives the entire trading engine: order matching, PnL updates, liquidation checks, SL/TP triggers, and alert evaluation all happen on every tick.

---

## Features

### Real-Time Trading Engine
- Live price feed from **Delta India** (WebSocket) for BTCUSD and PAXGUSD
- Gaussian noise + mean-reversion price simulation for smooth tick data
- 2-second main loop drives all trading operations server-side
- WebSocket push to clients: price ticks, PnL updates, margin calls, liquidation events

### Order Management
- **Market orders** — filled immediately at current live price
- **Limit orders** — queued, matched when price crosses the limit level
- **Bracket orders** — attach SL and TP directly to an order at placement time
- Order expiry (TTL-based) with automatic cancellation
- Full order history with pagination

### Position Management
- Three position scenarios handled atomically:
  - **Open** — no existing position, create new
  - **Accumulate** — same direction, weighted average entry recalculation
  - **Close / Partial close / Flip** — opposite direction, realised PnL calculation with brokerage charges
- Leverage support with margin reservation and release
- Position quantity cap: 100,000 contracts

### Risk Management
- **Margin level** monitoring: (equity / marginUsed) × 100
- **Margin call** warning at < 100% margin level
- **Automatic liquidation** at < 50% margin level — all positions closed atomically
- Row-level PostgreSQL locking (`SELECT ... FOR UPDATE`) prevents race conditions during liquidation

### Stop-Loss / Take-Profit (SL/TP)
- Set SL and TP per position independently or via bracket orders
- Validated at order time (LONG: SL < entry, TP > entry; SHORT: SL > entry, TP < entry)
- OCO (One-Cancels-Other) behaviour: triggering SL cancels TP and vice versa
- Checked on every 2-second tick from the position cache — zero DB scans in the hot path

### Price Alerts
- Create price alerts with three types: `GTE` (≥), `LTE` (≤), `ET` (=)
- Alerts checked against live prices on every tick
- On trigger: WebSocket push notification + email notification via Resend
- Alert state synced between DB and in-memory cache

### Trading Journal
- Log trades manually with entry/exit time, PnL, entry/exit reasoning, and quantity
- Add notes to journal entries (multiple per journal)
- Full CRUD: create, read, delete journals and edit/delete notes

### AI Performance Feedback
- AI analyses all journal entries for a trading account
- Returns structured JSON feedback: patterns, strengths, weaknesses, biggest win/loss, suggestions
- Plan-gated: only PRO and PREMIUM users can access AI feedback

### Authentication
- **Email/password** auth with bcrypt hashing
- **Google OAuth** via google-auth-library
- JWT-based sessions stored in HttpOnly cookies
- All routes (except auth) protected by authMiddleware

### Subscription & Billing
- Three plans: `BASIC`, `PRO`, `PREMIUM` — seeded into DB via Prisma seed
- **Razorpay** payment integration with webhook signature verification
- Per-plan limits enforced via middleware: trades/day, journals/day, max accounts
- `DailyUsage` model tracks usage resets per UTC day
- AI features gated by `aiFeedbackEnabled` plan flag

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | HTTP server and REST API |
| TypeScript | End-to-end type safety |
| Prisma ORM | Database modelling and queries |
| PostgreSQL | Relational database with row-level locking |
| Redis (ioredis) | Cache, pub/sub infrastructure |
| Socket.io + ws | WebSocket server for real-time push |
| JWT (jsonwebtoken) | Stateless session tokens in HttpOnly cookies |
| bcrypt | Password hashing |
| google-auth-library | Google OAuth token verification |
| Razorpay | Payment gateway and webhook handling |
| Resend | Transactional email (alert notifications) |
| Zod | Request body validation |
| axios | External HTTP requests |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + Vite 8 | SPA framework and build tool |
| TypeScript | Type-safe component and state code |
| React Router v7 | Client-side routing |
| Redux Toolkit + React-Redux | Global state: prices, positions, alerts, notifications |
| Tailwind CSS v4 | Utility-first styling |
| Axios | HTTP client |
| React Toastify | Toast notifications for WS events |

---

## Architecture

```
Wisefox/
├── backend/    # Express REST API + Trading Engine + WebSocket server
└── frontend/   # React SPA with Redux real-time state
```

### Main Loop (every 2 seconds)

```
setInterval(2000ms) {
  1. generateLivePrices()        — add noise to Delta base prices
  2. Send TICK to all WS clients — broadcast price update
  3. Per-client:
     a. getUnrealisedPnl()       — compute floating P&L from cache
     b. checkAndLiquidate()      — margin level check, auto-liquidate
  4. Global:
     a. expireOrders()           — cancel TTL-expired limit orders
     b. matchPendingOrders()     — fill limit orders if price crossed
     c. checkSLTPForAllPositions()— trigger SL/TP on open positions
     d. checkTriggeredAlerts()   — fire price alerts via WS + email
}
```

### Request Lifecycle

```
Browser → Axios (with credentials: true)
  → Express → authMiddleware (JWT from cookie)
  → checkPlanLimit / checkAiAccess (optional middleware)
  → Controller → Service → Prisma → PostgreSQL
  → Response
```

---

## Database Schema

### Models

#### `User`
| Field | Type | Notes |
|---|---|---|
| `id` | String (uuid) | Primary key |
| `email` | String | Unique |
| `password` | String? | Nullable — absent for Google users |
| `name` | String | |
| `provider` | String | `EMAIL` or `GOOGLE` |
| `googleId` | String? | From Google OAuth |

Relations: `accounts`, `alerts`, `subscription`

#### `Account`
| Field | Type | Notes |
|---|---|---|
| `id` | String (uuid) | Primary key |
| `name` | String | Account display name |
| `balance` | Float | Current available balance |
| `marginUsed` | Float | Total margin locked in positions |
| `netPnl` | Float? | Cumulative realised PnL |
| `charges` | Float? | Cumulative brokerage charges |
| `userId` | String | FK to User (cascade delete) |

Relations: `orders`, `positions`, `auditLogs`, `journals`, `feedback`

#### `Order`
| Field | Type | Notes |
|---|---|---|
| `id` | String (uuid) | Primary key |
| `accountId` | String | FK to Account |
| `symbol` | String | e.g. BTCUSD |
| `direction` | Direction | `LONG` or `SHORT` |
| `status` | OrderStatus | `PENDING`, `FILLED`, `PARTIALLY_FILLED`, `CANCELLED`, `EXPIRED` |
| `type` | orderType | `MARKET` or `LIMIT` |
| `quantity` | Int | Number of contracts |
| `price` | Float | Limit price (market orders use live price at fill) |
| `leverage` | Int | Default 1 |
| `slPrice` | Float? | Stop-loss for bracket orders |
| `tpPrice` | Float? | Take-profit for bracket orders |
| `isBracket` | Boolean | True if SL or TP attached |
| `expiresAt` | DateTime? | TTL for limit orders |
| `filledQty` | Int | Filled quantity |
| `filledPrice` | Float? | Actual fill price |

Relations: `trades`

#### `Position`
| Field | Type | Notes |
|---|---|---|
| `id` | String (uuid) | Primary key |
| `accountId` | String | FK to Account |
| `symbol` | String | |
| `direction` | Direction | LONG / SHORT |
| `quantity` | Int | Current open contracts |
| `avgEntryPrice` | Float | Weighted average cost basis |
| `leverage` | Int | |
| `marginUsed` | Float | Margin locked for this position |
| `slPrice` | Float? | Stop-loss level |
| `tpPrice` | Float? | Take-profit level |
| `slHit` | Boolean | Whether SL was already triggered |
| `tpHit` | Boolean | Whether TP was already triggered |
| `realizedPnl` | Float | Accumulated realised P&L |
| `isOpen` | Boolean | True if position is active |
| `closedAt` | DateTime? | Set when position closes |

#### `Trade`
| Field | Type | Notes |
|---|---|---|
| `id` | String (uuid) | Primary key |
| `orderId` | String? | FK to Order (nullable for SL/TP auto-closes) |
| `accountId` | String | |
| `symbol` | String | |
| `direction` | Direction | |
| `quantity` | Int | |
| `price` | Float | Fill price |
| `realizedPnl` | Float | Net PnL after charges |
| `charges` | Float? | Brokerage + GST |
| `trigger` | String? | `SL`, `TP`, or null |

#### `AuditLog`
| Field | Type | Notes |
|---|---|---|
| `id` | String (uuid) | Primary key |
| `accountId` | String | FK to Account (cascade delete) |
| `type` | AuditType | Enum: ORDER_PLACED, FILLED, CANCELLED, EXPIRED, POSITION_OPENED/CLOSED/FLIPPED, MARGIN_CALL, LIQUIDATION |
| `message` | String | Human-readable description |
| `meta` | Json? | Structured context (prices, quantities) |

#### `Alert`
| Field | Type | Notes |
|---|---|---|
| `id` | String (uuid) | Primary key |
| `userId` | String | FK to User (cascade delete) |
| `name` | String | |
| `symbol` | String | |
| `price` | Float | Target price |
| `type` | AlertType | `GTE`, `LTE`, `ET` |
| `status` | AlertStatus | `PENDING` or `TRIGGERED` |

#### `Journal`
| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `accountId` | String | FK to Account |
| `script` | String | Symbol/instrument traded |
| `date` | DateTime | Trade date |
| `entryTime` | DateTime | Entry timestamp |
| `exitTime` | DateTime? | Exit timestamp (nullable for open trades) |
| `pnl` | Float? | Self-reported P&L |
| `entryReason` | String | Why you entered |
| `exitReason` | String? | Why you exited |
| `quantity` | Int | |

Relations: `notes`

#### `Note`
| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `journalId` | String | FK to Journal (cascade delete) |
| `content` | String | |

#### `AiFeedback`
| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `accountId` | String | FK to Account |
| `content` | Json | Structured AI output |
| `summary` | String? | Text summary |
| `biggestWin` | Float? | |
| `biggestLoss` | Float? | |
| `totalJournals` | Int | |

#### `Plan`
| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `name` | String | BASIC, PRO, PREMIUM |
| `price` | Int | In INR |
| `tradesPerDay` | Int | -1 = unlimited |
| `maxAccounts` | Int | -1 = unlimited |
| `journalsPerDay` | Int | -1 = unlimited |
| `initialBalanceType` | String | FIXED, MULTIPLIER, UNLIMITED |
| `initialBalance` | Int? | Starting balance |
| `aiFeedbackEnabled` | Boolean | |
| `aiSummaryEnabled` | Boolean | |

#### `Subscription`
| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK to User |
| `planId` | String | FK to Plan |
| `status` | String | ACTIVE, EXPIRED, CANCELLED, INACTIVE |
| `razorpayOrderId` | String? | |
| `razorpayPaymentId` | String? | |
| `startDate` | DateTime | |
| `endDate` | DateTime | |

#### `DailyUsage`
| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `userId` | String | |
| `date` | DateTime | UTC day |
| `tradesCount` | Int | |
| `journalsCount` | Int | |

---

## API Reference

Base URL: `http://localhost:5000/api/v1`

All routes except `/auth` require a valid JWT cookie (`token`).

---

### Auth — `/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | No | Register with email/password; creates User + BASIC subscription |
| POST | `/auth/signin` | No | Login with email/password; sets JWT cookie |
| GET | `/auth/google` | No | Initiates Google OAuth flow |
| GET | `/auth/google/callback` | No | Google OAuth callback; creates user if first login |
| GET | `/auth/me` | Yes | Returns current user profile |
| POST | `/auth/logout` | Yes | Clears JWT cookie |

---

### Accounts — `/accounts`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/accounts` | Yes | Create a paper trading account (plan limit enforced) |
| GET | `/accounts` | Yes | List all accounts for the user |
| GET | `/accounts/:id` | Yes | Get account details including balance, marginUsed, netPnl |
| DELETE | `/accounts/:id` | Yes | Delete account and all related data |

**Create Account Body:**
```json
{ "name": "My BTC Account", "balance": 10000 }
```

---

### Orders — `/accounts/:accountId/orders`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | Yes | Place a market or limit order |
| GET | `/` | Yes | Get orders (filterable by status, paginated) |
| DELETE | `/:orderId` | Yes | Cancel a pending limit order |

**Place Order Body:**
```json
{
  "symbol": "BTCUSD",
  "direction": "LONG",
  "type": "LIMIT",
  "quantity": 100,
  "price": 65000,
  "leverage": 5,
  "ttlSeconds": 3600,
  "slPrice": 63000,
  "tpPrice": 68000,
  "isBracket": true
}
```

---

### Positions — `/accounts/:accountId/positions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | Get all open positions |
| GET | `/history` | Yes | Get closed position / trade history (paginated) |

---

### SL/TP — `/accounts/:accountId/positions/:positionId/sltp`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | Yes | Set or update SL and/or TP on an open position |

**Body:**
```json
{ "slPrice": 63000, "tpPrice": 70000 }
```

---

### Alerts — `/alerts`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | Yes | Create a price alert |
| GET | `/` | Yes | Get all alerts for the user |
| PATCH | `/:alertId` | Yes | Edit alert name, price, or type |
| DELETE | `/:alertId` | Yes | Delete an alert |

**Create Alert Body:**
```json
{ "name": "BTC breakout", "symbol": "BTCUSD", "price": 70000, "type": "GTE" }
```

---

### Journals — `/accounts/:accountId/journals`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | Yes | Create a journal entry (plan limit enforced) |
| GET | `/` | Yes | Get all journal entries for the account |
| GET | `/:journalId` | Yes | Get a single journal entry with notes |
| DELETE | `/:journalId` | Yes | Delete a journal and its notes |
| POST | `/:journalId/notes` | Yes | Add a note to a journal |
| GET | `/:journalId/notes` | Yes | Get all notes for a journal |
| PATCH | `/:journalId/notes/:noteId` | Yes | Edit a note |
| DELETE | `/:journalId/notes/:noteId` | Yes | Delete a note |

---

### Subscriptions — `/subscriptions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/create-order` | Yes | Create a Razorpay payment order |
| POST | `/webhook` | No* | Razorpay webhook (signature verified) |
| GET | `/plan` | Yes | Get user's active plan details |

*Webhook uses raw body verification, not JWT auth.

---

## Environment Variables

Create a `.env` file in `backend/`:

```env
# Server
PORT=5000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/wisefox

# Auth
JWT_SECRET=your-jwt-secret-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

# Redis
REDIS_URL=redis://localhost:6379

# Delta Exchange WebSocket (price feed)
WEBSOCKET_URL=wss://socket.delta.exchange

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Resend (email)
RESEND_API_KEY=re_...
FROM_EMAIL=alerts@yourdomain.com

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

Create `.env` in `frontend/`:
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=rzp_test_...
```

---

## Installation & Setup

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- **PostgreSQL** v14+
- **Redis** v7+
- Razorpay account — [razorpay.com](https://razorpay.com)
- Resend account — [resend.com](https://resend.com)
- Delta Exchange account (for WebSocket URL) — [delta.exchange](https://www.delta.exchange)

### 1. Clone

```bash
git clone https://github.com/ShadowScript06/wisefox.git
cd wisefox
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Configure `.env` as above, then:

```bash
npx prisma migrate deploy
npx prisma generate
node prisma/seed.js   # Seeds BASIC, PRO, PREMIUM plans
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Configure frontend `.env`.

---

## Running the Application

### Development

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

Backend: `http://localhost:5000` | Frontend: `http://localhost:5173`

### Production

```bash
cd backend && npm run build && npm start
cd frontend && npm run build   # output to dist/
```

---

## Project Structure

```
wisefox/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/         # 30 migration files
│   │   └── seed.js             # Seeds plan data
│   └── src/
│       ├── app.ts              # Express setup, routes, CORS
│       ├── server.ts           # HTTP + WebSocket server, 2s main loop
│       ├── config/
│       │   ├── redis/redis.ts  # ioredis multi-client setup
│       │   ├── razorpay/       # Razorpay SDK config
│       │   └── validations/    # Zod schemas
│       ├── lib/
│       │   ├── prisma.ts       # Prisma client singleton
│       │   └── oAuth.ts        # Google OAuth client
│       ├── middlewares/
│       │   ├── auth.ts             # JWT cookie validation
│       │   ├── checkPlanLimit.ts   # Trade/journal/account limits
│       │   ├── checkAiAccess.ts    # AI feature gating
│       │   ├── checkAccountBalance.ts
│       │   └── incrementUsage.ts   # DailyUsage upsert
│       ├── modules/
│       │   ├── auth/           # Email + Google auth
│       │   ├── account/        # Account CRUD
│       │   ├── order/          # Order placement, cancellation, pagination
│       │   ├── position/       # Position lifecycle (open/accumulate/close/flip)
│       │   ├── matching/       # Order matching engine
│       │   ├── sltp/           # SL/TP set and trigger logic
│       │   ├── pnl/            # Unrealised PnL calculation
│       │   ├── liquidation/    # Margin monitoring and auto-liquidation
│       │   ├── alert/          # Price alert CRUD and trigger check
│       │   ├── audit/          # Audit log write service
│       │   ├── journal/        # Trade journal CRUD and notes
│       │   └── subscription/   # Razorpay, webhook, plan lookup
│       ├── types/
│       │   └── express.d.ts    # Extends Request with req.user
│       ├── utils/
│       │   ├── cache/
│       │   │   ├── accountCache.ts  # In-memory account store
│       │   │   ├── positionCache.ts # Map<accountId, Map<symbol, Position>>
│       │   │   ├── orderCache.ts    # Pending order array
│       │   │   └── alertCache.ts    # Map<userId, Map<alertId, Alert>>
│       │   ├── fetchPrices/
│       │   │   ├── ws.ts           # Delta India WebSocket client
│       │   │   ├── generateLive.ts # Gaussian noise + mean-reversion
│       │   │   └── price.utils.ts  # getLivePrice() lookup
│       │   ├── margin.utils.ts     # calcRequiredMargin, calcMarginLevel
│       │   └── pnl.utils.ts        # calcUnrealizedPnl, calcPnlAndCharges
│       └── workers/
│           └── emailWorker.ts      # Resend email trigger for alerts
│
└── frontend/
    └── src/
        ├── App.tsx             # Routes + WS lifecycle + toast consumer
        ├── main.tsx            # App bootstrap + Redux Provider
        ├── pages/
        │   ├── LandingPage.tsx
        │   ├── SignUpPage.tsx / SignInPage.tsx
        │   ├── AuthSuccess.tsx      # OAuth redirect handler
        │   ├── Dashboard.tsx        # Account list
        │   ├── AccountPage.tsx      # Order placement + positions
        │   ├── AccountOverview.tsx  # PnL stats + trade history
        │   ├── JournalsPage.tsx
        │   ├── JournalDetailsPage.tsx
        │   └── AiFeedbackPage.tsx
        ├── components/
        │   ├── AccountActivity.tsx
        │   └── HeatMap.tsx
        ├── redux/
        │   ├── store.ts
        │   ├── marketPriceSlice.ts    # Live price ticks
        │   ├── positionsSlice.ts      # Open positions + PnL
        │   ├── alertSlice.ts
        │   └── notificationSlice.ts  # WS notification queue for toasts
        └── services/
            ├── ws/marketSocket.ts     # WS client, dispatches to Redux
            └── trading/positionSizeCalculator.ts
```

---

## Core Engine: Order Matching & Trading Logic

### Order Matching

Market orders are matched immediately when placed. Limit orders are stored in the `pendingOrders` in-memory cache and evaluated on every 2-second tick via `matchPendingOrders()`.

The `shouldFill()` function checks fill conditions:
- MARKET: always fill
- LONG LIMIT: fill when `currentPrice <= order.price`
- SHORT LIMIT: fill when `currentPrice >= order.price`

The `matchOrder()` function runs inside a Prisma `$transaction` with a raw `SELECT ... FOR UPDATE` to lock the account row. This prevents two concurrent fills from double-spending the same margin.

### Position Lifecycle

`processTradeIntoPosition()` handles three scenarios:

**Scenario A — New Position:** No open position for this symbol. Create position, reserve margin.

**Scenario B — Accumulate:** Trade is same direction as existing position. Recalculate weighted average entry: `(existingQty × existingAvg + newQty × newPrice) / (existingQty + newQty)`. Increment marginUsed.

**Scenario C — Close/Partial/Flip:** Trade is opposite direction.
- `remainingQty > 0`: Partial close — compute PnL on closed portion, release proportional margin, decrement position quantity.
- `remainingQty = 0`: Full close — compute PnL on full position, release all margin, set `isOpen = false`.
- `remainingQty < 0`: Flip — close existing position fully, then open new position in opposite direction with the surplus quantity.

### PnL and Charges

```
contracts = quantity / 1000    (BTC quantity)
brokerage = entryPrice × 0.05% × qty + exitPrice × 0.05% × qty
gst       = brokerage × 18%
charges   = brokerage + gst
grossPnl  = (exitPrice - entryPrice) × qty     [LONG]
           (entryPrice - exitPrice) × qty     [SHORT]
realizedPnl = grossPnl - charges
```

### Margin Calculations

```
requiredMargin = (quantity / 1000 × price) / leverage
marginLevel    = (equity / marginUsed) × 100
```

- marginLevel < 100% → Margin Call warning
- marginLevel < 50%  → Automatic liquidation

### Price Generation

Base prices come from Delta India's WebSocket. Every 2 seconds, `generateLivePrices()` applies Gaussian noise (±0.05%) and a mean-reversion drift back toward the base price, keeping simulated prices within ±0.1% of the real market price.

---

## WebSocket Real-Time System

The server maintains a `WebSocketServer` on the same HTTP server as Express. On connection:

1. Cookie is parsed from the WebSocket upgrade request headers
2. JWT is verified — unauthenticated connections are closed immediately
3. The user's first Account is looked up and associated with the socket client object

Every 2 seconds, per-client messages are pushed:
- `TICK` — full `livePrices` object for all symbols
- `PNL_UPDATE` — array of `{positionId, unrealizedPnl, currentPrice}` for open positions
- `MARGIN_CALL` — warning message when margin level < 100%
- `LIQUIDATED` — notification after auto-liquidation
- `ALERT_TRIGGERED` — fired when a price alert condition is met
- `ACCOUNT_CONNECTED` — sent when a user without an account creates one mid-session

The frontend `marketSocket.ts` service connects to the WebSocket on mount and dispatches incoming messages to the appropriate Redux slices. React Toastify shows MARGIN_CALL, LIQUIDATED, and ALERT_TRIGGERED events as toast notifications.

---

## Caching Strategy

Four in-memory caches reduce DB load in the hot 2-second loop:

| Cache | Structure | Purpose |
|---|---|---|
| `accountCache` | `Map<accountId, Account>` | Balance and margin reads without DB query |
| `positionCache` | `Map<accountId, Map<symbol, Position>>` | SL/TP checks and PnL computation |
| `orderCache` | `Order[]` | Pending limit orders for matching |
| `alertCache` | `Map<userId, Map<alertId, Alert>>` | Alert trigger evaluation |

Caches are refreshed from DB every 60 minutes via a secondary interval. Writes to DB always also call `upsertAccount()`, `upsertPositionCache()`, or `upsertAlert()` to keep cache consistent.

`getLivePrice(symbol)` reads from the in-memory `livePrices` record — a single object lookup, zero I/O.

---

## Subscription & Plan System

Plans are seeded into the database. The middleware chain enforces limits:

1. `authMiddleware` — validates JWT, attaches `req.user`
2. `checkPlanLimit('TRADE')` — for order placement: checks `DailyUsage.tradesCount` against plan's `tradesPerDay`
3. `checkPlanLimit('JOURNAL')` — for journal creation
4. `checkPlanLimit('ACCOUNT')` — for account creation: checks total `Account` count against `maxAccounts`
5. `checkAiAccess` — for AI feedback: checks `plan.aiFeedbackEnabled`

`incrementUsage()` is called after a successful trade fill to increment `DailyUsage.tradesCount`. Usage is tracked per UTC day.

Razorpay webhook (`POST /api/v1/subscriptions/webhook`) receives raw body, verifies HMAC-SHA256 signature against `RAZORPAY_WEBHOOK_SECRET`, then on `payment.captured` event upgrades the user's subscription by deactivating the old one and creating a new active subscription for the purchased plan.

---

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "feat: description"`
4. Push and open a Pull Request against `main`

Never commit `.env` files. Keep backend and frontend dependencies separate.

---

*Built by [ShadowScript06](https://github.com/ShadowScript06)*