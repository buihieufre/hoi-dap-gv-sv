/**
 * Category Repository Interface
 */

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  type?: "SYSTEM" | "ACADEMIC";
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  authorId?: string | null;
  parentId?: string | null;
  author?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  _count?: {
    questions?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICategoryRepository {
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  findAll(): Promise<Category[]>;
  create(
    category: Omit<Category, "id" | "createdAt" | "updatedAt">
  ): Promise<Category>;
  update(id: string, data: Partial<Category>): Promise<Category>;
  delete(id: string): Promise<void>;
}
