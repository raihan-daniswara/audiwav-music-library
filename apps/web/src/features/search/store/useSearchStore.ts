import { create } from 'zustand';

interface SearchState {
  query: string;
  setQuery: (val: string) => void;
  clearQuery: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  setQuery: (val) => set({ query: val }),
  clearQuery: () => set({ query: "" }),
}));
