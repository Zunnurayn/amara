import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type {
  AgentMessage,
  AgentState,
  TokenBalance,
  Transaction,
  WalletChainSummary,
  WalletNftSummary,
} from '@anara/types'

export interface BriefSummary {
  summary: string
  totalProfitUsd: string
  actionsCount: number
  errorsCount: number
  events: { type: string; description: string; timeAgo: string; profitUsd: string | null }[]
  generatedAt?: number
}

// ── Wallet Store ──
interface WalletStore {
  address:      string | null
  hasWallet:    boolean
  chainId:      number
  totalUsd:     string
  tokens:       TokenBalance[]
  nfts:         WalletNftSummary[]
  chains:       WalletChainSummary[]
  transactions: Transaction[]
  isLoading:    boolean
  error:        string | null
  lastUpdated:  number | null
  setAddress:   (address: string | null) => void
  setHasWallet: (hasWallet: boolean) => void
  setChainId:   (chainId: number) => void
  setPortfolio: (data: {
    totalUsd: string
    tokens: TokenBalance[]
    nfts?: WalletNftSummary[]
    chains?: WalletChainSummary[]
    lastUpdated?: number
  }) => void
  setTransactions: (transactions: Transaction[]) => void
  setLoading:   (loading: boolean) => void
  setError:     (error: string | null) => void
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      address:      null,
      hasWallet:    false,
      chainId:      8453,
      totalUsd:     '$0.00',
      tokens:       [],
      nfts:         [],
      chains:       [],
      transactions: [],
      isLoading:    false,
      error:        null,
      lastUpdated:  null,
      setAddress:   (address) => set({ address }),
      setHasWallet: (hasWallet) => set({ hasWallet }),
      setChainId:   (chainId) => set({ chainId }),
      setPortfolio: (data)    => set({ ...data, lastUpdated: data.lastUpdated ?? Date.now(), error: null }),
      setTransactions: (transactions) => set({ transactions, lastUpdated: Date.now(), error: null }),
      setLoading:   (loading) => set({ isLoading: loading }),
      setError:     (error) => set({ error }),
    }),
    {
      name: 'anara-wallet',
      storage: createJSONStorage(() => safeLocalStorage),
    }
  )
)

// ── Agent Store ──
interface AgentStore {
  sessionId:    string
  messages:     AgentMessage[]
  state:        AgentState
  brief:        BriefSummary | null
  isThinking:   boolean
  chatOpen:     boolean
  addMessage:   (msg: AgentMessage) => void
  updateMessage: (id: string, updater: (msg: AgentMessage) => AgentMessage) => void
  setThinking:  (thinking: boolean) => void
  setChatOpen:  (open: boolean) => void
  setBrief:     (brief: BriefSummary | null) => void
  updateState:  (state: Partial<AgentState>) => void
  clearChat:    () => void
}

const DEFAULT_AGENT_STATE: AgentState = {
  isRunning:    true,
  lastActivity: Date.now(),
  actionsToday: 0,
  errorsToday:  0,
  profitToday:  '$0.00',
  recentActions:[],
}

export const useAgentStore = create<AgentStore>()((set) => ({
  sessionId:   `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  messages:    [],
  state:       DEFAULT_AGENT_STATE,
  brief:       null,
  isThinking:  false,
  chatOpen:    false,
  addMessage:  (msg)   => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, updater) => set((s) => ({
    messages: s.messages.map((msg) => (msg.id === id ? updater(msg) : msg)),
  })),
  setThinking: (v)     => set({ isThinking: v }),
  setChatOpen: (v)     => set({ chatOpen: v }),
  setBrief:    (brief) => set({ brief }),
  updateState: (state) => set((s) => ({ state: { ...s.state, ...state } })),
  clearChat:   ()      => set({
    messages: [],
    sessionId: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  }),
}))

// ── UI Store ──
interface UIStore {
  activeSheet: 'send' | 'receive' | 'swap' | 'bridge' | null
  activeTab:   'home' | 'agent' | 'settings'
  openSheet:   (sheet: UIStore['activeSheet']) => void
  closeSheet:  () => void
  setTab:      (tab: UIStore['activeTab']) => void
}

export const useUIStore = create<UIStore>()((set) => ({
  activeSheet: null,
  activeTab:   'home',
  openSheet:   (sheet) => set({ activeSheet: sheet }),
  closeSheet:  ()      => set({ activeSheet: null }),
  setTab:      (tab)   => set({ activeTab: tab }),
}))

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

const safeLocalStorage: StateStorage =
  typeof window === 'undefined' ? noopStorage : window.localStorage
