# Mobile Execution Board

Status date: 2026-04-11

This board converts the mobile wiring plan into execution-ready tickets.

Scope:

- preserve the current mobile UI
- replace mock state and simulated behavior with real backend and wallet integrations
- target the existing `apps/mobile` shell, not a redesign

Assumptions:

- web remains the functional source of truth
- API routes already available in `apps/api` should be reused, not duplicated
- mobile will follow the same auth and execution model as web
- bridge remains a higher-risk flow and can be feature-flagged

## Delivery Lanes

Primary execution lanes:

- Mobile app owner
- Backend/chain owner
- QA/product
- Tech lead

Recommended split:

- Mobile app owner: app shell, auth integration, stores, home, sheets, settings
- Backend/chain owner: API contract support, envs, provider issues, transaction execution support
- QA/product: acceptance pass, regression, UX parity validation
- Tech lead: architecture decisions, risk and dependency management

## Epic 1: Mobile Runtime And App Shell

Owner:
- Mobile app owner
- Tech lead

Priority:
- P0

Dependencies:
- None

Tickets:

1. Normalize mobile package and workspace naming
- Owner: Mobile app owner
- Estimate: 0.25 day
- Files:
  - [package.json](/home/mafita/amara/package.json)
  - [apps/mobile/package.json](/home/mafita/amara/apps/mobile/package.json)
- Acceptance criteria:
  - `pnpm dev:mobile` targets the correct package
  - workspace naming is consistent
  - no manual package-name workaround is required to run mobile

2. Resolve mobile entrypoint architecture
- Owner: Mobile app owner
- Estimate: 0.5 day
- Files:
  - [apps/mobile/package.json](/home/mafita/amara/apps/mobile/package.json)
  - [apps/mobile/entrypoint.js](/home/mafita/amara/apps/mobile/entrypoint.js)
  - [apps/mobile/App.jsx](/home/mafita/amara/apps/mobile/App.jsx)
- Acceptance criteria:
  - one entry model is used consistently
  - no accidental mix of Expo Router and `App.jsx` boot flow remains
  - app boots cleanly in local dev

3. Add mobile runtime config module
- Owner: Mobile app owner
- Estimate: 0.25 day
- Files:
  - `apps/mobile/src/lib/config.(js|ts)`
- Acceptance criteria:
  - API base URL is read from env/config
  - components do not hardcode API URLs
  - config is reusable across auth, wallet, tx, and onramp flows

## Epic 2: Auth And Session Parity

Owner:
- Mobile app owner
- Backend/chain owner for contract verification

Priority:
- P0

Dependencies:
- Epic 1 complete

Tickets:

1. Add mobile auth provider
- Owner: Mobile app owner
- Estimate: 1 day
- Files:
  - `apps/mobile/src/lib/auth.(js|ts)`
  - [apps/mobile/App.jsx](/home/mafita/amara/apps/mobile/App.jsx)
- Acceptance criteria:
  - mobile exposes `ready`, `authenticated`, `user`, `identityToken`, `login`, and `logout`
  - auth state is available globally
  - unauthorized screens can be gated without screen-specific hacks

2. Port wallet identity resolution to mobile
- Owner: Mobile app owner
- Estimate: 0.25 day
- Files:
  - `apps/mobile/src/lib/wallet.(js|ts)`
- Reference:
  - [apps/web/src/lib/wallet.ts](/home/mafita/amara/apps/web/src/lib/wallet.ts)
- Acceptance criteria:
  - mobile can derive the active wallet address from session data
  - wallet presence and address format are normalized the same way as web

3. Implement backend auth sync on mobile
- Owner: Mobile app owner
- Estimate: 0.5 day
- Files:
  - `apps/mobile/src/lib/auth.(js|ts)`
  - [apps/api/src/routes/auth.ts](/home/mafita/amara/apps/api/src/routes/auth.ts)
- Acceptance criteria:
  - mobile calls `POST /api/auth/sync` after login/session readiness
  - wallet address is synced to backend
  - sync failure surfaces a sane user-facing state

4. Verify auth token compatibility against API middleware
- Owner: Backend/chain owner
- Estimate: 0.25 day
- Files:
  - [apps/api/src/middleware/auth.ts](/home/mafita/amara/apps/api/src/middleware/auth.ts)
- Acceptance criteria:
  - mobile bearer token works with existing middleware
  - `sub` and wallet address claims are available as expected
  - no mobile-specific backend workaround is needed

## Epic 3: Shared Mobile Data Layer

Owner:
- Mobile app owner

Priority:
- P0

Dependencies:
- Epic 2 complete

Tickets:

1. Add shared API client
- Owner: Mobile app owner
- Estimate: 0.5 day
- Files:
  - `apps/mobile/src/lib/api.(js|ts)`
- Acceptance criteria:
  - auth headers are injected centrally
  - JSON parsing is standardized
  - HTTP and domain errors are normalized

2. Add wallet store
- Owner: Mobile app owner
- Estimate: 0.5 day
- Files:
  - `apps/mobile/src/store/wallet.(js|ts)`
- Acceptance criteria:
  - wallet store contains address, balances, chains, NFTs, txs, loading, and error state
  - state is shared across tabs and sheets

3. Add agent store
- Owner: Mobile app owner
- Estimate: 0.5 day
- Files:
  - `apps/mobile/src/store/agent.(js|ts)`
- Acceptance criteria:
  - agent status, brief, messages, and thinking state are centralized

4. Add strategy/settings store
- Owner: Mobile app owner
- Estimate: 0.5 day
- Files:
  - `apps/mobile/src/store/strategy.(js|ts)`
- Acceptance criteria:
  - strategy list and settings are globally available
  - optimistic updates or pending states are handled cleanly

5. Add wallet refresh hook
- Owner: Mobile app owner
- Estimate: 0.5 day
- Files:
  - `apps/mobile/src/hooks/useWalletData.(js|ts)`
- Acceptance criteria:
  - one refresh fetches both portfolio and transactions
  - warnings from API are preserved
  - downstream UI can refresh from one shared hook

## Epic 4: Home Tab Live Data

Owner:
- Mobile app owner

Priority:
- P0

Dependencies:
- Epic 3 complete

Tickets:

1. Replace HeroCard hardcoded values with portfolio data
- Owner: Mobile app owner
- Estimate: 0.5 day
- Files:
  - [apps/mobile/src/components/home/HeroCard.jsx](/home/mafita/amara/apps/mobile/src/components/home/HeroCard.jsx)
- Acceptance criteria:
  - total portfolio value is live
  - chain bar reflects live chain totals
  - no visual redesign is introduced

2. Wire Assets tab to live token balances
- Owner: Mobile app owner
- Estimate: 0.5 day
- Files:
  - [apps/mobile/src/components/home/HomeTab.jsx](/home/mafita/amara/apps/mobile/src/components/home/HomeTab.jsx)
- Acceptance criteria:
  - token rows come from wallet API, not constants
  - token names, chains, and values render correctly

3. Wire Activity tab to recent transactions
- Owner: Mobile app owner
- Estimate: 0.5 day
- Files:
  - [apps/mobile/src/components/home/HomeTab.jsx](/home/mafita/amara/apps/mobile/src/components/home/HomeTab.jsx)
- Acceptance criteria:
  - activity placeholder is replaced by real transactions
  - empty state is shown when no activity exists

4. Wire NFTs tab to wallet NFT data
- Owner: Mobile app owner
- Estimate: 0.5 day
- Files:
  - [apps/mobile/src/components/home/HomeTab.jsx](/home/mafita/amara/apps/mobile/src/components/home/HomeTab.jsx)
- Acceptance criteria:
  - NFT placeholder is replaced by real wallet NFTs
  - empty and partial-load states are handled

## Epic 5: Receive And Onramp

Owner:
- Mobile app owner
- Backend/chain owner for onramp session issues

Priority:
- P1

Dependencies:
- Epic 3 complete

Tickets:

1. Wire ReceiveSheet to real wallet address
- Owner: Mobile app owner
- Estimate: 0.25 day
- Files:
  - [apps/mobile/src/components/receive/ReceiveSheet.jsx](/home/mafita/amara/apps/mobile/src/components/receive/ReceiveSheet.jsx)
- Acceptance criteria:
  - displayed address is the real synced wallet
  - clipboard copy works
  - QR encodes the real address

2. Replace onramp simulation with real session creation
- Owner: Mobile app owner
- Estimate: 1 day
- Files:
  - [apps/mobile/src/components/onramp/OnrampSheet.jsx](/home/mafita/amara/apps/mobile/src/components/onramp/OnrampSheet.jsx)
  - [apps/mobile/src/hooks/useOnramp.js](/home/mafita/amara/apps/mobile/src/hooks/useOnramp.js)
- Acceptance criteria:
  - buy action calls `POST /api/onramp/session`
  - selected chain, asset, fiat currency, and amount map correctly
  - the resulting session opens in-app

3. Add onramp error and recovery states
- Owner: Mobile app owner
- Estimate: 0.5 day
- Acceptance criteria:
  - unsupported asset or session failure shows a real error state
  - user can retry without app restart

## Epic 6: Shared Execution Helpers

Owner:
- Mobile app owner
- Backend/chain owner for wallet/provider support issues

Priority:
- P1

Dependencies:
- Epic 2 complete
- Epic 3 complete

Tickets:

1. Add mobile action execution hook
- Owner: Mobile app owner
- Estimate: 1 day
- Files:
  - `apps/mobile/src/hooks/useExecuteAction.(js|ts)`
- Acceptance criteria:
  - accepts send, swap, and bridge action cards
  - performs simulate -> wallet submit -> execute
  - exposes pending, submitted, confirmed, and failed states

2. Add transaction monitoring hook
- Owner: Mobile app owner
- Estimate: 0.5 day
- Files:
  - `apps/mobile/src/hooks/useTransactionMonitor.(js|ts)`
- Acceptance criteria:
  - polls `GET /api/tx/status/:chainId/:txHash`
  - resolves final tx state
  - can refresh wallet state after completion

3. Add shared action-card builders
- Owner: Mobile app owner
- Estimate: 0.75 day
- Reference:
  - [packages/types/src/agent.ts](/home/mafita/amara/packages/types/src/agent.ts)
  - [apps/web/src/app/dashboard/chat/page.tsx](/home/mafita/amara/apps/web/src/app/dashboard/chat/page.tsx)
- Acceptance criteria:
  - mobile action payloads match backend expectations
  - send, swap, and bridge flows do not hand-roll incompatible payloads

4. Verify React Native wallet execution path
- Owner: Backend/chain owner
- Estimate: 0.5 day
- Acceptance criteria:
  - chain switching strategy is defined
  - signing/submission path works on mobile-supported wallet provider
  - known limitations are documented if parity is partial

## Epic 7: Send Flow

Owner:
- Mobile app owner

Priority:
- P1

Dependencies:
- Epic 6 complete

Tickets:

1. Build SendSheet input and review flow
- Owner: Mobile app owner
- Estimate: 1 day
- Files:
  - [apps/mobile/src/components/send/SendSheet.jsx](/home/mafita/amara/apps/mobile/src/components/send/SendSheet.jsx)
- Acceptance criteria:
  - token, amount, recipient, and chain can be entered
  - invalid input is blocked before preview
  - review screen uses current mobile design language

2. Connect SendSheet to simulate and execute flow
- Owner: Mobile app owner
- Estimate: 0.75 day
- Acceptance criteria:
  - send builds a valid action card
  - send calls simulate and execute successfully
  - tx status is shown through processing and success states

3. Refresh wallet activity after send completion
- Owner: Mobile app owner
- Estimate: 0.25 day
- Acceptance criteria:
  - successful send appears in activity after completion
  - failure does not leave stale optimistic data

## Epic 8: Swap Flow

Owner:
- Mobile app owner
- Backend/chain owner for quote/provider issues

Priority:
- P2

Dependencies:
- Epic 6 complete

Tickets:

1. Replace local swap math with real quote-backed data
- Owner: Mobile app owner
- Estimate: 1 day
- Files:
  - [apps/mobile/src/components/swap/SwapSheet.jsx](/home/mafita/amara/apps/mobile/src/components/swap/SwapSheet.jsx)
  - [packages/chain/src/lifi.ts](/home/mafita/amara/packages/chain/src/lifi.ts)
- Acceptance criteria:
  - output amount, rate, and fee reflect real route data
  - unsupported token pairs show a real error state

2. Connect SwapSheet to execution pipeline
- Owner: Mobile app owner
- Estimate: 0.75 day
- Acceptance criteria:
  - swap uses shared action execution hook
  - status transitions are real, not timers
  - success result includes the real tx hash

3. Validate mobile wallet compatibility for swap execution
- Owner: Backend/chain owner
- Estimate: 0.5 day
- Acceptance criteria:
  - provider path supports swap execution on target chains
  - known incompatibilities are documented if any

## Epic 9: Bridge Flow

Owner:
- Mobile app owner
- Backend/chain owner

Priority:
- P2

Dependencies:
- Epic 6 complete

Tickets:

1. Replace bridge simulation UI data with real route data
- Owner: Mobile app owner
- Estimate: 1 day
- Files:
  - [apps/mobile/src/components/bridge/BridgeSheet.jsx](/home/mafita/amara/apps/mobile/src/components/bridge/BridgeSheet.jsx)
- Acceptance criteria:
  - fee, receive amount, ETA, and protocol come from real route data
  - same-chain and unsupported bridge cases are blocked correctly

2. Connect BridgeSheet to execution pipeline
- Owner: Mobile app owner
- Estimate: 0.75 day
- Acceptance criteria:
  - bridge uses shared action execution hook
  - tx lifecycle is real, not simulated

3. Enforce bridge feature flags and degradation states
- Owner: Mobile app owner + Backend/chain owner
- Estimate: 0.5 day
- Acceptance criteria:
  - bridge-disabled state reflects backend truth
  - user sees a clear restricted/degraded state

## Epic 10: Agent And Strategy Controls

Owner:
- Mobile app owner
- Backend/chain owner for preview issues

Priority:
- P2

Dependencies:
- Epic 3 complete

Tickets:

1. Replace AgentTab summary stats with live status and brief data
- Owner: Mobile app owner
- Estimate: 0.5 day
- Files:
  - [apps/mobile/src/components/agent/AgentTab.jsx](/home/mafita/amara/apps/mobile/src/components/agent/AgentTab.jsx)
- Acceptance criteria:
  - actions, gains, and errors reflect backend data
  - loading and error states are supported

2. Wire strategy list and toggle actions
- Owner: Mobile app owner
- Estimate: 0.75 day
- Acceptance criteria:
  - toggles load real strategy state
  - toggle changes persist after app reload

3. Add strategy settings fetch and save support
- Owner: Mobile app owner
- Estimate: 0.5 day
- Acceptance criteria:
  - strategy settings are fetched from backend
  - save requests hit `/api/strategy/settings`

4. Add preview support for actionable strategy flows
- Owner: Mobile app owner
- Estimate: 0.75 day
- Acceptance criteria:
  - preview-enabled strategies can request real previews
  - preview responses are rendered without redesigning the tab

## Epic 11: Settings Tab Wiring

Owner:
- Mobile app owner

Priority:
- P3

Dependencies:
- Epic 3 complete
- Epic 10 partially complete

Tickets:

1. Replace hardcoded wallet and network rows with live session data
- Owner: Mobile app owner
- Estimate: 0.5 day
- Files:
  - [apps/mobile/src/components/settings/SettingsTab.jsx](/home/mafita/amara/apps/mobile/src/components/settings/SettingsTab.jsx)
- Acceptance criteria:
  - wallet address reflects current session
  - network rows reflect actual chain/provider state

2. Wire editable agent safety rows to backend settings
- Owner: Mobile app owner
- Estimate: 0.75 day
- Acceptance criteria:
  - editable settings load from backend
  - save actions persist
  - unsupported rows are clearly non-editable

## QA Board

Owner:
- QA/product
- Mobile app owner for fixes

Priority:
- P0 alongside implementation

Tickets:

1. Create mobile regression checklist
- Owner: QA/product
- Estimate: 0.5 day
- Acceptance criteria:
  - checklist covers auth, home data, receive, onramp, send, swap, bridge, agent, and settings

2. Run P0 regression after Epics 1 to 4
- Owner: QA/product
- Estimate: 0.5 day
- Acceptance criteria:
  - app boot, login, sync, and home refresh pass on target devices

3. Run action-flow regression after Epics 5 to 9
- Owner: QA/product
- Estimate: 1 day
- Acceptance criteria:
  - receive, onramp, send, swap, and bridge are validated
  - failures are logged by owner and severity

4. Run final mobile parity sweep
- Owner: QA/product + tech lead
- Estimate: 0.5 day
- Acceptance criteria:
  - mobile reflects the intended MVP capabilities without fake state
  - known gaps are documented explicitly

## Suggested Sprint Sequence

Sprint 1:
1. Epic 1: Mobile Runtime And App Shell
2. Epic 2: Auth And Session Parity
3. Epic 3: Shared Mobile Data Layer
4. Epic 4: Home Tab Live Data

Sprint 2:
1. Epic 5: Receive And Onramp
2. Epic 6: Shared Execution Helpers
3. Epic 7: Send Flow

Sprint 3:
1. Epic 8: Swap Flow
2. Epic 9: Bridge Flow
3. Epic 10: Agent And Strategy Controls
4. Epic 11: Settings Tab Wiring

## Critical Path

The critical path is:

1. mobile boot correctness
2. auth/session
3. shared store and API client
4. wallet refresh pipeline
5. shared execution helpers
6. send and swap execution

If this path slips, parity slips.

## Exit Criteria

Call the mobile wiring effort ready for product validation when:

- mobile boots cleanly from one supported entrypoint
- authenticated mobile sessions can sync to backend
- Home shows live wallet data
- Receive and onramp are functional
- Send uses real preview and execution
- Swap uses real quote-backed execution
- Bridge either works or is honestly feature-flagged off
- Agent and strategy controls reflect backend state
- Settings no longer depend on hardcoded values for supported rows
- fake tx hashes and timer-only success states are removed from primary flows
