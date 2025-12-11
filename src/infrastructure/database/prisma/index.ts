/**
 * Prisma Database Exports
 */
export { prisma, default as prismaClient } from "./client";
// Các type này được export ra từ @prisma/client vì khi migrate (chạy migrate của Prisma),
// nó sẽ sinh ra các type tương ứng với các bảng (model) trong schema.prisma.
// Điều này cho phép dùng type an toàn, nhất quán ở các tầng khác mà không cần tự định nghĩa lại.
//
// Việc export này giúp các nơi khác trong codebase có thể import các type thực thể (User, Question, Answer, ...)
export type {
  User,
  Question,
  Answer,
  Comment,
  Vote,
  Category,
  Tag,
  QuestionTag,
  Notification,
  QuestionView,
  UserRole,
  QuestionStatus,
  VoteType,
} from "@prisma/client";
