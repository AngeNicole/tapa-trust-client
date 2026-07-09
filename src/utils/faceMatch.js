// Optional, in-browser biometric assist for the admin — compares the worker's
// selfie against the face on their ID and returns a similarity score. It is a
// convenience only: it never blocks approval, and the admin's own eyes remain
// the decision. The model (face-api.js + weights) is lazy-loaded from a CDN the
// first time an admin runs it, so it adds nothing to the app bundle. Everything
// is wrapped so a load/detection failure degrades to "compare manually".

const VERSION = '1.7.14';
const LIB = `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${VERSION}/dist/face-api.esm.js`;
const MODELS = `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${VERSION}/model`;

let apiPromise = null;
async function loadFaceApi() {
  if (apiPromise) return apiPromise;
  apiPromise = (async () => {
    const faceapi = await import(/* @vite-ignore */ LIB);
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS);
    return faceapi;
  })().catch((e) => { apiPromise = null; throw e; });
  return apiPromise;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

// Returns { ok, score (0-100), distance, likelySame, reason }.
export async function matchFaces(selfieUrl, idUrl) {
  const faceapi = await loadFaceApi();
  const [selfie, id] = await Promise.all([loadImage(selfieUrl), loadImage(idUrl)]);
  const a = await faceapi.detectSingleFace(selfie).withFaceLandmarks().withFaceDescriptor();
  const b = await faceapi.detectSingleFace(id).withFaceLandmarks().withFaceDescriptor();
  if (!a || !b) {
    const reason = !a && !b ? 'No face detected in either image'
      : !a ? 'No face detected in the selfie' : 'No clear face detected on the ID';
    return { ok: false, reason };
  }
  const distance = faceapi.euclideanDistance(a.descriptor, b.descriptor);
  // face-api convention: distance < ~0.5 is a strong match; scale to a 0-100 score.
  const score = Math.max(0, Math.min(100, Math.round((1 - distance / 0.6) * 100)));
  return { ok: true, distance, score, likelySame: distance < 0.5 };
}
