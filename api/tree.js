import { readFile } from "node:fs/promises";
import { loadTree, loadTreeImage, treePage } from "../lib/shared-trees.js";
import { sendNotFound } from "../lib/not-found.js";
export const config = { maxDuration: 15 };
export default async function handler(req, res) {
  if (!["GET", "HEAD"].includes(req.method)) return res.status(405).end();
  const id = req.query?.id,
    image = req.query?.image === "1";
  try {
    if (image) {
      const record = await loadTreeImage(id);
      if (!record) return res.status(404).end();
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Type", "image/png");
      if (record.url) {
        const response = await fetch(record.url, {
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error("Image unavailable");
        return res
          .status(200)
          .end(
            req.method === "HEAD"
              ? undefined
              : Buffer.from(await response.arrayBuffer()),
          );
      }
      return res
        .status(200)
        .end(req.method === "HEAD" ? undefined : record.bytes);
    }
    const snapshot = await loadTree(id);
    if (!snapshot) return await sendNotFound(req, res);
    const template = await readFile(
      new URL("../app/public/index.html", import.meta.url),
      "utf8",
    );
    const host = req.headers.host;
    if (!/^[a-z\d.-]+(?::\d+)?$/i.test(host || ""))
      return res.status(400).end();
    const origin =
      process.env.PLANTS_PUBLIC_ORIGIN ||
      `${host.startsWith("localhost:") || host.startsWith("127.0.0.1:") ? "http" : "https"}://${host}`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400");
    return res
      .status(200)
      .end(
        req.method === "HEAD"
          ? undefined
          : treePage(template, snapshot, id, origin),
      );
  } catch (error) {
    console.error("shared tree:", error.message);
    res.setHeader("Cache-Control", "no-store");
    return res
      .status(503)
      .send("This tree is resting. Please try again shortly.");
  }
}
