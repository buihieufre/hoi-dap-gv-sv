import "dotenv/config";
import { prisma } from "../src/infrastructure/database/prisma";
import { generateSlug } from "../src/shared/utils/slug";

async function seedCategories() {
  // SYSTEM categories (auto-approved)
  const systemCategories = [
    {
      name: "Học vụ",
      slug: "hoc-vu",
      description: "Các câu hỏi về học vụ, quy chế, quy định",
      type: "SYSTEM" as const,
      approvalStatus: "APPROVED" as const,
    },
    {
      name: "Đăng ký môn học",
      slug: "dang-ky-mon-hoc",
      description: "Câu hỏi về đăng ký môn học, lịch học, thời khóa biểu",
      type: "SYSTEM" as const,
      approvalStatus: "APPROVED" as const,
    },
    {
      name: "Đồ án",
      slug: "do-an",
      description: "Câu hỏi về đồ án, luận văn, nghiên cứu",
      type: "SYSTEM" as const,
      approvalStatus: "APPROVED" as const,
    },
    {
      name: "Thực tập",
      slug: "thuc-tap",
      description: "Câu hỏi về thực tập, kiến tập",
      type: "SYSTEM" as const,
      approvalStatus: "APPROVED" as const,
    },
    {
      name: "Tốt nghiệp",
      slug: "tot-nghiep",
      description: "Câu hỏi về tốt nghiệp, bảo vệ đồ án",
      type: "SYSTEM" as const,
      approvalStatus: "APPROVED" as const,
    },
    {
      name: "Khác",
      slug: "khac",
      description: "Các câu hỏi khác",
      type: "SYSTEM" as const,
      approvalStatus: "APPROVED" as const,
    },
  ];

  // ACADEMIC categories (auto-approved for seed)
  const academicCategories = [
    {
      name: "Web Development",
      slug: "web-development",
      description: "Câu hỏi về phát triển web, frontend, backend, full-stack",
      type: "ACADEMIC" as const,
      approvalStatus: "APPROVED" as const,
    },
    {
      name: "Database",
      slug: "database",
      description: "Câu hỏi về cơ sở dữ liệu, SQL, NoSQL, database design",
      type: "ACADEMIC" as const,
      approvalStatus: "APPROVED" as const,
    },
    {
      name: "Breadth-First-Search",
      slug: "breadth-first-search",
      description: "Câu hỏi về thuật toán BFS, graph traversal",
      type: "ACADEMIC" as const,
      approvalStatus: "APPROVED" as const,
    },
    {
      name: "Algorithms",
      slug: "algorithms",
      description: "Câu hỏi về thuật toán, cấu trúc dữ liệu, độ phức tạp",
      type: "ACADEMIC" as const,
      approvalStatus: "APPROVED" as const,
    },
    {
      name: "Data Structures",
      slug: "data-structures",
      description:
        "Câu hỏi về cấu trúc dữ liệu: array, linked list, tree, graph",
      type: "ACADEMIC" as const,
      approvalStatus: "APPROVED" as const,
    },
    {
      name: "Machine Learning",
      slug: "machine-learning",
      description: "Câu hỏi về machine learning, deep learning, AI",
      type: "ACADEMIC" as const,
      approvalStatus: "APPROVED" as const,
    },
    {
      name: "Networking",
      slug: "networking",
      description: "Câu hỏi về mạng máy tính, protocols, security",
      type: "ACADEMIC" as const,
      approvalStatus: "APPROVED" as const,
    },
    {
      name: "Operating Systems",
      slug: "operating-systems",
      description: "Câu hỏi về hệ điều hành, process management, memory",
      type: "ACADEMIC" as const,
      approvalStatus: "APPROVED" as const,
    },
    {
      name: "Software Engineering",
      slug: "software-engineering",
      description:
        "Câu hỏi về kỹ thuật phần mềm, design patterns, best practices",
      type: "ACADEMIC" as const,
      approvalStatus: "APPROVED" as const,
    },
    {
      name: "Mobile Development",
      slug: "mobile-development",
      description: "Câu hỏi về phát triển ứng dụng mobile, iOS, Android",
      type: "ACADEMIC" as const,
      approvalStatus: "APPROVED" as const,
    },
  ];

  const allCategories = [...systemCategories, ...academicCategories];

  console.log("🌱 Seeding categories...");
  console.log(`📋 Total categories to seed: ${allCategories.length}`);
  console.log(`   - SYSTEM: ${systemCategories.length}`);
  console.log(`   - ACADEMIC: ${academicCategories.length}\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const catData of allCategories) {
    try {
      // Check if category already exists by slug
      const existing = await prisma.category.findUnique({
        where: { slug: catData.slug },
      });

      if (existing) {
        // Update existing category to ensure it has correct type and approvalStatus
        await prisma.category.update({
          where: { id: existing.id },
          data: {
            type: catData.type,
            approvalStatus: catData.approvalStatus,
            description: catData.description,
          },
        });
        console.log(
          `🔄 Updated category: ${catData.name} (${catData.slug}) [${catData.type}]`
        );
        skipped++;
        continue;
      }

      // Create new category
      const category = await prisma.category.create({
        data: {
          name: catData.name,
          slug: catData.slug,
          description: catData.description,
          type: catData.type,
          approvalStatus: catData.approvalStatus,
        },
      });

      console.log(
        `✅ Created category: ${category.name} (${category.slug}) [${catData.type}]`
      );
      created++;
    } catch (error: any) {
      console.error(
        `❌ Error creating category "${catData.name}":`,
        error.message
      );
      errors++;
    }
  }

  console.log("\n📊 Summary:");
  console.log(`   ✅ Created: ${created}`);
  console.log(`   🔄 Updated: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log("\n✨ Done!");
}

seedCategories()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
