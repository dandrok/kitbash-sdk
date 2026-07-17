import { expect, test } from '@playwright/test';

/**
 * Real Chromium + minified vanilla/field.js (uhtml bundled).
 * Proves commit / kitbash-change / external set without happy-dom mocks.
 */

type KitbashBridge = {
  events: Array<{
    props: Record<string, unknown>;
    state: Record<string, unknown>;
  }>;
  value: string;
  setValue: (v: string) => void;
  commit: (patch: {
    props?: Record<string, unknown>;
    state?: Record<string, unknown>;
  }) => void;
};

async function getBridge(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => {
    const w = window as unknown as { __kitbash?: KitbashBridge };
    return Boolean(w.__kitbash && customElements.get('kb-browser-field'));
  });
  return page.evaluateHandle(
    () => (window as unknown as { __kitbash: KitbashBridge }).__kitbash,
  );
}

test.describe('minified vanilla field (real uhtml)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await getBridge(page);
  });

  test('typing in shadow input fires kitbash-change with fresh props.value', async ({
    page,
  }) => {
    const field = page.locator('kb-browser-field');
    const input = field.locator('input');

    await input.click();
    await input.fill('hello-browser');

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const k = (window as unknown as { __kitbash: KitbashBridge })
            .__kitbash;
          return k.events.at(-1)?.props.value;
        });
      })
      .toBe('hello-browser');

    const hostValue = await page.evaluate(() => {
      return (window as unknown as { __kitbash: KitbashBridge }).__kitbash
        .value;
    });
    expect(hostValue).toBe('hello-browser');

    // Focus should still be on the inner input after re-render
    await expect(input).toBeFocused();
  });

  test('external property set does not emit kitbash-change', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const k = (window as unknown as { __kitbash: KitbashBridge }).__kitbash;
      k.events.length = 0;
      k.setValue('from-outside');
    });

    const value = await page.evaluate(
      () => (window as unknown as { __kitbash: KitbashBridge }).__kitbash.value,
    );
    expect(value).toBe('from-outside');

    const count = await page.evaluate(
      () =>
        (window as unknown as { __kitbash: KitbashBridge }).__kitbash.events
          .length,
    );
    expect(count).toBe(0);
  });

  test('commit() batches props/state and emits once', async ({ page }) => {
    await page.evaluate(() => {
      const k = (window as unknown as { __kitbash: KitbashBridge }).__kitbash;
      k.events.length = 0;
      k.commit({ props: { value: 'batched' }, state: { touched: true } });
    });

    const last = await page.evaluate(() => {
      const k = (window as unknown as { __kitbash: KitbashBridge }).__kitbash;
      return k.events.at(-1);
    });
    expect(last?.props.value).toBe('batched');
    expect(last?.state.touched).toBe(true);

    const count = await page.evaluate(
      () =>
        (window as unknown as { __kitbash: KitbashBridge }).__kitbash.events
          .length,
    );
    expect(count).toBe(1);
  });

  test('form includes form-associated field value on submit', async ({
    page,
  }) => {
    const field = page.locator('kb-browser-field');
    await field.locator('input').fill('form-user');

    // Wait for commit/form value sync
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          return (window as unknown as { __kitbash: KitbashBridge }).__kitbash
            .value;
        });
      })
      .toBe('form-user');

    const submitted = await page.evaluate(() => {
      return new Promise<string | null>((resolve) => {
        const form = document.getElementById('form') as HTMLFormElement;
        form.addEventListener(
          'submit',
          (e) => {
            e.preventDefault();
            const data = new FormData(form);
            resolve(data.get('username') as string | null);
          },
          { once: true },
        );
        form.requestSubmit();
      });
    });

    expect(submitted).toBe('form-user');
  });
});
