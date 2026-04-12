import { create } from 'zustand';

export const useAgentStore = create((set) => ({
  status: null,
  brief: null,
  messages: [],
  isThinking: false,
  setStatus: (status) => set({ status }),
  setBrief: (brief) => set({ brief }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setThinking: (isThinking) => set({ isThinking }),
  clear: () => set({ status: null, brief: null, messages: [], isThinking: false }),
}));
