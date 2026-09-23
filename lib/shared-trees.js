import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { put, head, BlobNotFoundError } from "@vercel/blob";

export const MAX_SHARE_BYTES = 3 * 1024 * 1024;
const ID = /^[a-f0-9]{32}$/;
const color = (value) => value === null || /^#[a-f\d]{6}$/i.test(value);
const oneOf = (value, values) => values.includes(value);
export function validateShare(body) {
  if (!body || JSON.stringify(body).length > MAX_SHARE_BYTES)
    throw new Error("This postcard is too large.");
  let url;
  try {
    url = new URL(body.url);
  } catch {
    throw new Error("Invalid website address.");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    !url.hostname.includes(".") ||
    url.href.length > 2048
  )
    throw new Error("Invalid website address.");
  url.username = "";
  url.password = "";
  const d = body.dna;
  if (
    !d ||
    !oneOf(d.morphology, ["broad"]) ||
    !oneOf(d.skeleton?.complexity, ["simple", "normal", "rich"]) ||
    !oneOf(d.foliage?.state, ["bare", "sparse", "normal", "lush"]) ||
    !oneOf(d.foliage?.density, ["airy", "normal", "dense"]) ||
    !oneOf(d.botanicalState, ["normal", "flowering", "autumn", "winter"]) ||
    !oneOf(d.flowers?.amount, ["none", "few", "medium", "abundant"]) ||
    !color(d.flowers.primary) ||
    !color(d.flowers.secondary) ||
    typeof d.fruit?.enabled !== "boolean" ||
    !color(d.fruit.color) ||
    !oneOf(d.terrain, ["sparse", "normal", "lush", "autumn", "winter"]) ||
    !/^#[a-f\d]{6}$/i.test(d.background) ||
    !Number.isInteger(d.seed) ||
    d.seed < 0 ||
    d.seed > 0xffffffff
  )
    throw new Error("Invalid tree.");
  const camera = body.camera;
  if (
    !camera ||
    !["position", "target"].every(
      (k) =>
        Array.isArray(camera[k]) &&
        camera[k].length === 3 &&
        camera[k].every((v) => Number.isFinite(v) && Math.abs(v) <= 200),
    )
  )
    throw new Error("Invalid camera.");
  const distance = Math.hypot(
    ...camera.position.map((v, i) => v - camera.target[i]),
  );
  if (distance < 2 || distance > 150)
    throw new Error("Invalid camera distance.");
  if (body.rendererVersion !== 1) throw new Error("Unsupported tree version.");
  if (
    typeof body.image !== "string" ||
    !/^data:image\/png;base64,[a-z\d+/]+=*$/i.test(body.image)
  )
    throw new Error("Invalid postcard image.");
  const image = Buffer.from(body.image.split(",")[1], "base64");
  if (
    image.length < 33 ||
    image.length > 2 * 1024 * 1024 ||
    image.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
    image.toString("ascii", 12, 16) !== "IHDR" ||
    image.readUInt32BE(16) !== 1200 ||
    image.readUInt32BE(20) !== 630
  )
    throw new Error("Invalid postcard dimensions.");
  // Explicit fields only: callers cannot introduce renderer/debug parameters.
  const dna = {
    morphology: d.morphology,
    skeleton: { complexity: d.skeleton.complexity },
    foliage: { state: d.foliage.state, density: d.foliage.density },
    botanicalState: d.botanicalState,
    flowers: {
      amount: d.flowers.amount,
      primary: d.flowers.primary,
      secondary: d.flowers.secondary,
    },
    fruit: { enabled: d.fruit.enabled, color: d.fruit.color },
    terrain: d.terrain,
    background: d.background,
    seed: d.seed,
    rareCat: false,
  };
  const snapshot = {
    version: 1,
    rendererVersion: 1,
    url: url.href,
    domain: url.hostname.replace(/^www\./, ""),
    dna,
    camera: { position: [...camera.position], target: [...camera.target] },
  };
  const id = createHash("sha256")
    .update(JSON.stringify(snapshot))
    .update(image)
    .digest("hex")
    .slice(0, 32);
  return { id, snapshot, image };
}

const usesBlob = () =>
  !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const localRoot = () =>
  process.env.PLANTS_SHARE_DIR ? resolve(process.env.PLANTS_SHARE_DIR) : null;
const file = (id, ext) => `trees/v1/${id}.${ext}`;
export async function saveTree(body) {
  let validated;
  try {
    validated = validateShare(body);
  } catch (error) {
    error.status = 400;
    throw error;
  }
  const { id, snapshot, image } = validated;
  if (usesBlob()) {
    // Content-addressed files make retries idempotent and images immutable.
    const options = {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 31536000,
    };
    await put(file(id, "png"), image, { ...options, contentType: "image/png" });
    await put(file(id, "json"), JSON.stringify(snapshot), {
      ...options,
      contentType: "application/json",
    });
  } else if (localRoot()) {
    await mkdir(localRoot(), { recursive: true });
    await writeFile(resolve(localRoot(), `${id}.png`), image);
    await writeFile(
      resolve(localRoot(), `${id}.json`),
      JSON.stringify(snapshot),
    );
  } else {
    const error = new Error("Sharing storage is not connected.");
    error.status = 503;
    throw error;
  }
  return { id, path: `/t/${id}` };
}
export async function loadTree(id) {
  if (!ID.test(id || "")) return null;
  try {
    if (usesBlob()) {
      const blob = await head(file(id, "json"));
      const response = await fetch(blob.url, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return null;
      return await response.json();
    }
    if (localRoot())
      return JSON.parse(
        await readFile(resolve(localRoot(), `${id}.json`), "utf8"),
      );
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof BlobNotFoundError)
      return null;
    throw error;
  }
  return null;
}
export async function loadTreeImage(id) {
  if (!ID.test(id || "")) return null;
  if (usesBlob()) {
    try {
      const blob = await head(file(id, "png"));
      return { url: blob.url };
    } catch (error) {
      if (error instanceof BlobNotFoundError) return null;
      throw error;
    }
  }
  if (localRoot()) {
    try {
      return { bytes: await readFile(resolve(localRoot(), `${id}.png`)) };
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  }
  return null;
}
const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
export function treePage(template, snapshot, id, origin) {
  const title = `${snapshot.domain} grew this tree — Plants`;
  const image = `${origin}/t/${id}/image.png`,
    canonical = `${origin}/t/${id}`;
  const tags = `<meta property="og:type" content="website" />\n<meta property="og:site_name" content="Plants" />\n<meta property="og:title" content="${escapeHtml(title)}" />\n<meta property="og:description" content="A little world from a website. What will yours become?" />\n<meta property="og:url" content="${escapeHtml(canonical)}" />\n<meta property="og:image" content="${escapeHtml(image)}" />\n<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />\n<meta property="og:image:alt" content="A miniature tree grown from ${escapeHtml(snapshot.domain)}" />\n<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${escapeHtml(title)}" /><meta name="twitter:image" content="${escapeHtml(image)}" />`;
  const data = JSON.stringify(snapshot)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return template
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<!-- share-meta:start -->[\s\S]*?<!-- share-meta:end -->/, tags)
    .replace(
      "</head>",
      `<link rel="canonical" href="${escapeHtml(canonical)}" /><script>window.__PLANTS_TREE__=${data};</script></head>`,
    );
}
