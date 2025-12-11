/**
 * User Repository Implementation (Prisma)
 */

import { prisma } from "@/infrastructure/database/prisma";
import { IUserRepository } from "@/domain/repositories/user.repository";
import { User } from "@/domain/models/user.model";

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? this.toDomain(user) : null;
  }

  async findByStudentId(studentId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { studentId } });
    return user ? this.toDomain(user) : null;
  }

  async findByAdvisorId(advisorId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { advisorId } });
    return user ? this.toDomain(user) : null;
  }

  async findAll(): Promise<User[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    return users.map((user) => this.toDomain(user));
  }

  async create(
    userData: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<User> {
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        role: userData.role,
        studentId: userData.studentId || null,
        advisorId: userData.advisorId || null,
      },
    });
    return this.toDomain(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.password && { password: data.password }),
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.role && { role: data.role }),
        ...(data.studentId !== undefined && { studentId: data.studentId }),
        ...(data.advisorId !== undefined && { advisorId: data.advisorId }),
      },
    });
    return this.toDomain(user);
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  private toDomain(prismaUser: any): User {
    return new User(
      prismaUser.id,
      prismaUser.email,
      prismaUser.password,
      prismaUser.fullName,
      prismaUser.role,
      prismaUser.studentId,
      prismaUser.advisorId,
      prismaUser.createdAt,
      prismaUser.updatedAt
    );
  }
}
