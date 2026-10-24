import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { decodeStudentPreferences, nextStudentScale, STUDENT_TEXT_LEVELS } from "../lib/student-preferences";
import { clearStudentDeviceAccess, matchesStudentAccess } from "../lib/student-session";

test("preferências desconhecidas caem em valores seguros; armazenamento anterior é preservado", () => {
  assert.deepEqual(decodeStudentPreferences(null, null, null), { scale: 1, theme: "system", reducedMotion: false });
  assert.deepEqual(decodeStudentPreferences("1.5", "dark", "1"), { scale: 1.5, theme: "dark", reducedMotion: true });
  assert.deepEqual(decodeStudentPreferences("invalid", "neon", "yes"), { scale: 1, theme: "system", reducedMotion: false });
  assert.deepEqual(decodeStudentPreferences("2", "light", "0"), { scale: 2, theme: "light", reducedMotion: false });
});

test("zoom obedece níveis e limites, sem extrapolar 80%-200%", () => {
  assert.equal(nextStudentScale(1, 1), 1.1);
  assert.equal(nextStudentScale(1, -1), .9);
  assert.equal(nextStudentScale(.8, -1), .8);
  assert.equal(nextStudentScale(2, 1), 2);
  assert.deepEqual([...STUDENT_TEXT_LEVELS], [.8, .9, 1, 1.1, 1.25, 1.5, 1.75, 2]);
});

test("remoção de sessão local respeita identidade do estudante; JSON inválido não é usado", () => {
  assert.equal(matchesStudentAccess(JSON.stringify({ studentId: "A", token: "safe" }), "A"), true);
  assert.equal(matchesStudentAccess(JSON.stringify({ studentId: "B", token: "safe" }), "A"), false);
  assert.equal(matchesStudentAccess("{", "A"), false);
  assert.equal(matchesStudentAccess(null, "A"), false);
  assert.equal(matchesStudentAccess(JSON.stringify({ studentId: "A" }), ""), false);
});

test("controles são compartilhados entre estudo e participação e persistem em páginas distintas", () => {
  const study = readFileSync(resolve(process.cwd(), "components/study/StudyShell.tsx"), "utf8");
  const join = readFileSync(resolve(process.cwd(), "components/StudentJoinFlow.tsx"), "utf8");
  const profile = readFileSync(resolve(process.cwd(), "app/learn/profile/page.tsx"), "utf8");
  const studyCss = readFileSync(resolve(process.cwd(), "components/study/study.module.css"), "utf8");
  assert.match(profile, /<StudentAccessibilityControls/);
  assert.doesNotMatch(study, /<StudentAccessibilityControls/);
  assert.match(study, /Configurações/);
  assert.match(join, /!embedded && <div className="student-accessibility-row"><StudentAccessibilityControls \/><\/div>/);
  assert.match(study, /--study-content-scale/);
  assert.match(join, /--student-content-scale/);
  assert.doesNotMatch(study, /styles\.accessibilityMobile/);
  assert.match(studyCss, /\.profilePreferences\{/);
  const joinCss = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
  assert.match(joinCss, /student-join-card:has\(\[aria-modal="true"\]\)\{zoom:1\}/);
  assert.match(joinCss, /student-join-card \[aria-modal="true"\] main\{zoom:var\(--student-content-scale,1\)/);
  const activity = readFileSync(resolve(process.cwd(), "components/StudentActivitiesPanel.tsx"), "utf8");
  assert.match(activity, /<StudentAccessibilityControls compact/);
  assert.match(activity, /<summary>Acessibilidade<\/summary>/);
  assert.match(join, /Sair da sessão/);
  assert.match(profile, /await revokeRememberedDevice\(profile.studyToken\)/);
  assert.match(profile, /Esquecer este dispositivo/);
});

test("esquecer dispositivo remove somente os segredos da matrícula selecionada", () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, "window");
  class MemoryStorage {
    private values = new Map<string,string>();
    get length() { return this.values.size; }
    key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
    getItem(key: string) { return this.values.get(key) ?? null; }
    setItem(key: string, value: string) { this.values.set(key, value); }
    removeItem(key: string) { this.values.delete(key); }
  }
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  localStorage.setItem("arena-dev-device:classA", "tokenA");
  localStorage.setItem("arena-dev-device:classB", "tokenB");
  sessionStorage.setItem("arena-dev-student:joinA", JSON.stringify({ studentId: "A" }));
  sessionStorage.setItem("arena-dev-student:joinB", JSON.stringify({ studentId: "B" }));
  sessionStorage.setItem("other-app-state", "keep");
  Object.defineProperty(globalThis, "window", { configurable:true, value:{ localStorage, sessionStorage } });
  try {
    clearStudentDeviceAccess("classA", "A", "tokenA");
    assert.equal(localStorage.getItem("arena-dev-device:classA"), null);
    assert.equal(localStorage.getItem("arena-dev-device:classB"), "tokenB");
    assert.equal(sessionStorage.getItem("arena-dev-student:joinA"), null);
    assert.ok(sessionStorage.getItem("arena-dev-student:joinB"));
    assert.equal(sessionStorage.getItem("other-app-state"), "keep");
  } finally {
    if (old) Object.defineProperty(globalThis, "window", old);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
