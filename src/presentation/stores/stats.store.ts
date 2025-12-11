import { create } from "zustand";

interface Stats {
  myQuestions: number;
  answeredQuestions: number;
  openQuestions: number;
  totalQuestions: number;
  myAnswers: number;
  unansweredQuestions: number;
}

interface StatsState {
  stats: Stats | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchStats: (force?: boolean) => Promise<void>;
  clearStats: () => void;
}

const CACHE_DURATION = 30000; // 30 seconds

export const useStatsStore = create<StatsState>((set, get) => ({
  stats: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchStats: async (force = false) => {
    const { stats, lastFetched } = get();

    // Return cached data if still valid and not forced
    if (!force && stats && lastFetched) {
      const now = Date.now();
      if (now - lastFetched < CACHE_DURATION) {
        return;
      }
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");

      const data = await response.json();
      set({
        stats: data,
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch stats",
        isLoading: false,
      });
    }
  },

  clearStats: () => {
    set({ stats: null, lastFetched: null, error: null });
  },
}));
