/**
 * Seed Admin Account
 * Tạo tài khoản admin mặc định để sử dụng ngay
 * 
 * Usage: npm run seed-admin
 */

import "dotenv/config";
import { RegisterUseCase } from "../src/usecase/user/register.usecase";
import { UserRepository } from "../src/infrastructure/repositories/user.repository.prisma";

async function seedAdmin() {
  // Default admin credentials
  const adminData = {
    email: "admin@cntt.edu.vn",
    password: "admin123456",
    fullName: "Administrator",
    role: "ADMIN" as const,
  };

  console.log("🌱 Seeding admin account...");
  console.log(`📧 Email: ${adminData.email}`);
  console.log(`👤 Name: ${adminData.fullName}`);
  console.log(`🔑 Password: ${adminData.password}`);
  console.log("");

  try {
    const userRepository = new UserRepository();
    const registerUseCase = new RegisterUseCase(userRepository);

    // Check if admin already exists
    const existingAdmin = await userRepository.findByEmail(adminData.email);
    if (existingAdmin) {
      console.log("⚠️  Admin account already exists!");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log("\n✅ You can login with these credentials:");
      console.log(`   Email: ${adminData.email}`);
      console.log(`   Password: ${adminData.password}`);
      return;
    }

    // Create admin account
    const result = await registerUseCase.execute(adminData);

    console.log("✅ Admin account created successfully!");
    console.log("");
    console.log("📋 Account Details:");
    console.log(`   ID: ${result.user.id}`);
    console.log(`   Email: ${result.user.email}`);
    console.log(`   Full Name: ${result.user.fullName}`);
    console.log(`   Role: ${result.user.role}`);
    console.log("");
    console.log("🔐 Login Credentials:");
    console.log(`   Email: ${adminData.email}`);
    console.log(`   Password: ${adminData.password}`);
    console.log("");
    console.log("🚀 You can now login at: http://localhost:3000/login");
  } catch (error: any) {
    console.error("❌ Error creating admin account:");
    console.error(`   ${error.message}`);
    if (error.message.includes("already registered")) {
      console.error("\n💡 Admin account already exists. Use the credentials above to login.");
    }
    process.exit(1);
  }
}

seedAdmin()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

