// In-browser biometric compare for the ONLINE verification path — compares the
// worker's live selfie against the face on their uploaded ID and returns a
// similarity score. It assists the admin's confirmation; it is not an auto-gate,
// and the in-person path reaches the same "verified" status without it. The
// model (face-api.js + weights) is lazy-loaded from a CDN the first time it runs,
// so it adds nothing to the app bundle; failures degrade to "compare manually".

const VERSION = '1.7.14';
const LIB = `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${VERSION}/dist/face-api.esm.js`;
const MODELS = `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${VERSION}/model`;

let apiPromise = null;
async function loadFaceApi() {
  if (apiPromise) return apiPromise;
  apiPromise = (async () => {
    let faceapi;
    try {
      faceapi = await import(/* @vite-ignore */ LIB);
    } catch (e) {
      throw new Error(`model library failed to load (${e.message || e})`);
    }
    // Pin a browser backend before loading models — WebGL, falling back to CPU.
    // Auto-detection sometimes tries a WASM backend whose assets aren't hosted.
    try {
      const tf = faceapi.tf;
      if (tf?.setBackend) {
        const ok = await tf.setBackend('webgl').catch(() => false);
        if (ok === false) await tf.setBackend('cpu').catch(() => {});
        await tf.ready?.();
      }
    } catch { /* use whatever backend the library picks */ }
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS);
    } catch (e) {
      throw new Error(`model weights failed to load (${e.message || e})`);
    }
    return faceapi;
  })().catch((e) => { apiPromise = null; throw e; });
  return apiPromise;
}

// Load a data-URL into an <img>. No crossOrigin — these are same-origin data
// URIs; setting it can make some browsers reject the load.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });
}

// face-api's descriptor euclidean distance for the SAME person is typically
// ~0.3–0.55, and its FaceMatcher uses 0.6 as the default "same person" cutoff.
// A selfie-vs-ID compare (different lighting, an older/printed ID photo, a small
// face) sits at the high end of that range, so distance ≤ 0.6 counts as a match.
const MATCH_DISTANCE = 0.6;

// Displayed pass bar (%). The score is mapped from distance so this bar lands
// exactly on the match cutoff: distance 0 → 100%, distance MATCH_DISTANCE → 65%.
// So "score ≥ 65%" is equivalent to "distance ≤ 0.6" — the displayed number and
// the pass/fail verdict never disagree.
export const MATCH_THRESHOLD = 65;

// Calibrated distance → similarity %. Linear, clamped, with MATCH_DISTANCE
// mapped to MATCH_THRESHOLD. Beats the naive (1 - distance) * 100, which put a
// genuine 0.5-distance match at only 50% and failed real people.
export function scoreForDistance(distance) {
  const pct = 100 - ((100 - MATCH_THRESHOLD) / MATCH_DISTANCE) * distance;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

// Very low confidence on purpose: the face photo on a real ID card is only ~15%
// of the frame, and SSD (which resizes internally, so absolute pixels don't help)
// scores such small faces ~0.16 — the 0.5 default and even 0.3 MISS them, so the
// ID reads as "no face". 0.1 catches them. It can't wave impostors through: the
// match verdict is descriptor DISTANCE (the 65% bar), not detection confidence.
function detectorOptions(faceapi) {
  return new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1, maxResults: 1 });
}

// Returns { ok, score (0-100), distance, likelySame, reason }.
export async function matchFaces(selfieUrl, idUrl) {
  const faceapi = await loadFaceApi();
  const opts = detectorOptions(faceapi);
  // Load each separately so we can say which one couldn't be read (e.g. a PDF
  // or HEIC ID that isn't a decodable photo).
  let selfie, id;
  try { selfie = await loadImage(selfieUrl); } catch { return { ok: false, reason: 'Could not read your selfie — scan again.' }; }
  try { id = await loadImage(idUrl); } catch { return { ok: false, reason: 'Could not read the ID as a photo — upload a clear JPG/PNG image of your ID (not a PDF).' }; }
  const a = await faceapi.detectSingleFace(selfie, opts).withFaceLandmarks().withFaceDescriptor();
  const b = await faceapi.detectSingleFace(id, opts).withFaceLandmarks().withFaceDescriptor();
  if (!a || !b) {
    const reason = !a && !b ? 'No face detected in either image'
      : !a ? 'No face detected in the selfie' : 'No clear face detected on the ID';
    return { ok: false, reason };
  }
  const distance = faceapi.euclideanDistance(a.descriptor, b.descriptor);
  const score = scoreForDistance(distance);
  // Verdict derived from the same score that's shown, so they can't disagree.
  return { ok: true, distance, score, likelySame: score >= MATCH_THRESHOLD };
}

// Lightweight authenticity signal for the uploaded ID: does it actually contain
// a detectable face? Rejects screenshots/blank/non-ID images. (True document
// tamper / NIDA cross-checks are future work — see FUTURE_WORK.md.)
export async function detectIdFace(idUrl) {
  try {
    const faceapi = await loadFaceApi();
    const img = await loadImage(idUrl);
    const d = await faceapi.detectSingleFace(img, detectorOptions(faceapi));
    return { ok: true, hasFace: Boolean(d) };
  } catch {
    return { ok: false, hasFace: false };
  }
}
