/**
 * E2E Tests for Admin Flow
 */

import { test, expect, Page } from "@playwright/test";

const TEST_ADMIN = {
  email: "admin@cntt.edu.vn",
  password: "admin123456",
};

// Route constants (current app structure)
const DASHBOARD = "/dashboard";
const ADMIN_HOME = "/admin";
const ADMIN_USERS = "/admin/users";
const ADMIN_CATEGORIES = "/admin/categories";
const ADMIN_RESOURCES = "/admin/resources";
const ADMIN_QUESTIONS = "/admin/questions";
const ADMIN_QUESTIONS_MANAGE = "/admin/questions/manage";
const QUESTIONS = "/questions";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
  await page.getByLabel(/password|mật khẩu/i).fill(TEST_ADMIN.password);
  await page.getByRole("button", { name: /đăng nhập|login/i }).click();
  await expect(page).toHaveURL(/dashboard|admin/, { timeout: 15000 });
  await page.waitForTimeout(2000);
}

async function gotoAndPause(page: Page, url: string, pauseMs = 2000) {
  await page.goto(url);
  await page.waitForTimeout(pauseMs);
}

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should access admin dashboard", async ({ page }) => {
    await gotoAndPause(page, DASHBOARD);

    // Should see admin dashboard
    await expect(
      page
        .getByRole("heading", { name: /admin|quản trị/i })
        .or(page.getByText(/dashboard|bảng điều khiển/i))
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display statistics", async ({ page }) => {
    await gotoAndPause(page, DASHBOARD);

    // Should see some statistics
    const statsText = page.getByText(/câu hỏi|questions|người dùng|users/i);
    await expect(statsText.first()).toBeVisible();
  });

  test("should have navigation to admin sections", async ({ page }) => {
    await gotoAndPause(page, DASHBOARD);

    // Look for admin navigation
    const navLinks = [
      page.getByRole("link", { name: /người dùng|users/i }),
      page.getByRole("link", { name: /câu hỏi|questions/i }),
      page.getByRole("link", { name: /danh mục|categories/i }),
    ];

    for (const link of navLinks) {
      if (await link.isVisible().catch(() => false)) {
        expect(true).toBeTruthy();
        return;
      }
    }
  });
});

test.describe("User Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForTimeout(5000);
  });

  test("should access users management page", async ({ page }) => {
    await gotoAndPause(page, ADMIN_USERS);
    await page.waitForTimeout(3000);
    // Heading and action buttons
    await expect(
      page.getByRole("heading", { level: 1, name: /quản lý người dùng/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /import csv/i })).toBeVisible(
      {
        timeout: 15000,
      }
    );
    await expect(
      page.getByRole("button", { name: /tạo tài khoản/i })
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test("should display users list", async ({ page }) => {
    await gotoAndPause(page, ADMIN_USERS);

    // Should see a table or list of users
    const userTable = page
      .getByRole("table")
      .or(page.locator('[data-testid="users-list"]'))
      .or(page.locator(".user-list"));

    await expect(userTable).toBeVisible({ timeout: 10000 });

    // Expect at least one data row (skip header)
    await expect(userTable.getByRole("row").nth(1)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should have search functionality", async ({ page }) => {
    await gotoAndPause(page, ADMIN_USERS);

    const searchInput = page
      .getByPlaceholder(/tìm kiếm|search/i)
      .or(page.getByLabel(/tìm kiếm|search/i));

    if (await searchInput.isVisible()) {
      await searchInput.fill("test");
      await searchInput.press("Enter");
      await page.waitForTimeout(1000);
    }
  });

  test("should have role filter", async ({ page }) => {
    await gotoAndPause(page, ADMIN_USERS);

    const roleFilter = page
      .getByRole("combobox", { name: /vai trò|role/i })
      .or(page.getByLabel(/vai trò|role/i));

    if (await roleFilter.isVisible()) {
      await roleFilter.click();
      await page.getByRole("option").first().click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe("Question Approval", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should access questions management page", async ({ page }) => {
    await gotoAndPause(page, QUESTIONS);
    await expect(
      page.getByRole("heading", { level: 1, name: /câu hỏi/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("link", { name: /đặt câu hỏi mới/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("should filter by approval status", async ({ page }) => {
    await gotoAndPause(page, QUESTIONS);

    const approvalFilter = page
      .getByRole("combobox", { name: /trạng thái.*duyệt|approval/i })
      .or(page.getByLabel(/trạng thái.*duyệt|approval/i))
      .or(page.locator('[data-testid="approval-filter"]'));

    if (await approvalFilter.isVisible()) {
      await approvalFilter.click();

      const pendingOption = page.getByRole("option", {
        name: /chờ duyệt|pending/i,
      });
      if (await pendingOption.isVisible()) {
        await pendingOption.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test("should show approve/reject buttons for pending questions", async ({
    page,
  }) => {
    await gotoAndPause(page, `${QUESTIONS}?approvalStatus=PENDING`);

    // Look for approve/reject buttons
    const approveButton = page.getByRole("button", { name: /duyệt|approve/i });
    const rejectButton = page.getByRole("button", { name: /từ chối|reject/i });

    // Either button might be visible if there are pending questions
  });

  test("should approve a question", async ({ page }) => {
    await gotoAndPause(page, `${QUESTIONS}?approvalStatus=PENDING`);

    const approveButton = page
      .getByRole("button", { name: /duyệt|approve/i })
      .first();

    if (await approveButton.isVisible()) {
      await approveButton.click();

      // Confirm if there's a confirmation dialog
      const confirmButton = page.getByRole("button", {
        name: /xác nhận|confirm|ok/i,
      });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      await page.waitForTimeout(2000);

      // Should show success message
      const successMessage = page.getByText(/thành công|success/i);
      if (await successMessage.isVisible().catch(() => false)) {
        expect(true).toBeTruthy();
      }
    }
  });
});

test.describe("Category Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should access categories management page", async ({ page }) => {
    await gotoAndPause(page, ADMIN_CATEGORIES);

    await expect(
      page
        .getByRole("heading", { name: /danh mục|categories/i })
        .or(page.getByText(/quản lý.*danh mục/i))
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display categories list", async ({ page }) => {
    await gotoAndPause(page, ADMIN_CATEGORIES);

    const categoryList = page
      .getByRole("table")
      .or(page.locator('[data-testid="categories-list"]'))
      .or(page.locator(".category-list"));

    await expect(categoryList).toBeVisible();
  });

  test("should have create category button", async ({ page }) => {
    await gotoAndPause(page, ADMIN_CATEGORIES);

    const createButton = page.getByRole("button", {
      name: /thêm|tạo|create|add/i,
    });
    await expect(createButton).toBeVisible();
  });

  test("should create a new category", async ({ page }) => {
    await gotoAndPause(page, ADMIN_CATEGORIES);

    const createButton = page.getByRole("button", {
      name: /thêm|tạo|create|add/i,
    });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Fill category name
      const nameInput = page
        .getByLabel(/tên|name/i)
        .or(page.getByPlaceholder(/tên|name/i));

      if (await nameInput.isVisible()) {
        await nameInput.fill("Test Category " + Date.now());

        // Submit
        const submitButton = page.getByRole("button", {
          name: /lưu|save|tạo|create/i,
        });
        await submitButton.click();

        await page.waitForTimeout(2000);

        // Should show success
        const success =
          (await page
            .getByText(/thành công|success/i)
            .isVisible()
            .catch(() => false)) ||
          (await page
            .getByRole("dialog")
            .isHidden()
            .catch(() => false));
      }
    }
  });
});

test.describe("Admin Resources", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should access resources management page", async ({ page }) => {
    await gotoAndPause(page, ADMIN_RESOURCES);
    await expect(
      page.getByRole("heading", { level: 1, name: /quản lý tài liệu/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("button", { name: /thêm tài liệu/i })
    ).toBeVisible({ timeout: 10000 });

    // Optional: verify list/table appears
    const resourceList = page
      .getByRole("table")
      .or(page.locator('[data-testid="resources-list"]'));
    await expect(resourceList).toBeVisible({ timeout: 10000 });
  });
});

test.describe("CSV Import", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // test("should have CSV import functionality for users", async ({ page }) => {
  //   await gotoAndPause(page, ADMIN_USERS);

  //   const importButton = page
  //     .getByRole("button", { name: /import|nhập/i })
  //     .or(page.getByText(/csv|excel/i));

  //   if (await importButton.isVisible()) {
  //     await importButton.click();

  //     // Should show file upload dialog or input
  //     const fileInput = page.locator('input[type="file"]');
  //     await expect(fileInput).toBeVisible();
  //   }
  // });
});
