import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getMyWorkerProfile, getCategories, updateMyWorkerProfile, submitVerification } from '../../api/client.js';
import { ErrorNote } from '../../components/shared/ui.jsx';
import { Icons } from '../../components/shared/icons.jsx';
import { fileToDataUrl } from '../../utils/files.js';
import { matchFaces } from '../../utils/faceMatch.js';

// Guided worker verification onboarding: upload ID → capture selfie → skills →
// certifications → submit for admin review. An admin compares the selfie with
// the ID to confirm the same person, and previews the uploaded certificates.
// Two verification paths — both end at the SAME "verified" status (same tier).
//   physical → admin confirms in person; no device, no upload, no biometric.
//   online   → upload ID + live selfie; the system compares them (self-service).
const STEP_LABELS = { id: 'Identity document', selfie: 'Face scan', skills: 'Skills', certs: 'Certifications', review: 'Review' };
const STEPS_ONLINE = ['id', 'selfie', 'skills', 'certs', 'review'];
const STEPS_PHYSICAL = ['skills', 'certs', 'review'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB per uploaded file
const tooBig = (f) => f.size > MAX_FILE_BYTES;

export default function WorkerOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState(null); // 'physical' | 'online'
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const STEP_KEYS = method === 'online' ? STEPS_ONLINE : STEPS_PHYSICAL;
  const stepKey = STEP_KEYS[step];

  // collected data
  const [idDoc, setIdDoc] = useState(null);        // { name, type, dataUrl } — kept in memory only, never uploaded
  const [idBusy, setIdBusy] = useState(false);
  const [selfie, setSelfie] = useState(null);      // dataURL or 'simulated' — kept in memory only
  const [faceMatch, setFaceMatch] = useState(null); // { score, passed } | { error }
  const [matching, setMatching] = useState(false);
  const [skills, setSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState('');
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState('');
  const [certFiles, setCertFiles] = useState([]);  // [{ name, type, dataUrl }]

  const cats = useRef([]);
  const [catNames, setCatNames] = useState([]);
  useEffect(() => {
    getMyWorkerProfile().then((me) => {
      setSkills((me.skills || '').split(',').map((s) => s.trim()).filter(Boolean));
      setBio(me.bio || ''); setEducation(me.education || '');
    }).catch(() => {});
    getCategories().then((c) => { cats.current = c; setCatNames(c.map((x) => x.name)); }).catch(() => {});
  }, []);

  async function onIdFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file after an error
    if (!file) return;
    setErr('');
    if (tooBig(file)) { setErr(`That file is ${(file.size / 1048576).toFixed(1)}MB — the limit is 5MB. Please choose a smaller photo or PDF.`); return; }
    setIdBusy(true);
    try { setIdDoc(await fileToDataUrl(file)); }
    catch (e2) { setErr(e2.message); }
    finally { setIdBusy(false); }
  }
  async function onCertFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file
    if (!files.length) return;
    setErr('');
    const oversized = files.filter(tooBig);
    if (oversized.length) { setErr(`${oversized.map((f) => f.name).join(', ')} exceeds the 5MB limit — please upload smaller files.`); }
    const ok = files.filter((f) => !tooBig(f));
    if (!ok.length) return;
    try {
      const parsed = await Promise.all(ok.map((f) => fileToDataUrl(f)));
      setCertFiles((prev) => [...prev, ...parsed]);
    } catch (e2) { setErr(e2.message); }
  }
  const removeCert = (i) => setCertFiles((prev) => prev.filter((_, x) => x !== i));

  // ---- camera (face scan) ----
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camErr, setCamErr] = useState('');
  const stopCam = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  async function startCam() {
    setCamErr('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}); }
    } catch {
      setCamErr("Camera unavailable or blocked — you can simulate the scan for this demo.");
    }
  }
  // Match-then-discard: compare the selfie with the ID entirely in the browser.
  // We keep only the verdict (score/passed); the images are never uploaded.
  async function runMatch(selfieUrl) {
    if (!idDoc?.dataUrl || !selfieUrl || selfieUrl === 'simulated') return;
    setMatching(true); setFaceMatch(null);
    try {
      const r = await matchFaces(selfieUrl, idDoc.dataUrl);
      setFaceMatch(r.ok ? { score: r.score, passed: r.likelySame } : { error: r.reason });
    } catch {
      setFaceMatch({ error: 'Could not run the on-device check.' });
    } finally { setMatching(false); }
  }
  function capture() {
    const v = videoRef.current;
    if (v && v.videoWidth) {
      const scale = Math.min(1, 720 / v.videoWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(v.videoWidth * scale);
      c.height = Math.round(v.videoHeight * scale);
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      const url = c.toDataURL('image/jpeg', 0.88);
      setSelfie(url);
      runMatch(url); // compare on-device; images stay local
    } else {
      setSelfie('simulated');
    }
    stopCam();
  }
  // start/stop camera as the selfie step comes in/out of view
  useEffect(() => {
    if (stepKey === 'selfie' && !selfie) startCam();
    else stopCam();
    return stopCam;
  }, [stepKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSkill = (n) => setSkills((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));
  const addCustom = () => { const v = customSkill.trim(); if (v && !skills.includes(v)) setSkills([...skills, v]); setCustomSkill(''); };

  function next() {
    setErr('');
    // On the online path the ID + selfie are the point of the method — ask for
    // them (a worker who can't should pick in-person instead). Skills are needed
    // on both paths so the profile is usable.
    if (stepKey === 'id' && !idDoc) return setErr('Upload your ID — or go back and choose in-person verification.');
    if (stepKey === 'selfie' && !selfie) return setErr('Capture your selfie — or go back and choose in-person verification.');
    if (stepKey === 'skills' && skills.length === 0) return setErr('Add at least one skill.');
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  }
  // Back from the first step returns to the method chooser.
  const back = () => { setErr(''); if (step === 0) { setMethod(null); } else { setStep((s) => Math.max(s - 1, 0)); } };

  async function submit() {
    setErr(''); setSubmitting(true);
    try {
      // Keep the certificate names on the profile so the public "Certifications"
      // list still shows them; the actual files go with the verification for the
      // admin to preview.
      await updateMyWorkerProfile({ skills: skills.join(', '), bio, education, certifications: certFiles.map((f) => f.name).join('\n') });
      const online = method === 'online';
      // Match-then-discard: the online path sends ONLY the face-match verdict —
      // never the ID or selfie images. They stay in the browser and are dropped.
      await submitVerification({
        method,                                  // 'physical' | 'online'
        faceMatchScore: online && faceMatch && !faceMatch.error ? faceMatch.score : null,
        faceMatchPassed: online && faceMatch && !faceMatch.error ? faceMatch.passed : null,
        certificationFiles: certFiles,           // credentials (kept for admin review)
      });
      navigate('/worker', { replace: true });
    } catch (e) { setErr(e.message); setSubmitting(false); }
  }

  return (
    <div className="onb">
      <div className="onb-head">
        <div className="brand"><span className="shell-logo">{Icons.spark}</span> <span className="shell-brand-name">TaPa Trust</span></div>
        <button className="onb-skip" onClick={() => navigate('/worker', { replace: true })}>Skip for now</button>
      </div>

      <div className="onb-body">
        {method === null ? (
          <div className="onb-card">
            <div className="onb-title">Choose how to verify</div>
            <p className="onb-sub">Both paths lead to the same <strong>Verified</strong> badge — pick the one that suits you. Verifying is optional; you can also earn Peer-Verified from well-reviewed jobs.</p>
            <div className="onb-methods">
              <button type="button" className="onb-method" onClick={() => { setMethod('physical'); setStep(0); setErr(''); }}>
                <span className="onb-method-ic">{Icons.user}</span>
                <span className="onb-method-t">Verify in person</span>
                <span className="onb-method-d">An admin, office or agent confirms you — no smartphone, no upload, no biometrics. Best if you don&apos;t have a capable phone.</span>
              </button>
              <button type="button" className="onb-method" onClick={() => { setMethod('online'); setStep(0); setErr(''); }}>
                <span className="onb-method-ic">{Icons.idCard}</span>
                <span className="onb-method-t">Verify online</span>
                <span className="onb-method-d">Upload your ID and take a live selfie; the system compares them. Do it yourself from your phone.</span>
              </button>
            </div>
          </div>
        ) : (
        <>
        <div className="onb-steps">
          {STEP_KEYS.map((k, i) => (
            <div key={k} className={`onb-step ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`}>
              <span className="onb-step-dot">{i < step ? Icons.check : i + 1}</span>
              <span className="onb-step-label">{STEP_LABELS[k]}</span>
            </div>
          ))}
        </div>

        <div className="onb-card">
          <div className="onb-title">{method === 'online' ? 'Verify online' : 'Verify in person'}</div>
          <p className="onb-sub">{method === 'online'
            ? 'Upload your ID and take a live selfie — the system compares them, and an admin confirms. Same Verified badge as in-person.'
            : 'Add your skills (and any certificates). An admin, office or agent confirms your identity in person — same Verified badge, no upload needed.'}</p>

          {stepKey === 'id' && (
            <div className="onb-pane">
              <h3 className="onb-h">Upload your ID document</h3>
              <p className="meta">A national ID, passport, or driver&apos;s licence.</p>
              <div className="onb-why">{Icons.shield} <span><strong>Private by design:</strong> your ID and selfie are compared <em>on your device</em> and never uploaded — only the match result is saved. Prefer not to? Go back and choose in-person.</span></div>
              <label className={`onb-drop ${idBusy ? 'is-busy' : ''}`}>
                {idBusy ? <span className="meta">Processing…</span>
                  : idDoc ? (
                    <>
                      {idDoc.type?.startsWith('image/')
                        ? <img className="onb-doc-thumb" src={idDoc.dataUrl} alt="ID preview" />
                        : <span className="onb-drop-ic">{Icons.idCard}</span>}
                      <span className="onb-drop-name">{idDoc.name}</span>
                      <span className="meta">Tap to replace</span>
                    </>
                  ) : (
                    <><span className="onb-drop-ic">{Icons.upload}</span><span>Tap to choose a photo of your ID</span><span className="meta">JPG, PNG or PDF · max 5MB</span></>
                  )}
                <input type="file" accept="image/*,.pdf" hidden onChange={onIdFile} />
              </label>
            </div>
          )}

          {stepKey === 'selfie' && (
            <div className="onb-pane">
              <h3 className="onb-h">Scan your face</h3>
              <p className="meta">Center your face and capture — a free on-device face engine scans it and matches it to the photo on your ID.</p>
              <div className="onb-why">{Icons.shield} <span><strong>Match-then-discard:</strong> the face scan and the ID are compared here in your browser; neither is uploaded — only the match result is saved.</span></div>
              <div className="onb-cam">
                {selfie && selfie !== 'simulated'
                  ? <img src={selfie} alt="Captured selfie" />
                  : selfie === 'simulated'
                    ? <div className="onb-cam-sim">{Icons.checkCircle}<span>Scan simulated</span></div>
                    : <video ref={videoRef} playsInline muted />}
              </div>
              {camErr && <p className="meta" style={{ color: 'var(--color-orange-600)' }}>{camErr}</p>}
              {selfie && selfie !== 'simulated' && (
                <div className="onb-match">
                  {matching ? <span className="meta">Comparing with your ID on-device… (first run loads the model)</span>
                    : faceMatch?.error ? <span className="meta" style={{ color: 'var(--color-orange-600)' }}>{faceMatch.error} You can still submit — an admin will confirm.</span>
                      : faceMatch ? <span className={`onb-match-res ${faceMatch.passed ? 'is-ok' : 'is-no'}`}>{faceMatch.passed ? Icons.checkCircle : Icons.shield} Face match: {faceMatch.score}% — {faceMatch.passed ? 'looks like the same person' : 'weak match, review advised'}</span>
                        : null}
                </div>
              )}
              <div className="row" style={{ justifyContent: 'center', marginTop: '0.75rem' }}>
                {!selfie && !camErr && <button className="btn-primary" onClick={capture}>Scan my face</button>}
                {!selfie && camErr && <button className="btn-primary" onClick={() => setSelfie('simulated')}>Simulate scan</button>}
                {selfie && <button className="btn-secondary" onClick={() => { setSelfie(null); setFaceMatch(null); startCam(); }}>Scan again</button>}
              </div>
            </div>
          )}

          {stepKey === 'skills' && (
            <div className="onb-pane">
              <h3 className="onb-h">What do you do?</h3>
              <p className="meta">Pick your service categories and add any others.</p>
              <div className="row" style={{ marginTop: '0.5rem' }}>
                {catNames.map((n) => (
                  <button type="button" key={n} className={skills.includes(n) ? 'chip' : 'chip-opt'} onClick={() => toggleSkill(n)}>
                    {skills.includes(n) ? '✓ ' : ''}{n}
                  </button>
                ))}
              </div>
              <div className="row" style={{ marginTop: '0.75rem' }}>
                {skills.filter((s) => !catNames.includes(s)).map((s) => (
                  <span className="chip" key={s}>{s}<button type="button" onClick={() => toggleSkill(s)} aria-label={`Remove ${s}`}>×</button></span>
                ))}
              </div>
              <div className="row" style={{ marginTop: '0.5rem' }}>
                <input className="input" style={{ flex: 1, minWidth: '160px' }} value={customSkill} onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} placeholder="Add another skill, e.g. Tiling" />
                <button type="button" className="btn-secondary" onClick={addCustom}>Add</button>
              </div>
            </div>
          )}

          {stepKey === 'certs' && (
            <div className="onb-pane">
              <h3 className="onb-h">Experience & certifications</h3>
              <div className="form" style={{ maxWidth: '100%' }}>
                <label>Short bio
                  <textarea className="textarea" rows={2} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell requesters about your work and experience." />
                </label>
                <label>Education
                  <textarea className="textarea" rows={2} value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. Diploma in Plumbing, IPRC Kigali" />
                </label>
                <div>
                  <span className="field-label">Certificates</span>
                  <p className="meta" style={{ margin: '0.15rem 0 0.5rem' }}>Upload photos or PDFs of your certificates — an admin previews each one to confirm it&apos;s genuine.</p>
                  <label className="onb-drop onb-drop--sm">
                    <span className="onb-drop-ic">{Icons.upload}</span><span>Tap to upload certificates</span><span className="meta">JPG, PNG or PDF · max 5MB each · add several</span>
                    <input type="file" accept="image/*,.pdf" multiple hidden onChange={onCertFiles} />
                  </label>
                  {certFiles.length > 0 && (
                    <div className="onb-files">
                      {certFiles.map((f, i) => (
                        <div className="onb-file" key={`${f.name}-${i}`}>
                          {f.type?.startsWith('image/') ? <img src={f.dataUrl} alt="" /> : <span className="onb-file-ic">{Icons.certificate}</span>}
                          <span className="onb-file-name">{f.name}</span>
                          <button type="button" className="onb-file-x" onClick={() => removeCert(i)} aria-label={`Remove ${f.name}`}>{Icons.close}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {stepKey === 'review' && (
            <div className="onb-pane">
              <h3 className="onb-h">Review & submit</h3>
              <ul className="onb-review">
                <li><span>Method</span><b>{method === 'online' ? 'Online (on-device face match)' : 'In person'}</b></li>
                {method === 'online' && <li><span>Face match</span><b>{faceMatch?.error ? 'Not conclusive' : faceMatch ? `${faceMatch.score}% ${faceMatch.passed ? '✓' : '(weak)'}` : '—'}</b></li>}
                <li><span>Skills</span><b>{skills.join(', ') || '—'}</b></li>
                <li><span>Education</span><b>{education || '—'}</b></li>
                <li><span>Certificates</span><b>{certFiles.length ? `✓ ${certFiles.length} uploaded` : '—'}</b></li>
              </ul>
              {method === 'online' && <p className="meta" style={{ marginBottom: '0.5rem' }}>Your ID &amp; selfie were compared on your device and are <strong>not uploaded or stored</strong> — only the match result above is saved.</p>}
              <p className="meta">{method === 'online'
                ? 'An admin reviews the match result and approves you.'
                : 'An admin, office or agent confirms your identity in person and approves you.'} You&apos;ll appear in Browse once verified — or earn Peer-Verified from well-reviewed jobs.</p>
            </div>
          )}

          <ErrorNote message={err} />

          <div className="onb-actions">
            <button className="btn-secondary" onClick={back} disabled={submitting}>Back</button>
            {step < STEP_KEYS.length - 1
              ? <button className="btn-primary" onClick={next}>Continue</button>
              : <button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit for review'}</button>}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
