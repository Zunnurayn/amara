## Mobile Wiring Implementation Plan

Status update: 2026-04-11

This document is the execution backlog for wiring the existing mobile UI to the already-live web functionality. The constraint is fixed:

- Do not redesign the mobile UI
- Do not change the current mobile visual language
- Only replace mock, local, or simulated behavior with real app state and live integrations

## Goal

Bring `apps/mobile` to functional parity with the current shipped web MVP where practical, while preserving the existing mobile layout, components, spacing, hierarchy, and flows.

Primary product outcome:

- the current mobile screens remain visually intact
- wallet data becomes real
- quick actions become executable
- agent and strategy controls become real
- settings stop being hardcoded

## Current State Summary

Web is already wired end to end:

- auth and wallet sync in [apps/web/src/lib/auth.tsx](/home/mafita/amara/apps/web/src/lib/auth.tsx)
- wallet, tx, and agent execution flow in [apps/web/src/hooks/useAgent.ts](/home/mafita/amara/apps/web/src/hooks/useAgent.ts)
- dashboard and strategy UI consuming live APIs in [apps/web/src/app/dashboard/page.tsx](/home/mafita/amara/apps/web/src/app/dashboard/page.tsx) and [apps/web/src/app/dashboard/strategy/[id]/page.tsx](/home/mafita/amara/apps/web/src/app/dashboard/strategy/[id]/page.tsx)
- backend routes already available under:
  - [apps/api/src/routes/auth.ts](/home/mafita/amara/apps/api/src/routes/auth.ts)
  - [apps/api/src/routes/wallet.ts](/home/mafita/amara/apps/api/src/routes/wallet.ts)
  - [apps/api/src/routes/agent.ts](/home/mafita/amara/apps/api/src/routes/agent.ts)
  - [apps/api/src/routes/transactions.ts](/home/mafita/amara/apps/api/src/routes/transactions.ts)
  - [apps/api/src/routes/strategy.ts](/home/mafita/amara/apps/api/src/routes/strategy.ts)
  - [apps/api/src/routes/onramp.ts](/home/mafita/amara/apps/api/src/routes/onramp.ts)

Mobile is still mostly scaffolded:

- root shell exists in [apps/mobile/App.jsx](/home/mafita/amara/apps/mobile/App.jsx)
- screen navigation exists in [apps/mobile/src/navigation/AppNavigator.jsx](/home/mafita/amara/apps/mobile/src/navigation/AppNavigator.jsx)
- sheet orchestration exists in [apps/mobile/src/hooks/useSheets.js](/home/mafita/amara/apps/mobile/src/hooks/useSheets.js)
- most data is mock or local state in:
  - [apps/mobile/src/components/home/HeroCard.jsx](/home/mafita/amara/apps/mobile/src/components/home/HeroCard.jsx)
  - [apps/mobile/src/components/home/HomeTab.jsx](/home/mafita/amara/apps/mobile/src/components/home/HomeTab.jsx)
  - [apps/mobile/src/components/agent/AgentTab.jsx](/home/mafita/amara/apps/mobile/src/components/agent/AgentTab.jsx)
  - [apps/mobile/src/components/settings/SettingsTab.jsx](/home/mafita/amara/apps/mobile/src/components/settings/SettingsTab.jsx)
  - [apps/mobile/src/components/send/SendSheet.jsx](/home/mafita/amara/apps/mobile/src/components/send/SendSheet.jsx)
  - [apps/mobile/src/components/swap/SwapSheet.jsx](/home/mafita/amara/apps/mobile/src/components/swap/SwapSheet.jsx)
  - [apps/mobile/src/components/bridge/BridgeSheet.jsx](/home/mafita/amara/apps/mobile/src/components/bridge/BridgeSheet.jsx)
  - [apps/mobile/src/components/receive/ReceiveSheet.jsx](/home/mafita/amara/apps/mobile/src/components/receive/ReceiveSheet.jsx)
  - [apps/mobile/src/components/onramp/OnrampSheet.jsx](/home/mafita/amara/apps/mobile/src/components/onramp/OnrampSheet.jsx)

## Immediate Gaps To Fix First

These are blockers. Do not start screen wiring before these are resolved.

### 1. Mobile package/runtime mismatch

Observed issues:

- root script uses `pnpm --filter @anara/mobile start`
- [apps/mobile/package.json](/home/mafita/amara/apps/mobile/package.json) is currently named `anara-wallet`
- `main` points to `expo-router/entry`
- app implementation is centered on `App.jsx`, not an Expo Router app directory

Required action:

- choose one mobile entry architecture and make the repo consistent
- recommended: keep the current `App.jsx` + React Navigation structure and remove accidental Expo Router coupling unless Router is intentionally being adopted

Acceptance criteria:

- `pnpm dev:mobile` resolves the correct workspace package
- mobile app boots from a single agreed entrypoint
- no split-brain between `entrypoint.js`, `expo-router`, and `App.jsx`

### 2. Auth dependency is missing on mobile

The API requires bearer auth for agent, tx, onramp, and strategy routes. Mobile cannot be wired as public fetches.

Required action:

- add a mobile auth/session layer equivalent to web auth
- support:
  - authenticated user state
  - access token retrieval
  - wallet identity resolution
  - `/api/auth/sync`

Acceptance criteria:

- mobile can log in
- mobile can retrieve an access token
- mobile can call `/api/auth/sync`
- mobile can resolve the current wallet address used for all wallet-specific fetches and actions

### 3. Shared state layer is missing on mobile

Required action:

- add mobile stores or providers for:
  - auth/session
  - wallet
  - agent
  - strategies/settings
  - execution status

Acceptance criteria:

- wallet data is not stored per-screen
- sheet actions and tabs read the same canonical wallet/session state
- refreshes update the whole app consistently

## Recommended Mobile Architecture

Use the web implementation as the functional reference and keep mobile-specific UI composition separate.

### New mobile foundation modules

Create these modules before wiring screens:

- `apps/mobile/src/lib/config.(js|ts)`
  - API base URL
  - environment lookup

- `apps/mobile/src/lib/api.(js|ts)`
  - shared fetch wrapper
  - auth header injection
  - common error normalization

- `apps/mobile/src/lib/auth.(js|ts)`
  - auth provider/hooks
  - access token retrieval
  - authenticated user/session state

- `apps/mobile/src/lib/wallet.(js|ts)`
  - wallet identity resolution
  - chain selection helpers
  - formatting helpers reused by UI

- `apps/mobile/src/store/`
  - `auth`
  - `wallet`
  - `agent`
  - `strategy`
  - `ui`

- `apps/mobile/src/hooks/`
  - `useWalletData`
  - `useAgent`
  - `useStrategies`
  - `useExecuteAction`
  - `useTransactionMonitor`

### Shared types to reuse

Use the existing shared types instead of redefining mobile-only contracts:

- [packages/types/src/agent.ts](/home/mafita/amara/packages/types/src/agent.ts)
- [packages/types/src/transaction.ts](/home/mafita/amara/packages/types/src/transaction.ts)
- [packages/types/src/wallet.ts](/home/mafita/amara/packages/types/src/wallet.ts)

## API Contract Map For Mobile

### Auth

- `POST /api/auth/sync`
- file: [apps/api/src/routes/auth.ts](/home/mafita/amara/apps/api/src/routes/auth.ts)
- use after login and whenever session wallet changes

### Wallet

- `GET /api/wallet/:address/portfolio`
- `GET /api/wallet/:address/transactions`
- file: [apps/api/src/routes/wallet.ts](/home/mafita/amara/apps/api/src/routes/wallet.ts)

### Agent

- `POST /api/agent/chat`
- `POST /api/agent/brief`
- `GET /api/agent/status`
- file: [apps/api/src/routes/agent.ts](/home/mafita/amara/apps/api/src/routes/agent.ts)

### Transaction execution

- `POST /api/tx/simulate`
- `POST /api/tx/execute`
- `GET /api/tx/status/:chainId/:txHash`
- file: [apps/api/src/routes/transactions.ts](/home/mafita/amara/apps/api/src/routes/transactions.ts)

### Strategies

- `GET /api/strategy`
- `GET /api/strategy/:id`
- `POST /api/strategy/:id/toggle`
- `POST /api/strategy/settings`
- `POST /api/strategy/:id/preview`
- file: [apps/api/src/routes/strategy.ts](/home/mafita/amara/apps/api/src/routes/strategy.ts)

### Onramp

- `POST /api/onramp/session`
- file: [apps/api/src/routes/onramp.ts](/home/mafita/amara/apps/api/src/routes/onramp.ts)

## Execution Plan By Phase

### Phase 0: Mobile foundation and boot correctness

Scope:

- normalize mobile package name and entrypoint
- confirm environment loading
- ensure the app boots consistently in dev

Files:

- [package.json](/home/mafita/amara/package.json)
- [apps/mobile/package.json](/home/mafita/amara/apps/mobile/package.json)
- [apps/mobile/app.json](/home/mafita/amara/apps/mobile/app.json)
- [apps/mobile/entrypoint.js](/home/mafita/amara/apps/mobile/entrypoint.js)
- [apps/mobile/App.jsx](/home/mafita/amara/apps/mobile/App.jsx)

Tasks:

- make workspace filter and package name consistent
- remove unused router assumptions or fully adopt them
- confirm `App.jsx` is the intended entry root
- add mobile env configuration for API URL and auth public keys

Acceptance criteria:

- mobile starts with one command
- no conflicting entry behavior
- API base URL is configurable without editing components

### Phase 1: Auth and session wiring

Scope:

- bring mobile to the same auth shape as web

Reference:

- [apps/web/src/lib/auth.tsx](/home/mafita/amara/apps/web/src/lib/auth.tsx)
- [apps/web/src/lib/wallet.ts](/home/mafita/amara/apps/web/src/lib/wallet.ts)

Files to add/update:

- `apps/mobile/src/lib/auth.(js|ts)`
- `apps/mobile/src/lib/wallet.(js|ts)`
- `apps/mobile/App.jsx`

Tasks:

- add an auth provider around the mobile app
- expose:
  - `ready`
  - `authenticated`
  - `user`
  - `identityToken`
  - `login`
  - `logout`
  - `walletAddress`
- perform `/api/auth/sync` once the session is ready
- store the synchronized wallet identity centrally

Acceptance criteria:

- mobile can authenticate a user
- mobile can sync the authenticated user to backend
- wallet address is available globally to all tabs and sheets

### Phase 2: Wallet store and refresh pipeline

Scope:

- centralize portfolio and transaction state

Reference:

- [apps/web/src/store/index.ts](/home/mafita/amara/apps/web/src/store/index.ts)
- [apps/web/src/hooks/useAgent.ts](/home/mafita/amara/apps/web/src/hooks/useAgent.ts)

Files to add/update:

- `apps/mobile/src/store/wallet.(js|ts)`
- `apps/mobile/src/hooks/useWalletData.(js|ts)`
- `apps/mobile/src/lib/api.(js|ts)`

Tasks:

- add canonical wallet state:
  - address
  - hasWallet
  - chainId
  - totalUsd
  - tokens
  - nfts
  - chains
  - transactions
  - error
  - loading
  - lastUpdated
- implement `refreshWallet`
- fetch portfolio and txs together
- normalize API warnings and errors

Acceptance criteria:

- a single refresh updates all wallet views
- wallet data is available to home, sheets, settings, and agent flows

### Phase 3: Home tab wiring without UI changes

Scope:

- bind existing home UI to live wallet data

Files:

- [apps/mobile/src/components/home/HeroCard.jsx](/home/mafita/amara/apps/mobile/src/components/home/HeroCard.jsx)
- [apps/mobile/src/components/home/HomeTab.jsx](/home/mafita/amara/apps/mobile/src/components/home/HomeTab.jsx)

Tasks:

- replace hardcoded total balance and 24h figures with real portfolio values
- map chain allocation bar to live chain totals
- replace `TOKENS` asset list with normalized token balances
- replace activity placeholder with recent transactions
- replace NFT placeholder with real NFT summary grid/list
- keep current tabs, labels, and ordering intact

Acceptance criteria:

- Home shows live portfolio data
- Activity tab shows recent wallet transactions
- NFTs tab shows wallet NFTs or a correct empty state
- no spacing or style regressions

### Phase 4: Receive flow

Scope:

- wire current receive sheet to real wallet identity

Files:

- [apps/mobile/src/components/receive/ReceiveSheet.jsx](/home/mafita/amara/apps/mobile/src/components/receive/ReceiveSheet.jsx)

Tasks:

- replace hardcoded address with current synced wallet address
- render actual QR code
- enable clipboard copy
- optionally enable native share
- keep network warning copy aligned with the actual selected/default chain

Acceptance criteria:

- QR encodes the real wallet address
- copy action works
- receive screen reflects the active wallet, not a constant

### Phase 5: Onramp flow

Scope:

- convert current local simulation into a real funded flow

Files:

- [apps/mobile/src/components/onramp/OnrampSheet.jsx](/home/mafita/amara/apps/mobile/src/components/onramp/OnrampSheet.jsx)
- [apps/mobile/src/hooks/useOnramp.js](/home/mafita/amara/apps/mobile/src/hooks/useOnramp.js)

Tasks:

- preserve current input and picker UI
- stop generating fake order refs and fake processing states as the source of truth
- call `POST /api/onramp/session`
- map:
  - selected token
  - fiat currency
  - fiat amount
  - chain
  - wallet address
- open hosted widget flow in-app
- store attempt status locally if needed for resume/history UX

Acceptance criteria:

- tapping buy creates a real onramp session
- session is opened in-app
- selected asset/currency/amount match the backend request
- UI remains visually unchanged apart from real states/errors

### Phase 6: Send flow

Scope:

- implement the missing send flow under the current sheet design

Files:

- [apps/mobile/src/components/send/SendSheet.jsx](/home/mafita/amara/apps/mobile/src/components/send/SendSheet.jsx)

Reference:

- send validation and action-card construction in [apps/web/src/app/dashboard/chat/page.tsx](/home/mafita/amara/apps/web/src/app/dashboard/chat/page.tsx)
- execution flow in [apps/web/src/hooks/useAgent.ts](/home/mafita/amara/apps/web/src/hooks/useAgent.ts)

Tasks:

- build the current 4-step flow:
  - input
  - review
  - processing
  - success/failure
- validate:
  - token
  - amount
  - recipient address
  - chain
- construct a send `AgentActionCard`
- call `/api/tx/simulate`
- submit through the connected wallet
- call `/api/tx/execute`
- monitor final status through `/api/tx/status/:chainId/:txHash`

Acceptance criteria:

- send sheet can preview a valid transfer
- invalid inputs are blocked before submission
- successful sends appear in wallet activity after refresh
- no redesign of the current bottom-sheet experience

### Phase 7: Swap flow

Scope:

- replace local price math and fake processing with real quote-backed execution

Files:

- [apps/mobile/src/components/swap/SwapSheet.jsx](/home/mafita/amara/apps/mobile/src/components/swap/SwapSheet.jsx)

Reference:

- quote and action-card generation in [apps/web/src/app/dashboard/chat/page.tsx](/home/mafita/amara/apps/web/src/app/dashboard/chat/page.tsx)
- LiFi support in [packages/chain/src/lifi.ts](/home/mafita/amara/packages/chain/src/lifi.ts)

Tasks:

- keep current form UI and swap screens
- replace local conversion logic with real quote retrieval
- derive rate, receive amount, and fee values from quote metadata
- build a swap action card compatible with backend simulate/execute
- run:
  - simulate
  - wallet submit
  - execute
  - status monitoring
- refresh wallet after completion

Acceptance criteria:

- swap preview uses real quote data
- execute path submits a real transaction
- transaction status is reflected in UI and wallet history

### Phase 8: Bridge flow

Scope:

- wire the current bridge UI to live bridge previews and execution

Files:

- [apps/mobile/src/components/bridge/BridgeSheet.jsx](/home/mafita/amara/apps/mobile/src/components/bridge/BridgeSheet.jsx)

Tasks:

- preserve existing chain/amount UI
- replace fake fee/time/protocol values with real route-backed data
- respect backend feature flags and guardrails
- build bridge action cards compatible with current tx endpoints
- execute through the same shared mobile execution helper used by swap/send

Acceptance criteria:

- bridge screen can generate a real route-backed preview
- disabled bridge environments show a real backend-derived restriction state
- successful submissions are monitored and persisted

### Phase 9: Agent tab and strategy controls

Scope:

- replace fake agent and strategy state with live backend state

Files:

- [apps/mobile/src/components/agent/AgentTab.jsx](/home/mafita/amara/apps/mobile/src/components/agent/AgentTab.jsx)

Reference:

- [apps/api/src/routes/agent.ts](/home/mafita/amara/apps/api/src/routes/agent.ts)
- [apps/api/src/routes/strategy.ts](/home/mafita/amara/apps/api/src/routes/strategy.ts)
- [apps/web/src/app/dashboard/strategy/[id]/page.tsx](/home/mafita/amara/apps/web/src/app/dashboard/strategy/[id]/page.tsx)

Tasks:

- fetch `/api/agent/status`
- fetch `/api/agent/brief`
- fetch `/api/strategy`
- bind current mode toggles to real `toggle` actions
- add loading, pending, and error behavior without redesigning the screen

Acceptance criteria:

- agent stats are live
- toggles reflect real backend strategy state
- changes persist after app reload

### Phase 10: Settings tab wiring

Scope:

- turn settings rows from static text into real settings surfaces

Files:

- [apps/mobile/src/components/settings/SettingsTab.jsx](/home/mafita/amara/apps/mobile/src/components/settings/SettingsTab.jsx)

Tasks:

- replace hardcoded wallet address with session wallet
- replace chain and connected wallet counts with live values
- map supported editable settings to `/api/strategy/settings`
- keep unsupported rows visibly read-only rather than pretending they work

Acceptance criteria:

- agent safety settings are loaded from backend
- editable rows save successfully
- non-wired rows are clearly non-interactive or deferred

## Shared Utilities To Build Once

These should be implemented before or during Phases 6 to 8 and reused across all transaction sheets.

### `useExecuteAction`

Responsibilities:

- accept an `AgentActionCard`
- call `/api/tx/simulate`
- submit via wallet provider
- call `/api/tx/execute`
- return tx hash, explorer URL, and submission state

### `useTransactionMonitor`

Responsibilities:

- poll `/api/tx/status/:chainId/:txHash`
- update local transaction state
- resolve success/failure into sheet UI states

### Action card builders

Responsibilities:

- build send/swap/bridge cards with the same shape web uses
- prevent mobile-only payload drift

## Screen Backlog With Priority

### P0

- Phase 0 mobile runtime cleanup
- Phase 1 auth/session wiring
- Phase 2 wallet store and refresh
- Phase 3 home tab data wiring

### P1

- Phase 4 receive sheet
- Phase 5 onramp flow
- Phase 6 send flow

### P2

- Phase 7 swap flow
- Phase 8 bridge flow
- Phase 9 agent tab and strategy wiring

### P3

- Phase 10 settings tab
- any mobile chat surface if explicitly added to scope

## QA Checklist

The following should be tested on mobile before declaring parity:

- cold launch with unauthenticated user
- login and auth sync
- app restart with persisted session
- portfolio refresh
- assets, activity, and NFTs rendering
- receive copy and QR
- onramp session creation
- send preview and execution
- swap preview and execution
- bridge preview and execution or expected feature-flag block
- strategy toggle persistence
- settings save
- error states for missing wallet, missing token, invalid address, failed API response, rejected wallet signature, and failed transaction

## Risks

- mobile auth SDK selection and wallet provider behavior may differ from web and must be verified before transaction work starts
- swap and bridge execution depend on wallet-provider support on React Native, not just API readiness
- the current mobile codebase is JS while much of the shared web logic is TS; type drift risk is high unless shared contracts are imported directly
- if UI edits start mixing into this work, schedule and parity will slip

## Definition Of Done

This work is complete when:

- the existing mobile UI remains visually recognizable and materially unchanged
- mobile authenticates against the same backend trust model as web
- mobile displays live wallet data
- mobile can perform receive, onramp, send, swap, and bridge flows through real integrations where enabled
- mobile agent and strategy controls reflect real backend state
- mobile settings stop relying on hardcoded placeholder values
- the app no longer depends on mock portfolio, fake tx hashes, or simulated success as the primary behavior
