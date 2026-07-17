/**
 * Real Chromium + minified vanilla/field.js (uhtml inlined).
 * Uses Playwright as a library (not the test runner) for reliability under Bun.
 *
 * Run: bun run e2e/prepare.ts && bun test e2e/browser-runtime.bun.test.ts
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Browser, chromium, type Page } from '@playwright/test';

const port = 4173;
const baseURL = `http://127.0.0.1:${port}`;

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

describe('browser minified vanilla field (real uhtml)', () => {
  let browser: Browser;
  let page: Page;
  let server: ReturnType<typeof Bun.serve>;

  beforeAll(async () => {
    // Expect fixture prepared by test:browser:prepare
    const root = join(dirname(fileURLToPath(import.meta.url)), 'fixture-dist');
    const index = Bun.file(join(root, 'index.html'));
    if (!(await index.exists())) {
      throw new Error('Missing e2e/fixture-dist — run: bun run e2e/prepare.ts');
    }

    const mime: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json',
    };

    server = Bun.serve({
      port,
      async fetch(req) {
        const url = new URL(req.url);
        let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
        pathname = pathname.replace(/\.\./g, '');
        const filePath = join(root, pathname);
        const file = Bun.file(filePath);
        if (!(await file.exists())) {
          return new Response('Not found', { status: 404 });
        }
        const ext = pathname.slice(pathname.lastIndexOf('.'));
        return new Response(file, {
          headers: {
            'Content-Type': mime[ext] || 'application/octet-stream',
            'Cache-Control': 'no-store',
          },
        });
      },
    });

    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await page?.close().catch(() => {});
    await browser?.close().catch(() => {});
    server?.stop(true);
  });

  async function loadFixture() {
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const w = window as unknown as { __kitbash?: KitbashBridge };
      return Boolean(w.__kitbash && customElements.get('kb-browser-field'));
    });
  }

  async function waitFor<T>(
    fn: () => Promise<T>,
    predicate: (v: T) => boolean,
    timeoutMs = 5000,
  ): Promise<T> {
    const start = Date.now();
    let last: T | undefined;
    while (Date.now() - start < timeoutMs) {
      last = await fn();
      if (predicate(last)) return last;
      await page.waitForTimeout(50);
    }
    throw new Error(`waitFor timed out, last=${JSON.stringify(last)}`);
  }

  test('typing in shadow input fires kitbash-change and keeps focus', async () => {
    await loadFixture();
    const field = page.locator('kb-browser-field');
    const input = field.locator('input');

    await input.click();
    await input.fill('hello-browser');

    const lastValue = await waitFor(
      () =>
        page.evaluate(() => {
          const k = (window as unknown as { __kitbash: KitbashBridge })
            .__kitbash;
          return k.events.at(-1)?.props.value;
        }),
      (v) => v === 'hello-browser',
    );
    expect(lastValue).toBe('hello-browser');

    const hostValue = await page.evaluate(() => {
      return (window as unknown as { __kitbash: KitbashBridge }).__kitbash
        .value;
    });
    expect(hostValue).toBe('hello-browser');
    // With delegatesFocus, document.activeElement is often the host; shadow activeElement is the input.
    const focusOk = await page.evaluate(() => {
      const host = document.getElementById('field');
      const shadowActive = host?.shadowRoot?.activeElement;
      return (
        document.activeElement === host || shadowActive?.tagName === 'INPUT'
      );
    });
    expect(focusOk).toBe(true);
  });

  test('external property set does not emit kitbash-change', async () => {
    await loadFixture();
    await page.evaluate(() => {
      const k = (window as unknown as { __kitbash: KitbashBridge }).__kitbash;
      k.events.length = 0;
      k.setValue('from-outside');
    });

    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __kitbash: KitbashBridge }).__kitbash.value,
      ),
    ).toBe('from-outside');
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __kitbash: KitbashBridge }).__kitbash.events
            .length,
      ),
    ).toBe(0);
  });

  test('commit() batches props/state and emits once', async () => {
    await loadFixture();
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
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __kitbash: KitbashBridge }).__kitbash.events
            .length,
      ),
    ).toBe(1);
  });

  test('form includes form-associated field value on submit', async () => {
    await loadFixture();
    const field = page.locator('kb-browser-field');
    await field.locator('input').fill('form-user');

    const hostValue = await waitFor(
      () =>
        page.evaluate(
          () =>
            (window as unknown as { __kitbash: KitbashBridge }).__kitbash.value,
        ),
      (v) => v === 'form-user',
    );
    expect(hostValue).toBe('form-user');

    const submitted = await page.evaluate(() => {
      return new Promise<string | null>((resolve) => {
        const form = document.getElementById('form') as HTMLFormElement;
        form.addEventListener(
          'submit',
          (e) => {
            e.preventDefault();
            resolve(new FormData(form).get('username') as string | null);
          },
          { once: true },
        );
        form.requestSubmit();
      });
    });

    expect(submitted).toBe('form-user');
  });
});
