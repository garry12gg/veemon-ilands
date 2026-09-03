// Edge-case harness (v1.2): controllable clock + interval firing, so the rest
// credit floor (>=2s hold) can be tested deterministically. Supersets click-test.js.
const fs = require("fs");
const html = fs.readFileSync("/workspace/veemon-ilands/dragonling/index.html", "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.log("FAIL: no script found"); process.exit(1); }
const body = m[1];

function makeHarness(search) {
  let now = 0, nextTimer = 1;
  const timers = [], intervals = [];
  function fakeSetTimeout(cb, ms) { const id = nextTimer++; timers.push({ id, cb, at: now + (ms || 0) }); return id; }
  function fakeSetInterval(cb) { const id = nextTimer++; intervals.push({ id, cb }); return id; }
  function fakeClearTimeout(id) { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); }
  const fakeDate = { now: () => now };

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
  const location = { search: search || "" };
  const fn = new Function("document", "location", "setTimeout", "setInterval", "clearTimeout", "URLSearchParams", "console", "Date", body);
  let loadErr = null;
  try { fn(doc, location, fakeSetTimeout, fakeSetInterval, fakeClearTimeout, URLSearchParams, console, fakeDate); }
  catch (e) { loadErr = e; }

  function advance(ms) {
    now += ms;
    const due = timers.filter(t => t.at <= now).sort((a, b) => a.at - b.at);
    timers.splice(0, timers.length, ...timers.filter(t => t.at > now));
    due.forEach(t => t.cb());
  }
  function tick() { advance(1000); intervals.slice().forEach(i => i.cb()); }
  return { registry, loadErr, advance, tick, clock: () => now };
}

let fails = 0;
function report(name, ok, detail) { console.log((ok ? "PASS" : "FAIL") + " " + name + (detail ? " :: " + detail : "")); if (!ok) fails++; }

// ============ Scenario A: normal play, new honesty rules ============
const A = makeHarness("");
report("A load", !A.loadErr, A.loadErr && A.loadErr.message);
if (!A.loadErr) {
  const r = A.registry;
  report("A pre-hatch buttons dimmed", r["act-feed"].classList.contains("dim") && r["act-play"].classList.contains("dim") && r["act-rest"].classList.contains("dim"));

  let err = null;
  try { r["eggWrap"].click("click"); A.advance(420); A.advance(900); } catch (e) { err = e; }
  report("A hatch un-dims actions", !err && r["stage"].classList.contains("hatched") && !r["act-feed"].classList.contains("dim"), err && err.message);

  // feed 1: real meal
  const c0 = r["stage"].children.length;
  const tum0 = Number(r["v-tummy"].textContent);
  r["act-feed"].click("click");
  const berry1 = r["stage"].children.length === c0 + 1;
  A.advance(700);
  const tum1 = Number(r["v-tummy"].textContent);
  report("A feed 1 works", berry1 && tum1 > tum0 && tum1 === 87, "tummy " + tum0 + "->" + tum1 + ", berry:" + berry1);

  // feed 2: tummy 87 -> cap 100
  r["act-feed"].click("click");
  A.advance(700);
  report("A feed 2 caps at 100", Number(r["v-tummy"].textContent) === 100, "tummy " + r["v-tummy"].textContent);

  // feed 3 at full: refused, no berry, no meter change, honest bubble
  const c1 = r["stage"].children.length;
  r["act-feed"].click("click");
  const noBerry = r["stage"].children.length === c1;
  report("A feed at full refuses", noBerry && Number(r["v-tummy"].textContent) === 100 && r["bubble"].textContent === "Belly's full. No room.",
    "berry:" + !noBerry + ", tummy:" + r["v-tummy"].textContent + ", bubble:'" + r["bubble"].textContent + "'");

  // rest at low spark: sleeps, manual wake clears overlay (v1.1 path intact)
  r["act-rest"].click("click");
  const sleeping = r["sleepOverlay"].classList.contains("on");
  r["stage"].pointerdown();
  report("A rest + manual wake intact", sleeping && !r["sleepOverlay"].classList.contains("on"));

  // play opens arena (v1.1 path intact)
  r["act-play"].click("click");
  report("A play opens arena", r["arena"].classList.contains("on"));

  // reset: egg back, buttons dim again until next hatch
  r["againBtn"].click("click");
  report("A reset dims actions pre-egg", r["act-feed"].classList.contains("dim") && r["eggWrap"].style.display === "" && !r["stage"].classList.contains("hatched"));
}

// ============ Scenario B: the reported edge — rest at spark 96 ============
const B = makeHarness("?debug=1&s=restedge");
report("B load (spark 96)", !B.loadErr && Number(B.registry["v-spark"].textContent) === 96, B.loadErr && B.loadErr.message);
if (!B.loadErr) {
  const r = B.registry;
  // rest at spark 96
  r["act-rest"].click("click");
  const fellAsleep = r["sleepOverlay"].classList.contains("on");
  // tick 1: spark 96->100 at dur 1s; must NOT auto-wake (floor at 2s credit line)
  B.tick();
  const heldAt1s = r["sleepOverlay"].classList.contains("on");
  // tick 2: dur 2s -> auto-wake WITH credit path (bubble honest)
  B.tick();
  const wokeAt2s = !r["sleepOverlay"].classList.contains("on");
  const bubbleOk = r["bubble"].textContent === "Rested up. Let's go!";
  report("B rest at 96 floors to 2s and credits", fellAsleep && heldAt1s && wokeAt2s && bubbleOk,
    "asleep:" + fellAsleep + ", held@1s:" + heldAt1s + ", woke@2s:" + wokeAt2s + ", bubble:'" + r["bubble"].textContent + "'");

  // rest again at spark 100: refused (>=99), no overlay, honest bubble
  r["act-rest"].click("click");
  report("B rest refused at full spark", !r["sleepOverlay"].classList.contains("on") && r["bubble"].textContent === "Wide awake! Play with him instead.",
    "overlay:" + r["sleepOverlay"].classList.contains("on") + ", bubble:'" + r["bubble"].textContent + "'");
}

console.log(fails ? "RESULT: FAIL (" + fails + ")" : "RESULT: PASS");
process.exit(fails ? 1 : 0);
