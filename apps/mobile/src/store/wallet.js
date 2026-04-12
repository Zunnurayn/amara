import { create } from 'zustand';

export const useWalletStore = create((set) => ({
  address: null,
  hasWallet: false,
  chainId: 8453,
  totalUsd: '$0.00',
  change24h: '+$0.00',
  tokens: [],
  nfts: [],
  chains: [],
  transactions: [],
  onrampAttempts: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
  setIdentity: ({ address, hasWallet }) => set({ address, hasWallet }),
  setPortfolio: (data) => set({
    totalUsd: data.totalUsd ?? '$0.00',
    change24h: data.change24h ?? '+$0.00',
    tokens: data.tokens ?? [],
    nfts: data.nfts ?? [],
    chains: data.chains ?? [],
    lastUpdated: data.lastUpdated ?? Date.now(),
    error: null,
  }),
  setTransactions: (transactions) => set({
    transactions: transactions ?? [],
    lastUpdated: Date.now(),
  }),
  addOnrampAttempt: (attempt) => set((state) => ({
    onrampAttempts: [attempt, ...state.onrampAttempts].slice(0, 12),
  })),
  updateOnrampAttempt: (id, patch) => set((state) => ({
    onrampAttempts: state.onrampAttempts.map((attempt) => (
      attempt.id === id ? { ...attempt, ...patch } : attempt
    )),
  })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
