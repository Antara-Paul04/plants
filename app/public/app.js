import { mountIdle } from "/tree/main.js";
import { makeCard } from "/card.js";

const $ = (id) => document.getElementById(id);
const input = $("url"),
  dock = document.querySelector(".dock"),
  status = $("status");
const result = $("result"),
  dialog = $("shareDialog");
let tree,
  current = null,
  generation = 0,
  pending = null,
  lastInput = "",
  lastRaw = "",
  shareGeneration = 0;
let busy = false,
  shareFile = null,
  motionPaused = matchMedia("(prefers-reduced-motion: reduce)").matches;
const initialSnapshot = window.__PLANTS_TREE__;

function setState(phase, message, retry = false) {
  busy = phase === "reading" || phase === "building";
  dock.dataset.state = phase;
  dock.setAttribute("aria-busy", String(busy));
  status.textContent = message;
  $("retry").hidden = !retry;
  $("go").textContent = busy ? "Grow another ↗" : "Grow a tree ↗";
}

function normalizedUrl(raw) {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (
      !["http:", "https:"].includes(u.protocol) ||
      !u.hostname.includes(".") ||
      /\s/.test(u.hostname)
    )
      return null;
    if (
      !u.hostname.split(".").every((s) => /^[a-z0-9-]+$/i.test(s)) ||
      !/[a-z]/i.test(u.hostname.split(".").at(-1))
    )
      return null;
    u.username = "";
    u.password = "";
    return u.href;
  } catch {
    return null;
  }
}

function setTheme(dna) {
  document.body.classList.toggle("night", tree.envName === "night");
  const seasonal = { autumn: "#98663d", winter: "#607569" };
  const raw = dna.fruit?.color || dna.flowers?.primary;
  const valid = /^#[\da-f]{6}$/i.test(raw || "");
  document.documentElement.style.setProperty("--tint", valid ? raw : "#9aaa88");
  // Keep the action readable: mix any tree colour down into the established moss/clay range.
  const night = tree.envName === "night";
  const color = seasonal[dna.botanicalState] || (valid ? raw : "#486546");
  document.documentElement.style.setProperty(
    "--accent",
    night
      ? `color-mix(in srgb, ${color} 28%, #dce6c7)`
      : `color-mix(in srgb, ${color} 40%, #263d29)`,
  );
}

function commit(data, { example = false, shared = false } = {}) {
  current = { ...data, example };
  document.title = example ? "Plants — a little life from any website" : `${data.domain} grew this tree — Plants`;
  setTheme(data.dna);
  $("domain").textContent = data.domain;
  $("caption").textContent = example
    ? "A LITTLE INSPIRATION"
    : shared
      ? "A TREE, SHARED WITH YOU"
      : "GROWN FROM";
  $("shareBtn").hidden = example;
  result.hidden = false;
  $("scene").setAttribute(
    "aria-label",
    `A tree grown from ${data.domain}. Drag or use arrow keys to turn it. Press Space to stir its leaves.`,
  );
  setState(
    "ready",
    example
      ? "Every website grows differently. Try yours."
      : data.live === false
        ? "A saved tree. Ready for a little breeze."
        : "A little world, all yours.",
  );
}

const failureCopy = {
  INVALID_URL: "Enter a website address, like example.com.",
  NOT_FOUND: "We couldn’t find that page. Check the address and try again.",
  BLOCKED: "We couldn’t get a clear look at that website. Try another one.",
  REFUSED: "That website wouldn’t let us take a look. Try another one.",
  REDIRECTED:
    "That address sent us somewhere else. Try the final website address.",
  NOT_A_PAGE: "That looks like a file. Try a website address instead.",
  TIMEOUT: "This one needs more time than we could give it. Try again?",
  NOT_RENDERED: "That page didn’t finish loading for us. Try again?",
  OFFLINE: "We couldn’t reach the internet. Please try again.",
};

async function grow(raw) {
  const url = normalizedUrl(raw);
  if (!url) {
    input.setAttribute("aria-invalid", "true");
    // Cancel an older request so it cannot overwrite this field-level error later.
    ++generation;
    pending?.abort();
    tree?.cancelPending();
    setState("error", failureCopy.INVALID_URL);
    input.focus();
    return;
  }
  if (!tree || (busy && lastInput === url)) return;
  input.removeAttribute("aria-invalid");
  lastInput = url;
  lastRaw = raw;
  const mine = ++generation;
  pending?.abort();
  tree.cancelPending();
  const ac = (pending = new AbortController());
  closeShare();
  setState("reading", `Reading ${new URL(url).hostname}…`);
  const timeout = setTimeout(
    () => ac.abort(new Error("Request timed out")),
    65000,
  );
  let reassurance = setTimeout(() => {
    if (mine === generation)
      status.textContent = "Still reading. Some websites take a little longer.";
  }, 14000);
  try {
    const response = await fetch("/api/grow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: raw }),
      signal: ac.signal,
    });
    const data = await response.json();
    if (mine !== generation) return;
    if (!data.ok) {
      const code = String(data.failure?.code || "").toUpperCase();
      setState(
        "error",
        failureCopy[code] || "We couldn’t grow this one just now. Try again?",
        ![
          "INVALID_URL",
          "NOT_FOUND",
          "BLOCKED",
          "REFUSED",
          "NOT_A_PAGE",
        ].includes(code),
      );
      return;
    }
    clearTimeout(reassurance);
    setState("building", "Making your tree. Giving every leaf a place…");
    await tree.setDNA(data.dna);
    if (mine !== generation) return;
    commit({ ...data, url: data.url || url });
    history.replaceState(
      null,
      "",
      `/?site=${encodeURIComponent(data.url || url)}`,
    );
  } catch (error) {
    if (mine !== generation) return;
    setState(
      "error",
      ac.signal.aborted
        ? "We ran out of time for this one. Try again?"
        : "Something interrupted this tree. Let’s try again.",
      true,
    );
  } finally {
    clearTimeout(timeout);
    clearTimeout(reassurance);
    if (mine === generation) pending = null;
  }
}

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  grow(input.value.trim());
});
input.addEventListener("input", () => input.removeAttribute("aria-invalid"));
$("retry").addEventListener("click", () => grow(lastRaw));
$("motion").addEventListener("click", () => {
  motionPaused = !motionPaused;
  updateMotion();
});
function updateMotion() {
  tree?.setMotion(!motionPaused);
  $("motion").textContent = motionPaused ? "Play motion" : "Pause motion";
  $("motion").setAttribute("aria-pressed", String(motionPaused));
  $("hint").textContent = motionPaused
    ? "Drag to turn · Motion is paused"
    : "Drag to turn · Tap to stir";
}
matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
  "change",
  (e) => {
    motionPaused = e.matches;
    updateMotion();
  },
);

function closeShare() {
  ++shareGeneration;
  if (dialog.open) dialog.close();
}
$("closeShare").addEventListener("click", closeShare);
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeShare();
  }
});
dialog.addEventListener("close", () => {
  ++shareGeneration;
  tree?.setMotion(!motionPaused);
});
$("shareBtn").addEventListener("click", async () => {
  if (!current || current.example) return;
  const mine = ++shareGeneration,
    snapshot = current;
  shareFile = null;
  dialog.showModal();
  tree.setMotion(false);
  $("sharePreview").hidden = true;
  $("previewStatus").hidden = false;
  $("previewStatus").textContent = "Making your postcard…";
  $("shareStatus").textContent = "Saving this little world…";
  $("postX").removeAttribute("href");
  $("postX").setAttribute("aria-disabled", "true");
  $("copyLink").disabled = true;
  $("copyLink").textContent = "Copy link";
  $("saveImage").disabled = true;
  try {
    const camera = tree.getPose();
    const frame = await tree.capture({ width: 1200, height: 630 });
    const card = await makeCard(
      frame,
      snapshot.domain,
      tree.envName === "night",
    );
    if (mine !== shareGeneration) return;
    $("sharePreview").src = card;
    $("sharePreview").hidden = false;
    $("previewStatus").hidden = true;
    shareFile = new File(
      [await (await fetch(card)).blob()],
      `plants-${snapshot.domain}.png`,
      { type: "image/png" },
    );
    $("saveImage").disabled = false;
    const response = await fetch("/api/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: snapshot.url,
        dna: snapshot.dna,
        camera,
        image: card,
        rendererVersion: 1,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const saved = await response.json();
    if (mine !== shareGeneration) return;
    if (!response.ok || !saved.ok)
      throw new Error(
        saved.error ||
          "The link couldn’t be saved. You can still save your image.",
      );
    const shareUrl = new URL(saved.path, location.origin).href;
    $("postX").href =
      `https://x.com/intent/tweet?text=${encodeURIComponent(`${snapshot.domain} grew this little tree.`)}&url=${encodeURIComponent(shareUrl)}`;
    $("postX").setAttribute("aria-disabled", "false");
    $("copyLink").dataset.url = shareUrl;
    $("copyLink").disabled = false;
    $("shareStatus").textContent =
      "Ready to travel. This link opens your saved tree.";
  } catch (error) {
    if (mine !== shareGeneration) return;
    $("shareStatus").textContent = shareFile
      ? "The link couldn’t be saved. You can still save your image, or close and try again."
      : "We couldn’t capture this tree. Close this window and try again.";
    $("previewStatus").hidden = !!shareFile;
    if (!shareFile)
      $("previewStatus").textContent = "Your tree is still safe in the garden.";
  }
});
$("copyLink").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("copyLink").dataset.url);
    $("copyLink").textContent = "Copied!";
  } catch {
    $("shareStatus").textContent =
      `Your tree’s link: ${$("copyLink").dataset.url}`;
  }
});
$("saveImage").addEventListener("click", () => {
  if (!shareFile) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(shareFile);
  a.download = shareFile.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
});

async function start() {
  try {
    tree = mountIdle($("scene"), {
      allowQueryParams: false,
      autoRotate: !motionPaused,
      motion: !motionPaused,
      onEnv: (name) =>
        document.body.classList.toggle("night", name === "night"),
      viewportInsets: () => ({
        top: 94,
        bottom:
          document.querySelector(".garden-controls").getBoundingClientRect()
            .height + 42,
      }),
    });
    updateMotion();
    if (initialSnapshot) {
      setState("building", "Opening a little world…");
      await tree.setDNA(initialSnapshot.dna);
      tree.setPose(initialSnapshot.camera);
      input.value = initialSnapshot.url;
      commit(initialSnapshot, { shared: true });
      return;
    }
    const site = new URLSearchParams(location.search).get("site");
    if (site) {
      input.value = site;
      await grow(site);
      return;
    }
    setState("building", "A little inspiration is taking shape…");
    const mine = generation;
    const gallery = await (await fetch("/gallery.json")).json();
    if (mine !== generation) return;
    const requested = new URLSearchParams(location.search).get("example");
    const domain =
      requested && gallery.sites[requested]
        ? requested
        : "news.ycombinator.com";
    await tree.setDNA(gallery.sites[domain]);
    if (mine !== generation) return;
    commit(
      { domain, url: `https://${domain}/`, dna: gallery.sites[domain] },
      { example: true },
    );
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.error(error);
    setState(
      "error",
      tree
        ? "The garden couldn’t open just now. Try planting a website."
        : "This browser couldn’t open the 3D garden. Try a browser with WebGL enabled.",
    );
  }
}
start();
