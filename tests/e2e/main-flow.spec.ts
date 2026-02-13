import { test, expect } from '@playwright/test';

const shouldRun = Boolean(process.env.E2E_BASE_URL);

test.describe('HKTECH main flow', () => {
  test.skip(!shouldRun, 'E2E_BASE_URL not configured');

  test('User registers, redeems, checkout and opens IDE', async ({ page }) => {
    const timestamp = Date.now();
    const email = `qa+${timestamp}@hktech.com`;
    const password = 'Senha@12345';

    await page.goto('/signup');
    await page.getByPlaceholder('Nome completo').fill('QA Tester');
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Senha').fill(password);
    await page.getByRole('button', { name: /Criar conta/i }).click();

    await page.waitForURL(/dashboard|home/i, { timeout: 30000 });

    await page.goto('/marketplace');
    const productCard = page.locator('.marketplace-card', { hasText: 'Página Web Institucional' }).first();
    await expect(productCard).toBeVisible();
    await productCard.getByRole('button', { name: /Resgatar|Comprar|Ir para projeto/i }).click();

    await page.waitForURL(/checkout|manager/i, { timeout: 30000 });

    if (page.url().includes('/checkout')) {
      await expect(page.getByText('Finalizar Compra')).toBeVisible();
      const couponRow = page.getByText('Cupom aplicado:', { exact: false });
      await expect(couponRow).toBeVisible();
      await expect(couponRow).not.toContainText('Nenhum');
      await expect(page.getByText('Status do pedido:', { exact: false })).toContainText('completed');

      const openProject = page.getByRole('button', { name: /Abrir projeto/i });
      await openProject.waitFor({ timeout: 30000 });
      await openProject.click();
    }

    await page.waitForURL(/manager/i, { timeout: 30000 });
    await page.getByText('IDE', { exact: false }).click();
    await expect(page.getByText('Arquivos', { exact: false })).toBeVisible();
    await expect(page.getByText('index.html', { exact: false })).toBeVisible();
  });
});
