/*
  capture-shots.js - retakes the screenshots for Loadout-how-it-works.pptx.

  Usage:  node capture-shots.js <output folder>
  Example: node capture-shots.js shots

  Every shot is the app in demo mode (?demo=1): invented clients, products and
  people, nothing from the shop. No server is needed: requests to
  http://loadout.test/ are answered from the loadout folder next to this
  script's folder, and everything else (Firebase, fonts) is refused, which the
  demo does not need. The yellow demo banner and the home-screen tip are
  hidden so the screens look like the signed-in app.

  Phone shots: 390 x 844 at scale 3 (1170 px wide). TV board 1920 x 1080 and
  Job report 1440 x 900 at scale 1.5. Comic and flow chart are cropped from
  storyboard.html?tab=pictures.

  Needs Playwright with its Chromium; the path below is where it is on the
  machine this was written on. Change PW if it lives elsewhere.
*/
const path = require("path");
const fs = require("fs");
const PW = "T:/ClaudeCodeRepo/greatadvice/node_modules/playwright";
const { chromium } = require(PW);

const ROOT = path.resolve(__dirname, "..");
const OUT = path.resolve(process.argv[2] || path.join(__dirname, "shots"));
const ONLY = process.argv[3] ? process.argv[3].split(",") : null;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".css": "text/css", ".webmanifest": "application/manifest+json" };
const HIDE_CSS = "#demoBar{display:none!important}#a2Strip{display:none!important}.toast{display:none!important}" +
  "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}";

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const TV = { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.5 };
const DESK = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 };
const PRINT = { viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1.5 };
const COMIC = { viewport: { width: 1040, height: 1000 }, deviceScaleFactor: 2.7 };

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* the app's own "Loading ..." lines are gone and the view has content */
async function ready(page) {
  await page.waitForFunction(() => {
    const t = document.body.innerText || "";
    return t.length > 50 && !/(^|\n|\s)Loading\b/.test(t) && !/Reading /.test(t);
  }, null, { timeout: 15000 }).catch(() => console.warn("  (still loading after 15 s)"));
  await sleep(500);
}
/* set a form field the way a person would, so the app's input and change handlers run */
async function setVal(page, sel, v) {
  await page.evaluate(([s, val]) => {
    const e = document.querySelector(s); if (!e) throw new Error("missing " + s);
    e.value = val; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true }));
  }, [sel, v]);
  await sleep(300);
}
/* scroll a page element to just under the sticky header */
async function scrollTo(page, sel, gap) {
  await page.evaluate(([s, g]) => {
    const e = document.querySelector(s); if (!e) throw new Error("missing " + s);
    const top = e.getBoundingClientRect().top + window.scrollY - g;
    window.scrollTo(0, Math.max(0, top));
  }, [sel, gap == null ? 76 : gap]);
  await sleep(300);
}
/* scroll inside an open sheet so an element sits near its top */
async function sheetTo(page, sel, gap) {
  await page.evaluate(([s, g]) => {
    const e = document.querySelector(s); if (!e) throw new Error("missing " + s);
    let p = e.parentElement; while (p && !(p.scrollHeight > p.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
    if (p) p.scrollTop += e.getBoundingClientRect().top - p.getBoundingClientRect().top - g;
  }, [sel, gap == null ? 12 : gap]);
  await sleep(300);
}
async function click(page, sel) { await page.locator(sel).first().click(); await sleep(500); }
/* type a label code into a sheet's scan field (pl, cl, bb) and press Use, as a scanner that types would */
async function scanTyped(page, id, code) {
  await page.fill("#" + id + "Scan", code);
  await page.press("#" + id + "Scan", "Enter");
  await sleep(400);
}

/* name, address (after http://loadout.test/), device, what to do before the shot */
const SHOTS = [
  ["01-home", "?demo=1&role=warehouse#home", PHONE],
  ["02-newjob-choice", "?demo=1&role=warehouse#home", PHONE, async p => { await click(p, '[data-act="newTicket"]'); }],
  ["03-newjob-list", "?demo=1&role=warehouse#home", PHONE, async p => {
    await click(p, '[data-act="newTicket"]');
    await setVal(p, "#ntClient", "ridge-family-practice");
    await setVal(p, "#ntJob", "ridge-family-practice--waiting-room-tvs");
    await setVal(p, "#ntBay", "bay-3");
    await click(p, "#ntNext");
    await setVal(p, "#ntQ", "hdmi"); await click(p, "#ntHits button.hit");
    await setVal(p, "#ntQ", "axis"); await click(p, "#ntHits button.hit");
    await click(p, '[data-ntq="0"][data-d="1"]'); await click(p, '[data-ntq="0"][data-d="1"]'); await click(p, '[data-ntq="0"][data-d="1"]');
    await click(p, '[data-ntq="1"][data-d="1"]');
    await setVal(p, "#ntQ", "");
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await sheetTo(p, "#ntStepHead", 8);
  }],
  ["04-pull-list", "?demo=1&role=warehouse#pull", PHONE],
  ["05-pull-job", "?demo=1&role=warehouse#pull/1042", PHONE],
  ["06-pull-sheet", "?demo=1&role=warehouse#pull/1042", PHONE, async p => { await click(p, '[data-act="pfPull"]'); }],
  ["07-pull-waiting", "?demo=1&role=warehouse#pull/1042", PHONE, async p => { await scrollTo(p, 'section.pgrp.quiet[aria-label="Waiting on orders"]'); }],
  /* the full job page (admin), scrolled to the line that carries the red Short chip */
  ["08-job-short", "?demo=1#job/1042", PHONE, async p => {
    await p.evaluate(() => {
      const chip = Array.from(document.querySelectorAll("#v-ticket span.st.bad")).find(e => /Short/.test(e.textContent));
      if (!chip) throw new Error("no Short chip");
      let card = chip; while (card.parentElement && card.parentElement.id !== "v-ticket" && !/(^|\s)(tr|lcard|row)(\s|$)/.test(card.className) && card.tagName !== "TR") card = card.parentElement;
      const top = card.getBoundingClientRect().top + window.scrollY - 58;
      window.scrollTo(0, Math.max(0, top));
    });
    await sleep(300);
  }],
  ["09-receive-list", "?demo=1&role=warehouse#receive", PHONE],
  ["10-receive-sheet", "?demo=1&role=warehouse#receive", PHONE, async p => {
    await click(p, '[data-act="trRecv"][data-id="dship7740"]');
    await sheetTo(p, "#modalRoot .mbody", 0);
  }],
  ["11-board", "?demo=1&board=1", TV],
  ["12-pickup-job", "?demo=1&role=tech#pickup/1048", PHONE],
  ["13-tech-home", "?demo=1&role=tech#home", PHONE],
  ["14-deliver-job", "?demo=1&role=tech#deliver/1058", PHONE],
  /* 0.13.0 (PLAN 32.2): Bring back after one typed scan of the HDMI cable's code, scrolled to the list */
  ["15-bring-back", "?demo=1&role=tech#home", PHONE, async p => {
    await click(p, '[data-act="bringBack"]');
    await scanTyped(p, "bb", "loadout:prod:patch-cable-hdmi-patch-hdmim-hdmim-black-6ft");
    await sheetTo(p, "#bbScanForm", 40);
  }],
  /* Close job 1039 with its leftovers: the shelf label, the camera's unit, and one HDMI cable scanned back */
  ["16-close-job", "?demo=1#home", PHONE, async p => {
    await click(p, '[data-act="jobClose"][data-id="1039"]');
    await scanTyped(p, "cl", "loadout:loc:storage-room--rca-av-video");
    await scanTyped(p, "cl", "loadout:item:lft1039axis");
    await scanTyped(p, "cl", "loadout:prod:patch-cable-hdmi-patch-hdmim-hdmim-black-6ft");
    await sheetTo(p, "#clLoc", 36);
  }],
  ["17-audit-list", "?demo=1&role=warehouse#audit", PHONE],
  ["18-audit-shelf", "?demo=1&role=warehouse#audit/storage-room--rca-av-video", PHONE],
  ["19-shelf-filter", "?demo=1&role=warehouse#shelf", PHONE, async p => {
    await p.evaluate(() => {
      const s = document.querySelector("#sfCat"); const o = Array.from(s.options).find(x => /^Network/.test(x.textContent));
      s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await sleep(500);
    await p.evaluate(() => { const f = document.querySelector(".fsheet, .modal [data-close]"); if (f) f.click(); });
    await click(p, '[data-act="unitsToggle"][data-id="ubiquiti-u6-pro"]');
    await scrollTo(p, ".shelfc .toolbar", 52);
  }],
  ["20-unit-history", "?demo=1&role=warehouse#shelf/units/i/k3m9q2x7a2", PHONE, async p => {
    await p.evaluate(() => { const b = Array.from(document.querySelectorAll('[data-act="xhist"]')).find(e => e.offsetParent) || document.querySelector('[data-act="xhist"]'); if (!b) throw new Error("no Show history"); b.click(); });
    await sleep(500); await ready(p);
    await scrollTo(p, ".sect .tl", 96);
  }],
  ["21-scan-typed", "?demo=1&role=warehouse#scan", PHONE, async p => {
    await p.fill("#manualCode", "U6-Pro"); await p.press("#manualCode", "Enter"); await sleep(800);
    await scrollTo(p, "#manualForm", 90);
  }],
  ["22-job-report", "?demo=1&role=accounting#office/reports/job/1042", DESK],
  ["23-office-phone", "?demo=1&role=tech&install=ios#office/phone", PHONE],
  /* the top of About shows the How Loadout works button under the version line */
  ["24-office-about", "?demo=1&role=warehouse#office/about", PHONE],
  /* 0.13.0 (PLAN 32.3): an order request waiting for an admin's approval */
  ["27-order-request", "?demo=1#order/7739", PHONE, async p => { await scrollTo(p, "#v-order .podet", 64); }]
];

async function serve(ctx) {
  await ctx.route("**/*", r => {
    const u = new URL(r.request().url());
    if (u.host !== "loadout.test") return r.abort();
    let p = decodeURIComponent(u.pathname); if (p === "/") p = "/index.html";
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: "" });
    r.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
  });
  await ctx.addInitScript(() => {
    try { localStorage.setItem("loadout.a2hs.strip", "1"); localStorage.setItem("loadout.a2hs.card", "1"); } catch (e) {}
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const fails = [];
  for (const [name, addr, dev, act] of SHOTS) {
    if (ONLY && !ONLY.includes(name)) continue;
    const ctx = await browser.newContext(Object.assign({ serviceWorkers: "block" }, dev));
    await serve(ctx);
    const page = await ctx.newPage();
    page.on("pageerror", e => console.warn("  page error in " + name + ": " + e.message));
    try {
      await page.goto("http://loadout.test/" + addr);
      await page.addStyleTag({ content: HIDE_CSS });
      await ready(page);
      if (act) { await act(page); await ready(page); }
      await page.screenshot({ path: path.join(OUT, name + ".png") });
      console.log("ok   " + name);
    } catch (e) { fails.push(name); console.warn("FAIL " + name + ": " + e.message.split("\n")[0]); }
    await ctx.close();
  }
  /* the comic, one row of three panels per picture, from the storyboard's
     In pictures tab at a width where the grid is three by three (1024 px and
     up); scale 2.7 gives about 2490 px across. Each crop is the three panels
     with the same padding on every side. */
  const ROWS = [["25a-comic-1-3", 0], ["25b-comic-4-6", 3], ["25c-comic-7-9", 6]];
  if (!ONLY || ROWS.some(r => ONLY.includes(r[0]))) {
    const ctx = await browser.newContext(Object.assign({ serviceWorkers: "block" }, COMIC));
    await serve(ctx);
    const page = await ctx.newPage();
    await page.goto("http://loadout.test/storyboard.html?tab=pictures");
    await page.addStyleTag({ content: HIDE_CSS });
    await sleep(1200);
    for (const [name, first] of ROWS) {
      if (ONLY && !ONLY.includes(name)) continue;
      try {
        const box = await page.evaluate(([i, pad]) => {
          const lis = Array.from(document.querySelectorAll("ol.comic > li")).slice(i, i + 3);
          if (lis.length !== 3) throw new Error("comic panels not found");
          const r = lis.map(li => li.getBoundingClientRect());
          if (Math.abs(r[0].top - r[2].top) > 2) throw new Error("the comic is not three across at this width");
          const x = Math.min(...r.map(b => b.left)) - pad, y = Math.min(...r.map(b => b.top)) + window.scrollY - pad;
          const w = Math.max(...r.map(b => b.right)) + pad - (x), h = Math.max(...r.map(b => b.bottom)) + window.scrollY + pad - y;
          const cap = parseFloat(getComputedStyle(lis[0].querySelector(".ccap")).fontSize);
          return { x, y, width: w, height: h, cap };
        }, [first, 12]);
        await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: true, clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
        console.log("ok   " + name + " (" + Math.round(box.width) + " x " + Math.round(box.height) + " css px, caption " + box.cap + " px)");
      } catch (e) { fails.push(name); console.warn("FAIL " + name + ": " + e.message.split("\n")[0]); }
    }
    await ctx.close();
  }
  /* the flow chart */
  if (!ONLY || ONLY.includes("26-flow")) {
    const ctx = await browser.newContext(Object.assign({ serviceWorkers: "block" }, PRINT));
    await serve(ctx);
    const page = await ctx.newPage();
    await page.goto("http://loadout.test/storyboard.html?tab=pictures");
    await page.addStyleTag({ content: HIDE_CSS });
    await sleep(1200);
    try { await page.locator("#flow svg").first().screenshot({ path: path.join(OUT, "26-flow.png") }); console.log("ok   26-flow"); }
    catch (e) { fails.push("26-flow"); console.warn("FAIL 26-flow: " + e.message.split("\n")[0]); }
    await ctx.close();
  }
  await browser.close();
  if (fails.length) { console.warn("Not taken: " + fails.join(", ")); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
