import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = 'http://localhost:8090';
const DIR = '/tmp/zllo-shots';
fs.mkdirSync(DIR, { recursive: true });

const errors = [];
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

async function shot(name) {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: true });
  log('📸', name);
}
async function go(path) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500); // fontes + fetch
}
async function waitText(t, timeout = 25000) {
  try { await page.getByText(t, { exact: false }).first().waitFor({ timeout }); }
  catch { log('⚠️ não achei texto:', t); }
}

async function login(email, pass) {
  await go('/login');
  await page.getByPlaceholder('voce@email.com').fill(email);
  await page.locator('input[type=password]').fill(pass);
  await page.getByText('Entrar', { exact: true }).last().click();
  await page.waitForTimeout(4000);
}

try {
  // ---------- ASSISTÊNCIA ----------
  await login('loja1@zllo.dev', 'senha123');
  await waitText('Painel');
  await shot('01-loja-painel');

  await go('/orcamentos'); await waitText('Orçamentos'); await shot('02-loja-orcamentos');
  await go('/ordens'); await waitText('Ordens'); await shot('03-loja-ordens');
  await go('/mensagens'); await waitText('Mensagens'); await shot('04-loja-mensagens');
  await go('/financeiro'); await waitText('Financeiro'); await shot('05-loja-financeiro');
  await go('/reputacao'); await waitText('Reputação'); await shot('06-loja-reputacao');
  await go('/perfil'); await waitText('Perfil'); await shot('07-loja-perfil');

  // ---------- logout ----------
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });

  // ---------- CLIENTE ----------
  await login('cliente@zllo.dev', 'senha123');
  await page.waitForTimeout(4000);
  await shot('08-cliente-inicio');
  await go('/pedidos'); await waitText('pedidos'); await shot('09-cliente-pedidos');
  // abre o 1º pedido (a OS de teste)
  try {
    await page.getByText('iPhone', { exact: false }).first().click();
    await page.waitForTimeout(3000);
    await shot('10-cliente-os-timeline');
  } catch { log('⚠️ não consegui abrir o pedido'); }

  log('\n=== ERROS DE CONSOLE/PÁGINA ===');
  log(errors.length ? errors.slice(0, 15).join('\n') : 'nenhum');
} catch (e) {
  log('ERРО no script:', e.message);
  await page.screenshot({ path: `${DIR}/erro.png` }).catch(() => {});
} finally {
  await browser.close();
  log('\nScreenshots em', DIR);
  log(fs.readdirSync(DIR).filter((f) => f.endsWith('.png')).join('\n'));
}
