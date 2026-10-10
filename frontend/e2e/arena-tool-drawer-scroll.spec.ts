import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const drawerCss = readFileSync(resolve(process.cwd(), "components/ArenaToolDrawer.module.css"), "utf8");
const timerCss = readFileSync(resolve(process.cwd(), "styles/timer-panel.css"), "utf8");

for (const viewport of [{ width: 390, height: 700 }, { width: 1440, height: 720 }]) {
  test(`timer controls stay reachable through drawer scrolling ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.setContent(`
      <style>
        :root { --surface:#0d1713; --surface-2:#14201a; --border:#2b4b3d; --accent:#53e2aa;
          --ds-border:#2b4b3d; --ds-border-subtle:#22332b; --ds-surface-raised:#13231d;
          --ds-surface-control:#14201a; --ds-surface-subtle:#15231d; --ds-text-primary:white;
          --ds-text-secondary:#a5b8ac; --ds-accent:#53e2aa; --ds-accent-strong:#53e2aa;
          --space-1:.25rem; --space-2:.5rem; --space-3:.75rem; --space-4:1rem;
          --radius-lg:1rem; --radius-md:.5rem; --radius-pill:2rem;
          --font-size-xs:.7rem; --font-size-sm:.85rem; --font-size-xl:1.25rem;
          --font-bold:700; --font-semibold:600; --font-family-mono:monospace; }
        * {box-sizing:border-box} body{margin:0;background:#060b09;color:white;font:16px system-ui}
        .stack-lg {display:grid;gap:1rem}
        ${drawerCss}
        ${timerCss}
      </style>
      <div class="backdrop">
        <aside class="drawer wide" role="dialog" aria-label="Timer">
          <header class="header"><h2>Timer</h2><button>Fechar</button></header>
          <div class="content" role="region" aria-label="Configurações e controles de Timer" tabindex="0">
            <div class="stack-lg timer-workspace">
              <section class="timer-active-card">
                <div class="timer-active-toolbar">
                  <div><strong>Atividade cronometrada</strong><small>Encerrado · 00:00</small></div>
                  <div class="timer-active-toolbar-actions"><button class="button">Expandir prévia</button><button class="button">Tela cheia</button></div>
                </div>
                <div id="timer-active-preview" hidden><div class="timer-active-display">00:00</div></div>
              </section>
              <section class="timer-config-card">
                <div class="timer-config-section"><h3>Tempo da atividade</h3><div style="height:180px">Horas, minutos e segundos</div></div>
                <div class="timer-config-section"><h3>Conteúdo</h3><div style="height:260px">Título e instruções</div></div>
                <div class="timer-config-section"><h3>Alertas locais</h3><div style="height:180px">5 minutos, 1 minuto, ao encerrar</div></div>
                <div class="timer-setup-actions"><button data-testid="timer-start">Iniciar agora</button></div>
              </section>
            </div>
          </div>
        </aside>
      </div>
    `);
    const scroll = page.getByRole("region", { name: "Configurações e controles de Timer" });
    const geometry = await scroll.evaluate((el) => ({ clientHeight: el.clientHeight, scrollHeight: el.scrollHeight }));
    expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight + 120);
    await scroll.hover();
    await page.mouse.wheel(0, 1200);
    await expect.poll(async () => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
    await expect(page.getByTestId("timer-start")).toBeInViewport();
    await scroll.evaluate((el) => { el.scrollTop = 0; });
    await scroll.focus();
    await page.keyboard.press("End");
    await expect.poll(async () => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
    await expect(page.getByTestId("timer-start")).toBeInViewport();
  });
}
