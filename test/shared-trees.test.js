import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import treeHandler from '../api/tree.js';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import {
  validateShare,
  saveTree,
  loadTree,
  loadTreeImage,
  treePage,
} from "../lib/shared-trees.js";
const directory = await mkdtemp(join(tmpdir(), "plants-test-"));
process.env.PLANTS_SHARE_DIR = directory;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.BLOB_STORE_ID;
after(() => rm(directory, { recursive: true, force: true }));
const gallery = JSON.parse(
  await readFile(
    new URL("../app/public/gallery.json", import.meta.url),
    "utf8",
  ),
);
const header = Buffer.alloc(33);
Buffer.from("89504e470d0a1a0a", "hex").copy(header);
header.write("IHDR", 12);
header.writeUInt32BE(1200, 16);
header.writeUInt32BE(630, 20);
const payload = () => ({
  url: "https://example.com/blog?a=1",
  dna: structuredClone(gallery.sites["news.ycombinator.com"]),
  camera: { position: [7, 5, 10], target: [0, 3, 0] },
  rendererVersion: 1,
  image: "data:image/png;base64," + header.toString("base64"),
});
test('missing shared trees serve the custom 404 and HEAD omits its body', async () => {
  for (const method of ['GET', 'HEAD']) {
    const response = {
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      status(code) { this.statusCode = code; return this; },
      end(body) { this.body = body; },
    };
    await treeHandler({ method, query: { id: '0'.repeat(32) }, headers: { host: 'plants.example' } }, response);
    assert.equal(response.statusCode, 404);
    assert.equal(response.headers['Content-Type'], 'text/html; charset=utf-8');
    assert.equal(response.headers['X-Robots-Tag'], 'noindex');
    if (method === 'HEAD') assert.equal(response.body, undefined);
    else {
      const html = response.body.toString();
      assert.ok(html.includes('A little off the path.'));
      assert.ok(html.includes('href="/"'));
      assert.ok(html.includes('src="/404.js"'));
    }
  }
});
test('Blob missing records and images are 404s, while access failures remain errors', async () => {
  const original = getGlobalDispatcher();
  const agent = new MockAgent();
  agent.disableNetConnect();
  setGlobalDispatcher(agent);
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
  process.env.VERCEL_BLOB_API_URL = 'https://blob.test';
  try {
    const pool = agent.get('https://blob.test');
    for (const read of [loadTree, loadTreeImage]) {
      pool.intercept({ path: /.*/, method: 'GET' }).reply(404, { error: { code: 'not_found' } });
      assert.equal(await read('0'.repeat(32)), null);
    }
    pool.intercept({ path: /.*/, method: 'GET' }).reply(403, { error: { code: 'forbidden' } });
    await assert.rejects(loadTree('0'.repeat(32)), /Access denied/);
    agent.assertNoPendingInterceptors();
  } finally {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.VERCEL_BLOB_API_URL;
    setGlobalDispatcher(original);
    await agent.close();
  }
});
test("share snapshot persists the full URL, DNA and camera and retries keep the same ID", async () => {
  const body = payload(),
    one = await saveTree(body),
    two = await saveTree(body);
  assert.equal(one.id, two.id);
  const saved = await loadTree(one.id);
  assert.equal(saved.url, body.url);
  assert.deepEqual(saved.dna, body.dna);
  assert.deepEqual(saved.camera, body.camera);
  assert.equal(await loadTree("../outside"), null);
  body.camera.position[0] = 8;
  assert.notEqual((await saveTree(body)).id, one.id);
});
test("invalid and oversized uploads cannot set arbitrary renderer parameters", () => {
  for (const change of [
    (b) => (b.dna.seed = Infinity),
    (b) => (b.dna.flowers.primary = "url(javascript:x)"),
    (b) => (b.camera.position = [0, 0, Infinity]),
    (b) => (b.url = "file:///etc/passwd"),
    (b) => (b.image = "data:image/svg+xml;base64,AA=="),
    (b) => (b.image = "x".repeat(4 * 1024 * 1024)),
  ]) {
    const body = payload();
    change(body);
    assert.throws(() => validateShare(body));
  }
  const body = payload();
  body.dna.debug = "leafHide=1";
  assert.equal(validateShare(body).snapshot.dna.debug, undefined);
});
test("shared page supplies unique initial HTML metadata and escapes embedded data", async () => {
  const template = await readFile(
    new URL("../app/public/index.html", import.meta.url),
    "utf8",
  );
  const { snapshot, id } = validateShare(payload());
  snapshot.url += "&x=</script><script>alert(1)</script>";
  const html = treePage(template, snapshot, id, "https://plants.example");
  assert.ok(html.includes(`https://plants.example/t/${id}/image.png`));
  assert.ok(html.includes("summary_large_image"));
  assert.ok(html.includes("window.__PLANTS_TREE__="));
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(!html.includes("sitebonsai.vercel.app/og.png"));
  assert.ok(!html.includes("whyList"));
});
