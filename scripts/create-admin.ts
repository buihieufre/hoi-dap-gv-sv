/**
 * Script to create admin account
 * Usage: npm run create-admin
 * 
 * Set environment variables in .env:
 * ADMIN_EMAIL=admin@example.com
 * ADMIN_PASSWORD=admin123
 * ADMIN_NAME=Administrator
 */

import "dotenv/config";
import { RegisterUseCase } from "../src/usecase/user/register.usecase";
import { UserRepository } from "../src/infrastructure/repositories/user.repository.prisma";

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const fullName = process.env.ADMIN_NAME || "Administrator";

  console.log("Creating admin account...");
  console.log(`Email: ${email}`);
  console.log(`Full Name: ${fullName}`);

  try {
    const userRepository = new UserRepository();
    const registerUseCase = new RegisterUseCase(userRepository);

    const result = await registerUseCase.execute({
      email,
      password,
      fullName,
      role: "ADMIN",
    });

    console.log("\n✅ Admin account created successfully!");
    console.log(`User ID: ${result.user.id}`);
    console.log(`Email: ${result.user.email}`);
    console.log(`Role: ${result.user.role}`);
    console.log("\nYou can now login with these credentials.");
  } catch (error: any) {
    console.error("\n❌ Error creating admin account:");
    console.error(error.message);
    if (error.message.includes("already registered")) {
      console.error("\nAdmin account already exists. Use different email or login with existing account.");
    }
    process.exit(1);
  }
}

createAdmin();

