/**
 * E2E Tests for Authentication Flow
 */

import { test, expect, Page } from "@playwright/test";

// Test user credentials (should be seeded in test database)
const TEST_STUDENT = {
  email: "a44894@thanglong.edu.vn",
  password: "12345678",
  fullName: "BUI DINH HIEU",
};

const TEST_ADVISOR = {
  email: "CTI06@cntt.edu.vn",
  password: "12345678",
  fullName: "Nguyễn Xuân Thanh",
};

const TEST_ADMIN = {
  email: "admin@cntt.edu.vn",
  password: "admin123456",
  fullName: "Administrator",
};

test.describe("Authentication Flow", () => {
  test.describe("Login Page", () => {
    test("should display login form", async ({ page }) => {
      await page.goto("/login");

      // Check form elements are visible
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password|mật khẩu/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /đăng nhập|login/i })
      ).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login");

      await page.getByLabel(/email/i).fill("invalid@example.com");
      await page.getByLabel(/password|mật khẩu/i).fill("wrongpassword");
      await page.getByRole("button", { name: /đăng nhập|login/i }).click();

      // Should show error message
      await expect(page.getByText(/invalid|sai|không hợp lệ/i)).toBeVisible({
        timeout: 10000,
      });
    });

    test("should show validation error for empty fields", async ({ page }) => {
      await page.goto("/login");

      // Click submit without filling form
      await page.getByRole("button", { name: /đăng nhập|login/i }).click();

      // Should show validation message
      await expect(
        page.getByText(/required|bắt buộc|không được để trống|are required/i)
      ).toBeVisible();
    });

    test("should redirect to dashboard on successful login", async ({
      page,
    }) => {
      await page.goto("/login");

      await page.getByLabel(/email/i).fill(TEST_STUDENT.email);
      await page.getByLabel(/password|mật khẩu/i).fill(TEST_STUDENT.password);
      await page.getByRole("button", { name: /đăng nhập|login/i }).click();

      // Should redirect to dashboard
      await expect(page).toHaveURL(/dashboard|student|advisor/, {
        timeout: 15000,
      });
    });
  });

  test.describe("Logout", () => {
    test("should logout successfully", async ({ page }) => {
      // First login
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(TEST_STUDENT.email);
      await page.getByLabel(/password|mật khẩu/i).fill(TEST_STUDENT.password);
      await page.getByRole("button", { name: /đăng nhập|login/i }).click();

      // Wait for redirect to dashboard
      await expect(page).toHaveURL(/dashboard|student/, { timeout: 15000 });

      // Find and click logout button
      const logoutButton = page.getByRole("button", {
        name: /đăng xuất|logout/i,
      });
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      } else {
        // Try menu first
        const userMenu = page.getByRole("button", {
          name: /menu|profile|avatar/i,
        });
        if (await userMenu.isVisible()) {
          await userMenu.click();
          await page.getByText(/đăng xuất|logout/i).click();
        }
      }

      // Should redirect to login or home
      await expect(page).toHaveURL(/login|\/$/);
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect to login when accessing protected route without auth", async ({
      page,
    }) => {
      await page.goto("/dashboard");

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test("should redirect to login when accessing questions page without auth", async ({
      page,
    }) => {
      await page.goto("/questions");

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test("should access dashboard after login", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(TEST_STUDENT.email);
      await page.getByLabel(/password|mật khẩu/i).fill(TEST_STUDENT.password);
      await page.getByRole("button", { name: /đăng nhập|login/i }).click();

      // Navigate to dashboard
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test.describe("Role-based Access", () => {
    test("student should not access admin pages", async ({ page }) => {
      // Login as student
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(TEST_STUDENT.email);
      await page.getByLabel(/password|mật khẩu/i).fill(TEST_STUDENT.password);
      await page.getByRole("button", { name: /đăng nhập|login/i }).click();

      await expect(page).toHaveURL(/dashboard|student/, { timeout: 15000 });

      // Try to access admin page
      await page.goto("/admin");

      // Should be redirected (not stay on /admin) or show forbidden
      await page.waitForTimeout(2000); // allow redirect to settle
      const currentUrl = page.url();
      const redirectedAway =
        !currentUrl.includes("/admin") &&
        (currentUrl.includes("login") ||
          currentUrl.includes("dashboard") ||
          currentUrl.includes("student"));
      const forbiddenTextVisible = await page
        .getByText(/forbidden|không có quyền|403/i)
        .isVisible()
        .catch(() => false);

      expect(redirectedAway || forbiddenTextVisible).toBeTruthy();
    });

    test("admin should access admin pages", async ({ page }) => {
      // Login as admin
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
      await page.getByLabel(/password|mật khẩu/i).fill(TEST_ADMIN.password);
      await page.getByRole("button", { name: /đăng nhập|login/i }).click();

      // Navigate to admin
      await page.goto("/admin");

      // Should be able to access
      await expect(page).toHaveURL(/admin/, { timeout: 15000 });
    });
  });
});
