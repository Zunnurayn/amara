import { create } from 'zustand';

export const useStrategyStore = create((set) => ({
  strategies: [],
  settings: null,
  isLoading: false,
  error: null,
  setStrategies: (strategies) => set({ strategies }),
  setSettings: (settings) => set({ settings }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
