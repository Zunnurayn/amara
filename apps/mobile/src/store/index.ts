import { create } from 'zustand'
import type { AgentMessage, AgentState, TokenBalance, Transaction } from '@anara/types'

// ── Wallet Store ──
interface WalletStore {
  address:      string | null
  chainId:      number
  totalUsd:     string
  tokens:       TokenBalance[]
  transactions: Transaction[]
  setAddress:   (a: string | null) => void
  setChainId:   (id: number) => void
  setPortfolio: (d: { totalUsd: string; tokens: TokenBalance[] }) => void
  setTransactions: (transactions: Transaction[]) => void
}

export const useWalletStore = create<WalletStore>()((set) => ({
  address:      null,
  chainId:      8453,
  totalUsd:     '$0.00',
  tokens:       [],
  transactions: [],
  setAddress:   (address)  => set({ address }),
  setChainId:   (chainId)  => set({ chainId }),
  setPortfolio: (data)     => set(data),
  setTransactions: (transactions) => set({ transactions }),
}))

// ── Agent Store ──
interface AgentStore {
  sessionId:   string
  messages:    AgentMessage[]
  state:       AgentState
  isThinking:  boolean
  addMessage:  (msg: AgentMessage) => void
  updateMessage: (id: string, updater: (msg: AgentMessage) => AgentMessage) => void
  setThinking: (v: boolean) => void
  updateState: (s: Partial<AgentState>) => void
  clearChat:   () => void
}

const DEFAULT_STATE: AgentState = {
  isRunning: true, lastActivity: Date.now(),
  actionsToday: 0, errorsToday: 0, profitToday: '$0.00', recentActions: [],
}

export const useAgentStore = create<AgentStore>()((set) => ({
  sessionId:   `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  messages:    [],
  state:       DEFAULT_STATE,
  isThinking:  false,
  addMessage:  (msg)   => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, updater) => set((s) => ({
    messages: s.messages.map((msg) => (msg.id === id ? updater(msg) : msg)),
  })),
  setThinking: (v)     => set({ isThinking: v }),
  updateState: (state) => set((s) => ({ state: { ...s.state, ...state } })),
  clearChat:   ()      => set({ messages: [] }),
}))
