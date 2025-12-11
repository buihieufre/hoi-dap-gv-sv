/**
 * Category Repository Implementation (Prisma)
 */

import { prisma } from "@/infrastructure/database/prisma";
import {
  ICategoryRepository,
  Category,
} from "@/domain/repositories/category.repository";

export class CategoryRepository implements ICategoryRepository {
  async findById(id: string): Promise<Category | null> {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });
    if (!category) return null;
    return this.toDomain(category);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });
    if (!category) return null;
    return this.toDomain(category);
  }

  async findAll(): Promise<Category[]> {
    const categories = await prisma.category.findMany({
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return categories.map((c) => this.toDomain(c));
  }

  async create(
    categoryData: Omit<Category, "id" | "createdAt" | "updatedAt"> & {
      type?: "SYSTEM" | "ACADEMIC";
      approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
      authorId?: string | null;
      parentId?: string | null;
    }
  ): Promise<Category> {
    // Extract type and approvalStatus explicitly
    const type = (categoryData as any).type;
    const approvalStatus = (categoryData as any).approvalStatus;
    const authorId = (categoryData as any).authorId;
    const parentId = (categoryData as any).parentId;

    const category = await prisma.category.create({
      data: {
        name: categoryData.name,
        description: categoryData.description || null,
        slug: categoryData.slug,
        type: type || "SYSTEM",
        approvalStatus: approvalStatus || "APPROVED",
        authorId: authorId !== undefined ? authorId : null,
        parentId: parentId !== undefined ? parentId : null,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
    return this.toDomain(category);
  }

  async update(
    id: string,
    data: Partial<Category> & {
      approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
    }
  ): Promise<Category> {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.slug) updateData.slug = data.slug;
    if ((data as any).approvalStatus)
      updateData.approvalStatus = (data as any).approvalStatus;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });
    return this.toDomain(category);
  }

  async delete(id: string): Promise<void> {
    await prisma.category.delete({ where: { id } });
  }

  private toDomain(prismaCategory: any): Category {
    return {
      id: prismaCategory.id,
      name: prismaCategory.name,
      description: prismaCategory.description,
      slug: prismaCategory.slug,
      createdAt: prismaCategory.createdAt,
      updatedAt: prismaCategory.updatedAt,
      // Include new fields for API responses
      type: prismaCategory.type || "SYSTEM",
      approvalStatus: prismaCategory.approvalStatus || "APPROVED",
      authorId: prismaCategory.authorId || null,
      author: prismaCategory.author || null,
      parentId: prismaCategory.parentId || null,
      _count: prismaCategory._count,
    } as any;
  }
}
