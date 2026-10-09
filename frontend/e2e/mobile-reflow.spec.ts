import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

// This suite is intentionally backend-independent: no class or session fixtures are created.
// It exercises the cascade responsible for the reported iPhone layout regressions.
const arenaStyles = readFileSync(resolve(process.cwd(), "styles/arena-polish.css"), "utf8");
const overviewStyles = readFileSync(resolve(process.cwd(), "styles/classroom-overview.css"), "utf8");
const mobileStyles = readFileSync(resolve(process.cwd(), "styles/mobile-reflow.css"), "utf8");

for (const width of [320, 390, 430, 768]) {
  test(`Arena reflows context rail and score presets at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.setContent(`
      <style>
        :root { font-size: 16px; --space-4: 1rem; --space-3: .75rem; --space-2: .5rem;
          --border: #345; --surface: #123; --surface-2: #234; --text: white; }
        * { box-sizing: border-box; }
        body { margin: 0; }
        ${arenaStyles}
        ${mobileStyles}
      </style>
      <div class="arena-content-full" style="width:100%;padding:10px">
        <div class="arena-live-shell">
          <aside class="arena-cockpit-nav">Menu</aside>
          <div class="arena-session-workspace">
            <header class="arena-live-topbar">
              <div class="arena-session-actions">
                <div class="arena-session-shortcuts">
                  <button>Próximas ações</button><button>Painel pedagógico</button><button>Material</button>
                </div>
                <div class="arena-session-elapsed">Tempo da sessão</div>
                <button>Modo Projetor</button><button>Encerrar sessão</button>
              </div>
            </header>
            <div class="arena-cockpit">
              <main class="arena-cockpit-main">
                <section class="quick-score-dock">
                  <div class="quick-score-head"><div>Pontuação avulsa</div><label class="quick-score-student"><span>—</span><select><option>Selecionar aluno</option></select></label></div>
                  <div class="quick-score-presets"><button>+5</button><button>+10</button><button>+15</button><button>+20</button><button>Personalizar</button></div>
                </section>
              </main>
              <aside class="arena-context-rail">
                <section class="arena-participants-card" style="min-height:160px">Participantes</section>
                <section class="arena-session-code-card"><div>Código da sessão<br><strong>94KXC8</strong></div><img style="width:75px;height:75px" alt="QR Code"></section>
              </aside>
            </div>
          </div>
        </div>
      </div>
    `);
    const measurement = await page.evaluate(() => {
      const grid = (selector: string) => getComputedStyle(document.querySelector(selector)!).gridTemplateColumns.split(" ").length;
      const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const context = rect(".arena-context-rail");
      const roster = rect(".arena-participants-card");
      const qr = rect(".arena-session-code-card");
      return {
        cockpitTracks: grid(".arena-cockpit"),
        railTracks: grid(".arena-context-rail"),
        scoreTracks: grid(".quick-score-presets"),
        panelWithinViewport: [context, roster, qr].every((r) => r.left >= -1 && r.right <= innerWidth + 1),
        stacked: qr.top >= roster.bottom - 1,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(measurement.cockpitTracks).toBe(1);
    expect(measurement.railTracks).toBe(1);
    expect(measurement.scoreTracks).toBe(2);
    expect(measurement.panelWithinViewport).toBe(true);
    expect(measurement.stacked).toBe(true);
    expect(measurement.overflow).toBeLessThanOrEqual(1);
  });
}

for (const width of [320, 390, 430]) {
  test(`Teacher overview keeps compact metrics and filters at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.setContent(`
      <style>
        :root {font-size:16px;--space-3:.75rem;--space-4:1rem;--font-size-xs:.75rem}
        * { box-sizing:border-box } body {margin:0}
        .metrics-grid {display:grid;grid-template-columns:repeat(4,1fr)}
        ${overviewStyles}
        ${mobileStyles}
      </style>
      <main class="overview-page" style="padding:10px">
        <div class="metrics-grid overview-metrics">
          <div class="metric"><span>Turmas ativas</span><strong>634</strong></div>
          <div class="metric"><span>Matrículas ativas</span><strong>1821</strong></div>
          <div class="metric"><span>Atividades</span><strong>78</strong></div>
          <div class="metric"><span>Sessões agora</span><strong>620</strong></div>
        </div>
        <div class="overview-toolbar-main"><div class="segmented-control"><button>Todas</button><button>Ativas</button><button>Inativas</button></div></div>
      </main>
    `);
    const metrics = await page.evaluate(() => {
      const tracks = (selector: string) => getComputedStyle(document.querySelector(selector)!).gridTemplateColumns.split(" ").length;
      return { metricTracks: tracks(".overview-metrics"), filterTracks: tracks(".segmented-control"), overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(metrics.metricTracks).toBe(2);
    expect(metrics.filterTracks).toBe(3);
    expect(metrics.overflow).toBeLessThanOrEqual(1);
  });
}
