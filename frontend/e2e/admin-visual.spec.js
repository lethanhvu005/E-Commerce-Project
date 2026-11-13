const { test, expect } = require("@playwright/test");

test.use({ channel: "chrome" });

test("admin dashboard uses the dedicated admin layout", async ({ page }) => {
  const token = process.env.ADMIN_ACCESS_TOKEN;
  if (!token) throw new Error("ADMIN_ACCESS_TOKEN is required");
  await page.addInitScript((access) => {
    sessionStorage.setItem("commerceos_tokens", JSON.stringify({ access }));
    localStorage.setItem("nexa_theme", "light");
  }, token);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:3000/admin/dashboard");
  await expect(page.locator(".admin-app")).toBeVisible();
  await expect(page.locator(".admin-sidebar")).toBeVisible();
  await expect(page.locator(".admin-content h1")).toHaveText("Tổng quan");
  await expect(page.locator("header.gear-header")).toHaveCount(0);
  await page.screenshot({ path: "../docs/audit/admin-dashboard-react.png", fullPage: true });
});

test("admin sidebar becomes off-canvas on mobile", async ({ page }) => {
  const token = process.env.ADMIN_ACCESS_TOKEN;
  await page.addInitScript((access) => {
    sessionStorage.setItem("commerceos_tokens", JSON.stringify({ access }));
    localStorage.setItem("nexa_theme", "dark");
  }, token);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:3000/admin/dashboard");
  await expect(page.locator(".sidebar-toggle")).toBeVisible();
  await page.locator(".sidebar-toggle").click();
  await expect(page.locator(".admin-sidebar")).toHaveClass(/open/);
  await page.screenshot({ path: "../docs/audit/admin-dashboard-mobile.png", fullPage: true });
});
