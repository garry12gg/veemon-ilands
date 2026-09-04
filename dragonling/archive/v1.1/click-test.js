// DOM-stub harness: executes dragonling index.html script and simulates clicks.
// Catches runtime errors in interaction paths (feed/rest) that load-only smoke tests miss.
const fs = require("fs");
const html = fs.readFileSync("/workspace/veemon-ilands/dragonling/index.html", "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.log("FAIL: no script found"); process.exit(1); }
const body = m[1];

let timers = [], nextTimer = 1, intervals = [];
function fakeSetTimeout(cb, ms) { const id = nextTimer++; timers.push({ id, cb, ms, at: Date.now() + (ms || 0) }); return id; }
function fakeSetInterval(cb) { const id = nextTimer++; intervals.push({ id, cb }); return id; }
function fakeClearTimeout(id) { timers = timers.filter(t => t.id !== id); }

function makeEl(tag) {
  const cls = new Set();
  return {
    tag, children: [], listeners: {}, style: {}, parentNode: null,
    textContent: "", className: "", offsetWidth: 0,
    classList: {
      add: (...c) => c.forEach(x => cls.add(x)),
      remove: (...c) => c.forEach(x => cls.delete(x)),
      toggle: (c, force) => { const on = force === undefined ? !cls.has(c) : !!force; on ? cls.add(c) : cls.delete(c); return on; },
      contains: (c) => cls.has(c),
    },
    addEventListener(ev, cb) { (this.listeners[ev] = this.listeners[ev] || []).push(cb); },
    appendChild(ch) { ch.parentNode = this; this.children.push(ch); },
    remove() { if (this.parentNode) { const i = this.parentNode.children.indexOf(this); if (i >= 0) this.parentNode.children.splice(i, 1); } },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 300, height: 300 }; },
    click(ev) { (this.listeners[ev || "click"] || []).forEach(cb => cb({ target: this })); },
    pointerdown() { (this.listeners["pointerdown"] || []).forEach(cb => cb({})); },
    fire(ev) { (this.listeners[ev] || []).forEach(cb => cb({})); },
  };
}
const registry = {};
const doc = {
  getElementById(id) { if (!registry[id]) registry[id] = makeEl(id); return registry[id]; },
  createElement(tag) { return makeEl(tag); },
  addEventListener() {},
};
const sandbox = {
  document: doc, location: { search: "" }, URLSearchParams,
  setTimeout: fakeSetTimeout, setInterval: fakeSetInterval, clearTimeout: fakeClearTimeout, console,
};
const fn = new Function("document", "location", "setTimeout", "setInterval", "clearTimeout", "URLSearchParams", "console", body);
let loadErr = null;
try { fn(doc, sandbox.location, fakeSetTimeout, fakeSetInterval, fakeClearTimeout, URLSearchParams, console); }
catch (e) { loadErr = e; }

function flush(ms) {
  const due = timers.filter(t => t.ms <= ms).sort((a, b) => a.ms - b.ms);
  timers = timers.filter(t => t.ms > ms);
  due.forEach(t => t.cb());
}
function report(name, ok, detail) { console.log((ok ? "PASS" : "FAIL") + " " + name + (detail ? " :: " + detail : "")); if (!ok) process.exitCode = 1; }

if (loadErr) { report("load", false, loadErr.message); process.exit(1); }
report("load", true);

// --- hatch the egg (click, advance 420ms tap anim, 900ms hatch anim, cheer timers) ---
let err = null;
try {
  registry["eggWrap"].click("click");
  flush(420);
  flush(1320); // 420+900
} catch (e) { err = e; }
report("hatch", !err && registry["stage"].classList.contains("hatched") && registry["dragonWrap"].classList.contains("show"), err ? err.message : "");
flush(2500); // cheer + mood idle timers

// --- FEED: the reported bug ---
err = null;
const tummyBefore = registry["v-tummy"].textContent;
try { registry["act-feed"].click("click"); } catch (e) { err = e; }
const berryAppended = registry["stage"].children.length === 1; // berry lands synchronously, self-removes at 600ms
flush(700); // chew remove + lock release
const tummyAfter = registry["v-tummy"].textContent;
const bubbleSaid = registry["bubble"].textContent.length > 0;
report("feed works", !err && Number(tummyAfter) > Number(tummyBefore) && berryAppended && bubbleSaid,
  err ? err.message : ("tummy " + tummyBefore + "->" + tummyAfter + ", berry:" + berryAppended + ", bubble:'" + registry["bubble"].textContent + "'"));

// --- REST: zzz particles should appear (silent-dead in the buggy version) ---
err = null;
try { registry["act-rest"].click("click"); } catch (e) { err = e; }
flush(10);
const zzzAppended = registry["stage"].children.length === 1 && registry["sleepOverlay"].classList.contains("on"); // the zzz (berry already self-removed)
report("rest + zzz", !err && zzzAppended, err ? err.message : ("stage children: " + registry["stage"].children.length + ", overlay on: " + registry["sleepOverlay"].classList.contains("on")));

// --- wake from rest ---
err = null;
try { registry["stage"].pointerdown(); } catch (e) { err = e; }
report("wake", !err && !registry["sleepOverlay"].classList.contains("on"), err ? err.message : "");

// --- PLAY opens arena ---
err = null;
try { registry["act-play"].click("click"); } catch (e) { err = e; }
report("play opens arena", !err && registry["arena"].classList.contains("on"), err ? err.message : "");

console.log(process.exitCode ? "RESULT: FAIL" : "RESULT: PASS");
