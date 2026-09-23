import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const source = fs
  .readFileSync(new URL("../analysis/lib/analyze.js", import.meta.url), "utf8")
  .replace(/^import .*;\n/gm, "")
  .replace(/^export /gm, "");
const defer = () => {
  let resolve, reject;
  const promise = new Promise((r, j) => {
    resolve = r;
    reject = j;
  });
  return { promise, resolve, reject };
};
const flush = () => new Promise((r) => setImmediate(r));
function setup(options = {}) {
  let ms = 0,
    launches = 0,
    closes = 0,
    frameIndex = 0;
  const screenshots = [],
    waitCalls = [],
    scopes = [],
    navigations = [],
    timers = new Map();
  const measurePage = function measurePage() {};
  const analysePixels = function analysePixels() {};
  const measureAccentRegions = function measureAccentRegions() {};
  const m = {
    docHeight: 3600,
    mediaRects: [],
    scopes: {
      v3: {
        unstyledScore: 0,
        stylingRichness: 0.7,
        media: { imageArea: 0.1, canvasArea: 0 },
        text: { charsPerMegapixel: 500 },
      },
    },
  };
  const response = { status: () => 200, headerValue: async () => "text/html" };
  const page = {
    on() {},
    url: () => "https://example.com/",
    goto: async (url) => {
      navigations.push(url);
      if (options.failHttps && url.startsWith("https:"))
        throw new Error("Timeout");
      return options.navigation ? options.navigation.promise : response;
    },
    waitForFunction: async (...args) => {
      waitCalls.push(args);
    },
    waitForLoadState: async () => {},
    waitForTimeout: async (n) => {
      ms += n;
    },
    async evaluate(fn, args) {
      if (fn === measurePage) {
        scopes.push(args.only);
        return { ...m, scopes: { [args.only]: m.scopes.v3 } };
      }
      const s = String(fn);
      if (s.includes("isChromeError"))
        return {
          title: "Example",
          text: "This is a website",
          isChromeError: false,
          bodyLen: 2500,
          els: 80,
        };
      if (s.includes("links: document"))
        return {
          title: "Example",
          text: "This is a website",
          chars: options.noLinks ? 500 : 2500,
          links: options.noLinks ? 0 : 10,
          els: 80,
          boxes: options.noLinks ? 12 : 50,
          url: "https://example.com/",
        };
      if (s.includes("let geo"))
        return { els: 80, text: 2500, geo: 200, boxes: 50, painted: 500000 };
      return null;
    },
    async screenshot(args) {
      screenshots.push(args);
      if (options.failV3 && args.clip?.height === 2700)
        throw new Error("capture timed out");
      if (!args.animations) {
        const frames = options.frames || ["AAAA"];
        return Buffer.from(frames[Math.min(frameIndex++, frames.length - 1)]);
      }
      return Buffer.from("screenshot");
    },
  };
  const scratch = {
    isClosed: () => false,
    goto: async () => {},
    async evaluate(fn) {
      if (fn === analysePixels)
        return {
          all: {
            whitespaceRatio: 0.8,
            colorfulness: 0.5,
            background: "#ffffff",
          },
          maskedFraction: 0,
        };
      if (fn === measureAccentRegions) return { concentration: 0.2 };
      return { sustained: 0.2 };
    },
  };
  const browser = {
    isConnected: () => true,
    on() {},
    async newContext(opts) {
      return {
        newPage: async () => (opts.viewport.width === 800 ? scratch : page),
        close: async () => {
          closes++;
        },
      };
    },
  };
  const context = {
    console,
    URL,
    Buffer,
    AbortController,
    process: {
      env: { PLANTS_CHROME: "mock" },
      hrtime: { bigint: () => BigInt(ms) * 1000000n },
    },
    fs: { existsSync: () => false },
    chromium: {
      launch: async () => {
        launches++;
        if (options.launchFailure)
          throw new Error("simulated transient launch failure");
        return browser;
      },
    },
    measurePage,
    analysePixels,
    measureAccentRegions,
    diffFrames() {},
    buildDna() {},
    setTimeout(fn, n) {
      const id = timers.size + 1;
      timers.set(id, { fn, n });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  vm.createContext(context);
  vm.runInContext(
    source + "\nthis.audit={analyzeUrl,normalizeUrl,sameBrand};",
    context,
  );
  return {
    context,
    screenshots,
    waitCalls,
    scopes,
    navigations,
    timers,
    response,
    get launches() {
      return launches;
    },
    get closes() {
      return closes;
    },
  };
}

test("healthy capture uses three viewports and optional motion sampling", async () => {
  const t = setup(),
    result = await t.context.audit.analyzeUrl("example.com", { motion: true });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.captureScope, "v3");
  assert.deepEqual(
    t.screenshots.filter((s) => s.clip).map((s) => s.clip.height),
    [2700],
  );
  assert.equal(t.screenshots.filter((s) => s.animations === "allow").length, 3);
  assert.equal(t.waitCalls[0].length, 3);
  assert.equal(t.waitCalls[0][1], null);
  assert.equal(t.waitCalls[0][2].polling, 200);
});
test("a smaller screenshot remeasures DOM in the same region", async () => {
  const t = setup({ failV3: true }),
    result = await t.context.audit.analyzeUrl("example.com");
  assert.equal(result.ok, true);
  assert.equal(result.captureScope, "v2");
  assert.deepEqual(t.scopes, ["v3", "v2"]);
});
test("browser launch recovers after failures", async () => {
  const t = setup({ launchFailure: true });
  for (let i = 0; i < 3; i++)
    assert.equal(
      (await t.context.audit.analyzeUrl("example.com")).failure.code,
      "INTERNAL",
    );
  assert.equal(t.launches, 3);
});
test("wall deadline closes the active browser context immediately", async () => {
  const navigation = defer(),
    t = setup({ navigation }),
    p = t.context.audit.analyzeUrl("example.com");
  await flush();
  [...t.timers.values()][0].fn();
  assert.equal((await p).failure.code, "TIMEOUT");
  assert.equal(t.closes, 1);
  navigation.resolve(t.response);
  await flush();
});
test("caller cancellation closes work and returns promptly", async () => {
  const navigation = defer(),
    t = setup({ navigation }),
    ac = new AbortController();
  const p = t.context.audit.analyzeUrl("example.com", { signal: ac.signal });
  await flush();
  ac.abort();
  assert.equal((await p).failure.code, "TIMEOUT");
  assert.equal(t.closes, 1);
  navigation.resolve(t.response);
  await flush();
});
test("visual stability requires consecutive agreements", async () => {
  const t = setup({ frames: ["AAAA", "AAAA", "BBBB", "BBBB", "CCCC"] }),
    result = await t.context.audit.analyzeUrl("example.com");
  assert.equal(result.ok, true);
  assert.equal(t.screenshots.filter((s) => !s.animations).length, 7);
});
test("an explicit HTTPS URL is never downgraded", async () => {
  const explicit = setup({ failHttps: true });
  await explicit.context.audit.analyzeUrl("https://example.com");
  assert.deepEqual(explicit.navigations, ["https://example.com/"]);
  const inferred = setup({ failHttps: true });
  await inferred.context.audit.analyzeUrl("example.com");
  assert.deepEqual(inferred.navigations, [
    "https://example.com/",
    "http://example.com/",
  ]);
});
test("unrelated brand substrings and app subdomains do not match", () => {
  const { sameBrand } = setup().context.audit;
  assert.equal(sameBrand("github.com", "notgithub.com"), false);
  assert.equal(sameBrand("app.first.com", "app.second.com"), false);
  assert.equal(sameBrand("en.m.wikipedia.org", "en.wikipedia.org"), true);
  assert.equal(sameBrand("nike.com", "nike.in"), true);
});
test("a rendered page does not need hyperlinks to be a website", async () => {
  const t = setup({ noLinks: true });
  assert.equal((await t.context.audit.analyzeUrl("example.com")).ok, true);
});
