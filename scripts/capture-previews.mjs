import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outputDirectory = resolve(process.argv[2] ?? 'test-results/visual');
const baseUrl = process.argv[3] ?? 'http://127.0.0.1:4173';
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch();
try {
  const desktop = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await desktop.goto(baseUrl, { waitUntil: 'networkidle' });
  await desktop.screenshot({
    path: resolve(outputDirectory, 'studioflow-creator-hq.png'),
    fullPage: true,
  });

  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await phone.goto(baseUrl, { waitUntil: 'networkidle' });
  await phone.getByRole('button', { name: 'Quick capture' }).first().click();
  await phone.screenshot({
    path: resolve(outputDirectory, 'studioflow-phone-capture.png'),
    fullPage: false,
  });
} finally {
  await browser.close();
}

console.log(`StudioFlow previews written to ${outputDirectory}`);
