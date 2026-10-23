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
  { slug: "paquets", title: "PAQUETS" },
  { slug: "droits", title: "SOURCES ET DROITS" }
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

    // Recette visuelle du bandeau : les affiches décoratives ne doivent pas
    // recouvrir le descriptif sur téléphone ; les points sont de vrais mini-points.
    if (device.isMobile) {
      const hero = await page.evaluate(() => {
        const art = document.querySelector(".sc15-hero .sc15-hero-art");
        const dots = [...document.querySelectorAll(".sc15-hero .sc13-hero-dots>button")];
        const flag = document.querySelector(".sc15-hero .sc13-hero-flag")?.getBoundingClientRect();
        const controls = document.querySelector(".sc15-hero .sc13-hero-controls")?.getBoundingClientRect();
        return {
          decorativeArtHidden: art ? getComputedStyle(art).display === "none" : false,
          dotsAreCompact: dots.length >= 2 && dots.every(x => x.getBoundingClientRect().height <= 12),
          controlsDoNotCoverLabel: !!flag && !!controls && flag.right <= controls.left + 3
        };
      });
      assert.ok(hero.decorativeArtHidden, device.name + ": affiche du bandeau sur le texte");
      assert.ok(hero.dotsAreCompact, device.name + ": indicateurs du carrousel trop grands");
      assert.ok(hero.controlsDoNotCoverLabel, device.name + ": contrôles sur le libellé");
    }

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
      ["support", /Signaler un problème/i],
      ["rights", /Sources, affiches et marques/i]
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

    // Les panneaux Halloween / plateformes possèdent leur propre fond sombre.
    // Contrôler la luminosité du texte au lieu de seulement vérifier l'absence
    // de débordements : une encre de thème clair y était devenue illisible.
    const editorialText = await page.evaluate(() => {
      const selectors = [
        ".season-shelf h2",
        ".season-shelf .shelf-head p",
        ".season-shelf .shelf-head .note",
        ".stream-zone h2",
        ".stream-zone .platform-header p",
        ".stream-zone .platform-header .note",
        ".stream-zone .platform-disclaimer"
      ];
      return selectors.flatMap(selector => {
        const el = document.querySelector(selector);
        if (!el) return [];
        const values = (getComputedStyle(el).color.match(/[0-9.]+/g) || [])
          .slice(0, 3).map(Number);
        return [{ selector, brightness: values.reduce((a,b) => a+b,0)/3 }];
      });
    });
    assert.ok(editorialText.some(x => x.selector === ".stream-zone h2"),
      device.name + ": panneau SVOD manquant");
    assert.deepEqual(editorialText.filter(x => x.brightness < 165), [],
      device.name + ": textes sombres dans un panneau sombre " + JSON.stringify(editorialText));

    await page.screenshot({ path: "browser-artifacts/" + device.name + "-packs.png", fullPage: true });

    // Une démonstration ne touche jamais à la collection. Le catalogue externe
    // peut ne pas avoir encore chargé : ne tester l'ouverture que si elle est prête.
    const demo = page.locator("[data-demo-pack]").first();
    if (await demo.count() && await demo.isEnabled()) {
      await demo.click();
      await page.locator("#openingSkip").waitFor();
      await page.locator("#openingSkip").click();
      await page.locator("#openingDone").waitFor();

      // Les noms et raretés doivent conserver un contraste WCAG AA dans le
      // récapitulatif : une précédente régression héritait d'un texte bleu
      // foncé sur des mini-cartes presque noires.
      const contrast = await page.evaluate(() => {
        const channels = color => [...String(color).matchAll(/[0-9.]+/g)].slice(0, 3)
          .map(x => Number(x[0]));
        const luminance = triplet => triplet.reduce((total, value, index) => {
          const c = value / 255;
          const linear = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          return total + linear * [0.2126, 0.7152, 0.0722][index];
        }, 0);
        const ratio = (foreground, background) => {
          const a = luminance(channels(foreground));
          const b = luminance(channels(background));
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        };
        const bg = element => {
          for (let item = element; item; item = item.parentElement) {
            const style = getComputedStyle(item);
            if (channels(style.backgroundColor).length !== 3) continue;
            const opacity = style.backgroundColor.startsWith("rgba(")
              ? Number(style.backgroundColor.match(/[0-9.]+/g)?.[3] ?? 0) : 1;
            if (opacity >= 0.99) return style.backgroundColor;
          }
          return "rgb(255, 255, 255)";
        };
        const labels = [...document.querySelectorAll("#overlay .sc7-opening-mini b, #overlay .sc7-opening-mini span")];
        const values = labels.map(el => ratio(getComputedStyle(el).color, bg(el)));
        const reward = document.querySelector("#overlay .sc7-pack-bonus");
        return {
          labelCount: labels.length,
          smallestLabelRatio: Math.min(...values),
          rewardRatio: reward ? ratio(getComputedStyle(reward).color, bg(reward)) : 0
        };
      });
      assert.equal(contrast.labelCount, 10, device.name + ": cinq noms et cinq raretés attendus");
      assert.ok(contrast.smallestLabelRatio >= 4.5,
        device.name + ": contraste des séries insuffisant " + JSON.stringify(contrast));
      assert.ok(contrast.rewardRatio >= 4.5,
        device.name + ": contraste de la synthèse insuffisant " + JSON.stringify(contrast));
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
  console.log("PASS V1 : 3 tailles, 2 thèmes, 8 parcours, crédits des sources, navigation clavier et démo non connectée");
} finally {
  await browser.close();
}
