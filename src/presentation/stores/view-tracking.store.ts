import { create } from "zustand";

interface ViewTrackingState {
  _pendingViews: Set<string>; // Track pending view requests to prevent duplicates
  incrementView: (questionId: string) => Promise<void>;
}

export const useViewTrackingStore = create<ViewTrackingState>()((set, get) => ({
  _pendingViews: new Set<string>(),

  incrementView: async (questionId: string) => {
    const { _pendingViews } = get();

    // Check if already pending
    if (_pendingViews.has(questionId)) {
      return;
    }

    // Use a lock to prevent concurrent requests
    const lockKey = `question_viewing_${questionId}`;
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem(lockKey) === "true") {
        return; // Another request is in progress
      }
      sessionStorage.setItem(lockKey, "true");
    }

    try {
      // Mark as pending
      const newPending = new Set(_pendingViews);
      newPending.add(questionId);
      set({ _pendingViews: newPending });

      // Call API - backend will check if user has already viewed
      await fetch(`/api/questions/${questionId}/view`, {
        method: "POST",
        credentials: "include", // Ensure cookies are sent
      });
    } catch (error) {
      console.error("Error incrementing view:", error);
      // Don't remove from pending on error - let backend handle it
    } finally {
      // Remove lock
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(lockKey);
      }

      // Remove from pending after request completes
      const currentPending = get()._pendingViews;
      const newPending = new Set(currentPending);
      newPending.delete(questionId);
      set({ _pendingViews: newPending });
    }
  },
}));
