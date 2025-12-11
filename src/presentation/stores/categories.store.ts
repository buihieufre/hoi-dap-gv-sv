import { create } from "zustand";

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  type?: "SYSTEM" | "ACADEMIC";
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  authorId?: string | null;
  author?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface CategoriesState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  fetchCategories: (options?: {
    force?: boolean;
    includePending?: boolean;
    approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  }) => Promise<void>;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  clearCategories: () => void;
}

export const useCategoriesStore = create<CategoriesState>((set) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async (options?: {
    force?: boolean;
    includePending?: boolean;
    approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  }) => {
    // If already loaded and not forcing, don't fetch again
    const { categories } = useCategoriesStore.getState();
    if (categories.length > 0 && !options?.force) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (options?.includePending) {
        params.append("includePending", "true");
      }
      if (options?.approvalStatus) {
        params.append("approvalStatus", options.approvalStatus);
      }
      
      const url = params.toString()
        ? `/api/categories?${params.toString()}`
        : "/api/categories";
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch categories");

      const data = await response.json();
      set({
        categories: data.categories || [],
        isLoading: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch categories",
        isLoading: false,
      });
    }
  },

  addCategory: (category: Category) => {
    set((state) => ({
      categories: [...state.categories, category],
    }));
  },

  updateCategory: (id: string, updates: Partial<Category>) => {
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  deleteCategory: (id: string) => {
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }));
  },

  clearCategories: () => {
    set({ categories: [], error: null });
  },
}));
