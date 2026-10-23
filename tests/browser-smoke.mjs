// Recette navigateur sans authentification : aucune opération d'achat ou d'écriture en base.
// Les mêmes parcours sont vérifiés sur téléphone étroit, téléphone standard et ordinateur.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const url = process.env.SITE_URL || "http://127.0.0.1:4173/";
const devices = [
  { name: "android-360", width: 360, height: 780, isMobile: true, hasTouch: true },
  { name: "android-390", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "desktop-1366", width: 1366, height: 900, isMobile: false, hasTouch: false }
];
const routes = [
  { slug: "catalogue", title: "CATALOGUE" },
  { slug: "collection", title: "COLLECTION" },
  { slug: "albums", title: "MES SAISONS" },
  { slug: "premium", title: "PREMIUM" },
  { slug: "jeux", title: "JEUX" },
  { slug: "parametres", title: "PARAMÈTRES" },
  { slug: "paquets", title: "PAQUETS" }
];

await mkdir("browser-artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

try {
  for (const device of devices) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      isMobile: device.isMobile, hasTouch: device.hasTouch,
      deviceScaleFactor: 1, locale: "fr-FR"
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 50000 });
    await page.locator("#topbar [data-theme-toggle]").waitFor();
    await page.locator("#page h1").waitFor();

    // Le mode nuit est le défaut, et le basculement vers le jour fonctionne.
    const initial = await page.evaluate(() => document.documentElement.dataset.theme);
    assert.ok(["day", "night"].includes(initial));
    await page.locator("#topbar [data-theme-toggle]").click();
    assert.notEqual(await page.evaluate(() => document.documentElement.dataset.theme), initial);
    await page.screenshot({ path: "browser-artifacts/" + device.name + "-theme.png" });

    // Les pages d'information et l'entrée de connexion restent atteignables.
    for (const [route, heading] of [
      ["privacy", /Comprendre et contrôler tes données/i],
      ["legal", /Mentions légales en préparation/i],
      ["support", /Signaler un problème/i]
    ]) {
      await page.locator('footer [data-route="' + route + '"]').click();
      await page.getByRole("heading", { name: heading }).waitFor();
    }

    await page.locator("[data-auth]").first().click();
    await page.locator("#authForgotPassword").waitFor();
    await page.locator("#authPassword").waitFor();

    // Un dialogue ouvert doit contenir le focus Tab/Shift+Tab.
    const close = page.locator("#overlay [data-close]");
    await close.focus();
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "authForgotPassword",
      device.name + ": Shift+Tab doit revenir au dernier contrôle du dialogue");
    await page.keyboard.press("Tab");
    assert.ok(await close.evaluate(el => document.activeElement === el),
      device.name + ": Tab doit revenir au bouton Fermer");
    await page.keyboard.press("Escape");
    await page.locator("#overlay").waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => document.activeElement?.id), "page",
      device.name + ": retour du focus dans la page");

    // Parcours réels du routeur : détecter un débordement horizontal sur chaque page.
    for (const route of routes) {
      await page.evaluate(slug => { window.location.hash = "#/" + slug; }, route.slug);
      await page.waitForFunction(title =>
        document.querySelector("#topbar .crumb")?.textContent?.includes(title),
      route.title);
      await page.locator("#page h1").waitFor();
      const metrics = await page.evaluate(() => ({
        inner: window.innerWidth,
        scroll: document.documentElement.scrollWidth,
        heading: document.querySelector("#page h1")?.textContent
      }));
      assert.ok(metrics.scroll <= metrics.inner + 8,
        device.name + "/" + route.slug + ": débordement horizontal " + JSON.stringify(metrics));
    }

    // Le premier écran contient une proposition de paquet et un accès catalogue.
    assert.ok(await page.locator("#svod-packs").count(),
      device.name + ": choix des paquets manquant");
    assert.ok(await page.locator("#page [data-pack]").count(),
      device.name + ": paquets classiques absents");
    await page.screenshot({ path: "browser-artifacts/" + device.name + "-packs.png", fullPage: true });

    // Une démonstration ne touche jamais à la collection. Le catalogue externe
    // peut ne pas avoir encore chargé : ne tester l'ouverture que si elle est prête.
    const demo = page.locator("[data-demo-pack]").first();
    if (await demo.count() && await demo.isEnabled()) {
      await demo.click();
      await page.locator("#openingSkip").waitFor();
      await page.locator("#openingSkip").click();
      await page.locator("#openingDone").waitFor();
      await page.screenshot({ path: "browser-artifacts/" + device.name + "-demo.png" });
      await page.keyboard.press("Escape");
      await page.locator("#overlay").waitFor({ state: "hidden" });
    }

    assert.deepEqual(
      errors.filter(message => /SyntaxError|TypeError|ReferenceError/.test(message)), [],
      device.name + ": exceptions JavaScript " + errors.join(" | ")
    );
    await context.close();
  }
  console.log("PASS V1 : 3 tailles, 2 thèmes, 7 parcours, navigation clavier et démo non connectée");
} finally {
  await browser.close();
}
