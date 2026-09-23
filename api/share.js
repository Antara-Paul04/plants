import { saveTree, MAX_SHARE_BYTES } from "../lib/shared-trees.js";
export const config = { maxDuration: 30 };
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "POST only." });
  // The interactive client is same-origin. Do not expose a cross-site upload API.
  const origin = req.headers.origin;
  try {
    if (origin && new URL(origin).host !== req.headers.host)
      throw new Error("origin");
  } catch {
    return res.status(403).json({ ok: false, error: "Invalid origin." });
  }
  if (Number(req.headers["content-length"]) > MAX_SHARE_BYTES)
    return res.status(413).json({ ok: false, error: "Postcard too large." });
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ ok: false, error: "Invalid postcard." });
  }
  try {
    const saved = await saveTree(body);
    return res.status(201).json({ ok: true, ...saved });
  } catch (error) {
    console.error("share:", error.message);
    return res
      .status(error.status || 503)
      .json({
        ok: false,
        error: "We couldn’t save this postcard. Please try again.",
      });
  }
}
