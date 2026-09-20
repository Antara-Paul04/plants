# DEPLOYMENT.md

> **The instruction, 2026-09-20:** *"deploy to vercel once the thing works
> independently."*
>
> So this document exists to make "works independently" testable rather than a
> feeling. Deployment is not a task to start — it is a gate to pass. When every
> box below is ticked, deploy; until then, don't.

---

## What "independently" has to mean

The product currently runs on one laptop, reading websites through a Chrome that
lives at a hardcoded path in that laptop's home directory. Three separate things
have to become true before it can run anywhere else.

### 1. A browser it does not own — **PARTLY DONE**

- [x] **The Chrome path is no longer hardcoded.** `PLANTS_CHROME` overrides the
      local list (`analysis/lib/analyze.js`). Local behaviour is unchanged.
- [ ] **A Chrome that actually runs in the target.** Vercel has no browser and no
      persistent filesystem, so this means `@sparticuz/chromium` or equivalent —
      a real integration, not a config line. `playwright-core` is already the
      dependency, which helps: it expects an external binary rather than
      bundling one.
- [ ] **The serve path works without the repo on disk.** `app/server.js` reads
      `analysis/results/dna.json` and serves `prototype/src` straight from the
      working tree.

### 2. It must not fail more the more people use it — **NOT STARTED, AND THIS IS THE GATE**

This is the one that matters, and it is easy to mistake for a performance
concern rather than a deployment blocker.

**The 8-second navigation timeout measures our CPU, not the website** (L16 in
`docs/briefs/BLOOM-SYSTEM-RULINGS.md`). Measured: one request passes in 3.8 s,
four concurrent requests double the analysis time to the 8 s cliff, eight
concurrent give 5/8. `domcontentloaded` waits for every deferred script to
download *and execute*, so the limit gates on the site's JS payload divided by
our machine's capacity at that instant.

**Deploying before this is fixed ships a product that breaks in public exactly
when it is being looked at.** One visitor sees a tree; eight visitors see
timeouts. A launch is the worst case, not the best one.

- [ ] Measure a stable early event rather than the script tail. Evidence says one
      exists: across three github.com visits, HTML was complete at 1.2–2.2 s and
      `domInteractive` at 2.0–2.5 s **every time**, while DOM-ready ranged
      5.3 s → 12 s → >30 s. All the variance is after the page is paintable.
- [ ] **Visual-stability detection in the settle stage.** This is why the fix is
      not a one-line change: we already measure loading screens as pages
      (lusion.co's false winter came from its black preloader), and moving to an
      earlier event makes that *more* likely, not less.
- [ ] Re-measure concurrency after the change. The acceptance test is 8 simultaneous
      requests passing, not 1.

### 3. Honest behaviour when it cannot read a site — **DONE**

- [x] Failure is a real state: bare-earth island, copy that blames us rather than
      the site, retry where the failure is genuinely ours.
- [x] Failures arrive at the budget (~8 s) rather than double it.
- [x] The cached-corpus fallback exists and labels itself, so a deploy without
      live analysis degrades honestly rather than silently.

---

## The fallback deploy, and why it is not the default

A static deploy — frontend, renderer, and the 12 cached corpus sites — would work
today. The product already handles it: `live: false`, labelled in the UI.

It is not the default because the promise on the page is *"Every website grows
differently"* above an input box, and in that build most inputs answer "not in the
cached corpus". That is a fine internal demo and a poor public artifact. It is
available on request; it is not what the instruction asked for.

---

## What to do when the gate opens

1. `@sparticuz/chromium` (or equivalent) wired behind `PLANTS_CHROME`.
2. `vercel.json` with a function long enough for a real analysis — note that
   analyses run 5–30 s today, and that number should *fall* once §2 is fixed.
3. Decide what `analysis/results/dna.json` becomes when there is no working tree.
4. Deploy, then re-run the reliability sweep **against the deployed URL**, not
   against localhost. Every number in this repo was measured on one laptop, and
   several were thrown out for exactly that reason.
