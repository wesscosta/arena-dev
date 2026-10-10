import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

// Browser geometry without credentials/fixtures: the active CSS cascade must not
// bring back the old two-tier horizontal navigation on mobile.
const legacy = readFileSync(resolve(process.cwd(), "styles/arena-polish.css"), "utf8");
const reflow = readFileSync(resolve(process.cwd(), "styles/mobile-reflow.css"), "utf8");

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  test(`navigation uses drawer on small viewports and rail on desktop: ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.setContent(`
      <style>
        :root {font-size:16px;--surface:#102018;--surface-2:#172b20;--text:white;
          --border:#405b50;--accent:#50df9f;--space-3:.75rem;--space-4:1rem;
          --radius-lg:1rem;--ds-border:#405b50;--ds-text-primary:white;--ds-surface-raised:#102018}
        * {box-sizing:border-box} body{margin:0;background:#07100d;color:white}
        ${legacy}
        ${reflow}
      </style>
      <main class="arena-content-full">
        <div class="arena-live-shell">
          <aside class="arena-cockpit-nav">
            <button class="arena-nav-brand">A</button>
            <span class="arena-nav-mobile-title">Arena</span>
            <button class="arena-nav-menu-trigger" aria-label="Abrir menu da Arena">☰</button>
            <button class="arena-nav-menu-backdrop" aria-label="Fechar menu da Arena"></button>
            <div class="arena-nav-panel" data-open="true">
              <div class="arena-nav-panel-head"><strong>Menu da Arena</strong><button>×</button></div>
              <div class="arena-nav-scroll">
                <div class="arena-cockpit-nav-group"><span class="arena-cockpit-nav-label">AULA</span><button><strong>Material da aula</strong></button></div>
                <div class="arena-cockpit-nav-group"><span class="arena-cockpit-nav-label">DINÂMICAS</span><button><strong>Quiz</strong></button></div>
                <div class="arena-cockpit-nav-group"><span class="arena-cockpit-nav-label">FERRAMENTAS</span><button><strong>Presença e acesso</strong></button></div>
                <div class="arena-cockpit-nav-group"><span class="arena-cockpit-nav-label">ACOMPANHAMENTO</span><button><strong>Evidências da aprendizagem</strong></button></div>
                <div class="arena-cockpit-nav-group arena-nav-mobile-session"><button><strong>Encerrar sessão da Arena</strong></button></div>
              </div>
              <div class="arena-nav-professor">Professor</div>
            </div>
          </aside>
        </div>
      </main>
    `);
    const m = await page.evaluate(() => {
      const rect = (q: string) => document.querySelector<HTMLElement>(q)!.getBoundingClientRect();
      const menu = document.querySelector<HTMLElement>(".arena-nav-panel")!;
      const items = Array.from(menu.querySelectorAll<HTMLElement>(".arena-cockpit-nav-group:not(.arena-nav-mobile-session)"));
      const menuRect = rect(".arena-nav-panel");
      return {
        triggerVisible: getComputedStyle(document.querySelector(".arena-nav-menu-trigger")!).display !== "none",
        menuVisible: getComputedStyle(menu).display !== "none",
        within: menuRect.x >= -1 && menuRect.right <= innerWidth + 1,
        groupVisible: items.every((el) => getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0),
        overflow: document.documentElement.scrollWidth - innerWidth,
        railVisible: rect(".arena-cockpit-nav").width > 0,
      };
    });
    expect(m.railVisible).toBe(true);
    expect(m.groupVisible).toBe(true);
    expect(m.within).toBe(true);
    expect(m.overflow).toBeLessThanOrEqual(1);
    if (width <= 768) {
      expect(m.triggerVisible).toBe(true);
      expect(m.menuVisible).toBe(true);
    } else {
      expect(m.triggerVisible).toBe(false);
    }
  });
}
