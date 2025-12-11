import { create } from "zustand";

export interface Question {
  id: string;
  title: string;
  content: string;
  preview?: string; // Preview text extracted from content
  images?: string[]; // Array of image URLs from content
  status: string;
  approvalStatus?: string; // PENDING, APPROVED, REJECTED
  isAnonymous?: boolean; // Đặt câu hỏi ẩn danh
  author: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  categories?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  tags?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  views: number;
  answersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionDetail extends Question {
  tags?: any[];
  votesCount?: number;
  commentsCount?: number;
  acceptedAnswerId?: string | null;
  duplicateOfId?: string | null;
  answers?: Answer[];
  approvalStatus?: string; // PENDING, APPROVED, REJECTED
  rejectionReason?: string | null; // Lý do từ chối (nếu bị reject)
  isAnonymous?: boolean; // Đặt câu hỏi ẩn danh
  categories?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export interface Answer {
  id: string;
  content: string;
  isPinned: boolean;
  isTopVoted?: boolean;
  editCount?: number;
  originalContent?: string | null;
  editedAt?: string | null;
  author: {
    id: string;
    fullName: string;
    role?: string;
  };
  createdAt: string;
  votesCount: number;
}

interface QuestionsState {
  questions: Question[];
  questionDetail: QuestionDetail | null;
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;
  filters: {
    status?: string;
    categoryId?: string;
    authorId?: string;
    approvalStatus?: string; // PENDING, APPROVED, REJECTED
  };
  setFilters: (filters: Partial<QuestionsState["filters"]>) => void;
  fetchQuestions: () => Promise<void>;
  searchQuestions: (query: string, tags?: string[]) => Promise<void>;
  fetchQuestionDetail: (
    id: string,
    options?: { silent?: boolean }
  ) => Promise<void>;
  voteAnswer: (questionId: string, answerId: string) => Promise<void>;
  addQuestion: (question: Question) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  addAnswerToQuestion: (questionId: string, answer: Answer) => void;
  replaceAnswer: (questionId: string, tempId: string, answer: Answer) => void;
  removeAnswer: (questionId: string, answerId: string) => void;
  updateAnswer: (
    questionId: string,
    answerId: string,
    updates: Partial<Answer>
  ) => void;
  clearQuestions: () => void;
  clearQuestionDetail: () => void;
}

export const useQuestionsStore = create<QuestionsState>((set, get) => ({
  questions: [],
  questionDetail: null,
  isLoading: false,
  isLoadingDetail: false,
  error: null,
  filters: {},

  setFilters: (newFilters) => {
    set((state) => {
      // Merge new filters with existing ones
      const merged = { ...state.filters, ...newFilters };
      // Remove any filters that are explicitly set to undefined
      const cleaned: any = {};
      Object.keys(merged).forEach((key) => {
        if (merged[key as keyof typeof merged] !== undefined) {
          cleaned[key] = merged[key as keyof typeof merged];
        }
      });
      return { filters: cleaned };
    });
  },

  fetchQuestions: async () => {
    const { filters } = get();
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.categoryId) params.append("categoryId", filters.categoryId);
      if (filters.authorId) params.append("authorId", filters.authorId);
      if (filters.approvalStatus)
        params.append("approvalStatus", filters.approvalStatus);

      const response = await fetch(`/api/questions?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch questions");

      const data = await response.json();
      set({
        questions: data.questions || [],
        isLoading: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch questions",
        isLoading: false,
      });
    }
  },

  searchQuestions: async (query: string, tags?: string[]) => {
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      if (tags && tags.length > 0) params.append("tags", tags.join(","));

      // Apply current filters
      const { filters } = get();
      if (filters.status) params.append("status", filters.status);
      if (filters.categoryId) params.append("categoryId", filters.categoryId);
      if (filters.authorId) params.append("authorId", filters.authorId);
      if (filters.approvalStatus)
        params.append("approvalStatus", filters.approvalStatus);

      const response = await fetch(
        `/api/questions/search?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to search questions");

      const data = await response.json();
      set({
        questions: data.questions || [],
        isLoading: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to search questions",
        isLoading: false,
      });
    }
  },

  fetchQuestionDetail: async (id: string, options?: { silent?: boolean }) => {
    // Check if we already have this question in cache
    const { questions, questionDetail } = get();
    const cachedQuestion = questions.find((q) => q.id === id);

    if (cachedQuestion && questionDetail?.id === id) {
      return; // Already loaded
    }

    if (!options?.silent) {
      set({ isLoadingDetail: true, error: null });
    }

    try {
      const response = await fetch(`/api/questions/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Không tìm thấy câu hỏi");
        }
        throw new Error("Failed to fetch question");
      }

      const data = await response.json();
      const cleanedAnswers = (data.question.answers || []).filter(
        (a: Answer) => !a.id?.startsWith("temp-")
      );
      set((state) => ({
        questionDetail: { ...data.question, answers: cleanedAnswers },
        isLoadingDetail: options?.silent ? state.isLoadingDetail : false,
      }));
    } catch (error) {
      set((state) => ({
        error:
          error instanceof Error ? error.message : "Failed to fetch question",
        isLoadingDetail: options?.silent ? state.isLoadingDetail : false,
      }));
    }
  },

  voteAnswer: async (questionId: string, answerId: string) => {
    set((state) => {
      if (state.questionDetail?.id !== questionId) return state;
      const answers = state.questionDetail.answers || [];
      const updatedAnswers = answers.map((a) =>
        a.id === answerId
          ? { ...a, votesCount: (a.votesCount || 0) + 1 } // optimistic +1; will reconcile after API
          : a
      );
      return {
        ...state,
        questionDetail: {
          ...state.questionDetail,
          answers: updatedAnswers,
        },
      };
    });

    try {
      const res = await fetch(
        `/api/questions/${questionId}/answers/${answerId}/vote`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Vote failed");
      const data = await res.json();

      set((state) => {
        if (state.questionDetail?.id !== questionId) return state;
        const answers = state.questionDetail.answers || [];
        const updatedAnswers = answers.map((a) => {
          if (a.id !== answerId) return a;
          return { ...a, votesCount: data.votesCount };
        });
        // recompute top-voted
        const maxVotes = Math.max(
          0,
          ...updatedAnswers.map((a) => a.votesCount || 0)
        );
        const normalized = updatedAnswers.map((a) => ({
          ...a,
          isTopVoted: (a.votesCount || 0) > 0 && (a.votesCount || 0) === maxVotes,
        }));

        return {
          ...state,
          questionDetail: {
            ...state.questionDetail,
            answers: normalized,
          },
        };
      });
    } catch (error) {
      // rollback optimistic +1 by refetching or decrement
      set((state) => {
        if (state.questionDetail?.id !== questionId) return state;
        const answers = state.questionDetail.answers || [];
        const rolled = answers.map((a) =>
          a.id === answerId
            ? { ...a, votesCount: Math.max(0, (a.votesCount || 1) - 1) }
            : a
        );
        // recompute top-voted
        const maxVotes = Math.max(0, ...rolled.map((a) => a.votesCount || 0));
        const normalized = rolled.map((a) => ({
          ...a,
          isTopVoted: (a.votesCount || 0) > 0 && (a.votesCount || 0) === maxVotes,
        }));
        return {
          ...state,
          questionDetail: {
            ...state.questionDetail,
            answers: normalized,
          },
        };
      });
      throw error;
    }
  },

  addQuestion: (question: Question) => {
    set((state) => ({
      questions: [question, ...state.questions],
    }));
  },

  updateQuestion: (id: string, updates: Partial<Question>) => {
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, ...updates } : q
      ),
      questionDetail:
        state.questionDetail?.id === id
          ? { ...state.questionDetail, ...updates }
          : state.questionDetail,
    }));
  },

  addAnswerToQuestion: (questionId: string, answer: Answer) => {
    set((state) => {
      // Avoid duplicates by id
      if (
        state.questionDetail?.id === questionId &&
        state.questionDetail.answers?.some((a) => a.id === answer.id)
      ) {
        return state;
      }

      // Update list answersCount if present
      const updatedQuestions = state.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answersCount: (q.answersCount || 0) + 1,
            }
          : q
      );

      // Update detail answers list
      let updatedDetail = state.questionDetail;
      if (state.questionDetail?.id === questionId) {
        const prevAnswers = state.questionDetail.answers || [];
        updatedDetail = {
          ...state.questionDetail,
          answers: [...prevAnswers, answer],
          answersCount:
            (state.questionDetail.answersCount || prevAnswers.length) + 1,
        };
      }

      return {
        questions: updatedQuestions,
        questionDetail: updatedDetail,
      };
    });
  },

  replaceAnswer: (questionId: string, tempId: string, answer: Answer) => {
    set((state) => {
      if (state.questionDetail?.id !== questionId) return state;
      const prevAnswers = state.questionDetail.answers || [];
      const existsFinal = prevAnswers.some((a) => a.id === answer.id);
      const replaced = prevAnswers.map((a) => (a.id === tempId ? answer : a));
      const hadTemp = prevAnswers.some((a) => a.id === tempId);
      const finalAnswers = hadTemp
        ? replaced // temp replaced by real
        : existsFinal
        ? replaced // already had real, just keep replaced
        : [...replaced, answer]; // append if neither temp nor real existed

      return {
        ...state,
        questionDetail: {
          ...state.questionDetail,
          answers: finalAnswers,
        },
      };
    });
  },

  removeAnswer: (questionId: string, answerId: string) => {
    set((state) => {
      if (state.questionDetail?.id !== questionId) return state;
      const filtered =
        state.questionDetail.answers?.filter((a) => a.id !== answerId) || [];
      return {
        ...state,
        questionDetail: {
          ...state.questionDetail,
          answers: filtered,
          answersCount: Math.max(
            0,
            (state.questionDetail.answersCount || 0) - 1
          ),
        },
      };
    });
  },

  updateAnswer: (
    questionId: string,
    answerId: string,
    updates: Partial<Answer>
  ) => {
    set((state) => {
      if (state.questionDetail?.id !== questionId) return state;
      const updatedAnswers =
        state.questionDetail.answers?.map((a) => {
          if (a.id !== answerId) return a;

          // Only update fields that are explicitly provided and not null/undefined
          // This preserves existing data like originalContent, editCount, editedAt
          const cleanUpdates: Partial<Answer> = {};
          if (updates.content !== undefined)
            cleanUpdates.content = updates.content;
          if (updates.editCount !== undefined && updates.editCount !== null) {
            cleanUpdates.editCount = updates.editCount;
          }
          if (updates.editedAt !== undefined) {
            cleanUpdates.editedAt = updates.editedAt;
          }
          // Only update originalContent if it's explicitly provided and not null
          // This prevents overwriting existing originalContent with null/undefined
          if (
            updates.originalContent !== undefined &&
            updates.originalContent !== null
          ) {
            cleanUpdates.originalContent = updates.originalContent;
          } else if (updates.originalContent === null && !a.originalContent) {
            // Only set to null if it was explicitly null and answer doesn't have originalContent yet
            cleanUpdates.originalContent = null;
          }
          // Preserve other fields
          if (updates.isPinned !== undefined)
            cleanUpdates.isPinned = updates.isPinned;
          if (updates.votesCount !== undefined)
            cleanUpdates.votesCount = updates.votesCount;
          if (updates.createdAt !== undefined)
            cleanUpdates.createdAt = updates.createdAt;
          if (updates.author !== undefined)
            cleanUpdates.author = updates.author;

          return { ...a, ...cleanUpdates };
        }) || [];
      return {
        ...state,
        questionDetail: {
          ...state.questionDetail,
          answers: updatedAnswers,
        },
      };
    });
  },

  clearQuestions: () => {
    set({ questions: [], error: null });
  },

  clearQuestionDetail: () => {
    set({ questionDetail: null, error: null });
  },
}));
