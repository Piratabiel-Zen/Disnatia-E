const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.TEST_URL || 'http://127.0.0.1:4179/';
const root = path.resolve(__dirname, '../..');

(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/tmp/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote'] });
 const errors = [];
 try {
  for (const width of [1440, 768, 390]) {
   for (const master of [true, false]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/archives/assembleia/*.jpeg', route => route.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.join(root, 'public', new URL(route.request().url()).pathname)) }));
    await page.goto(base + '?knowledge' + (master ? '&master' : ''));
    await page.getByRole('button', { name: 'Magias adquiridas' }).click();
    await page.getByRole('heading', { name: 'Restauração Completa' }).waitFor();
    assert.match(await page.locator('.acquired-spell').textContent(), /8 de vida \+ INT/);
    assert.match(await page.locator('.acquired-spell').textContent(), /1 vez por dia/);
    await page.screenshot({ path: `/tmp/dinastia-spells-${width}-${master}.png` });
    await page.getByRole('button', { name: 'Arquivos adquiridos' }).click();
    assert.equal(await page.locator('.acquired-file').count(), 9);
    await page.getByRole('button', { name: 'Abrir Portadores do Destino' }).click();
    const viewer = page.locator('dialog.de-image-viewer');
    await viewer.waitFor();
    assert.equal(await viewer.evaluate(node => node.matches(':modal')), true);
    await page.waitForFunction(() => document.querySelector('.de-image-viewport img')?.naturalWidth > 0);
    const close = viewer.getByRole('button', { name: 'Fechar imagem' });
    assert.equal(await close.evaluate(node => {const b=node.getBoundingClientRect();return node.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}), true);
    await viewer.getByRole('button', { name: 'Próxima imagem' }).click();
    await viewer.getByText('Jansen de Louros', { exact: true }).waitFor();
    await page.keyboard.press('ArrowRight');
    await viewer.getByText('Ignácio Caetano', { exact: true }).waitFor();
    await viewer.getByRole('button', { name: 'Ampliar imagem' }).click();
    assert.equal(await page.locator('.de-image-viewport.zoomed').count(), 1);
    await close.click();
    await page.getByRole('button', { name: 'Abrir Jack Daniels' }).click();
    await page.keyboard.press('Escape');
    assert.equal(await viewer.count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Abrir Jack Daniels' }).evaluate(node => document.activeElement === node), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `/tmp/dinastia-files-${width}-${master}.png` });
    // Same viewer must remain above the real header on the Chronicle screen.
    await page.goto(base + '?header-check' + (master ? '&master' : ''));
    await page.evaluate(() => window.__testStore.set('cronicas_imgs/1', {imagens:['/archives/assembleia/02-jansen.jpeg']}));
    await page.getByRole('button', { name: 'Ampliar imagem', exact: true }).first().click();
    await close.waitFor();
    assert.equal(await close.evaluate(node => {const b=node.getBoundingClientRect();return node.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}), true);
    await page.keyboard.press('Escape');
    if (master) {
     await page.goto(base + '?header-check&map&master');
     await page.evaluate(() => window.dispatchEvent(new CustomEvent('dinastia:adventure-panel',{detail:{panel:'director'}})));
     const drawer = page.locator('.g3-right-drawer');
     await drawer.waitFor();
     await drawer.evaluate(async node => { await Promise.all(node.getAnimations().map(animation => animation.finished)); });
     const headerBox = await page.locator('.immersive-topbar').boundingBox();
     const drawerBox = await drawer.boundingBox();
     assert.ok(drawerBox.y >= headerBox.y + headerBox.height, 'drawer clears wrapped header');
     await page.screenshot({path:`/tmp/dinastia-director-${width}.png`});
    }
    await page.close();
   }
  }
  assert.deepEqual(errors, []);
  console.log('PASS: acquired knowledge, original image viewer, keyboard, mobile and master header clearance (6 viewports/roles).');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
