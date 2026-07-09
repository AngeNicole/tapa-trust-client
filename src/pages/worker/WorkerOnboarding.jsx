import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getMyWorkerProfile, getCategories, updateMyWorkerProfile, submitVerification } from '../../api/client.js';
import { ErrorNote } from '../../components/shared/ui.jsx';
import { Icons } from '../../components/shared/icons.jsx';
import { fileToDataUrl } from '../../utils/files.js';

// Guided worker verification onboarding: upload ID → capture selfie → skills →
// certifications → submit for admin review. An admin compares the selfie with
// the ID to confirm the same person, and previews the uploaded certificates.
const STEPS = ['Identity document', 'Face scan', 'Skills', 'Certifications', 'Review'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB per uploaded file
const tooBig = (f) => f.size > MAX_FILE_BYTES;

export default function WorkerOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // collected data
  const [idDoc, setIdDoc] = useState(null);        // { name, type, dataUrl }
  const [idBusy, setIdBusy] = useState(false);
  const [selfie, setSelfie] = useState(null);      // dataURL or 'simulated'
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
  function capture() {
    const v = videoRef.current;
    if (v && v.videoWidth) {
      // Capture at a crisp resolution (up to 720px wide) so the admin can
      // actually compare the face with the ID — not the tiny preview size.
      const scale = Math.min(1, 720 / v.videoWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(v.videoWidth * scale);
      c.height = Math.round(v.videoHeight * scale);
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      setSelfie(c.toDataURL('image/jpeg', 0.88));
    } else {
      setSelfie('simulated');
    }
    stopCam();
  }
  // start/stop camera as the face step comes in/out of view
  useEffect(() => {
    if (step === 1 && !selfie) startCam();
    else stopCam();
    return stopCam;
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSkill = (n) => setSkills((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));
  const addCustom = () => { const v = customSkill.trim(); if (v && !skills.includes(v)) setSkills([...skills, v]); setCustomSkill(''); };

  function next() {
    setErr('');
    // ID and selfie are OPTIONAL supporting evidence — never a gate. The primary
    // path is admin review (+ the peer-verified tier); a worker with no device or
    // no wish to share biometrics can still get verified. Only skills are needed
    // to continue (and skills+bio to go available later).
    if (step === 2 && skills.length === 0) return setErr('Add at least one skill.');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  const back = () => { setErr(''); setStep((s) => Math.max(s - 1, 0)); };

  async function submit() {
    setErr(''); setSubmitting(true);
    try {
      // Keep the certificate names on the profile so the public "Certifications"
      // list still shows them; the actual files go with the verification for the
      // admin to preview.
      await updateMyWorkerProfile({ skills: skills.join(', '), bio, education, certifications: certFiles.map((f) => f.name).join('\n') });
      await submitVerification({
        document: idDoc?.name || null,          // legacy field (name only)
        faceScan: selfie ? 'captured' : null,   // legacy field
        idDocument: idDoc?.dataUrl || null,      // the uploaded ID image/PDF
        selfie: selfie && selfie !== 'simulated' ? selfie : null,
        certificationFiles: certFiles,           // [{ name, type, dataUrl }]
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
        <div className="onb-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`onb-step ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`}>
              <span className="onb-step-dot">{i < step ? Icons.check : i + 1}</span>
              <span className="onb-step-label">{s}</span>
            </div>
          ))}
        </div>

        <div className="onb-card">
          <div className="onb-title">Build your trust profile</div>
          <p className="onb-sub">An admin reviews and verifies workers — you don&apos;t need any of this to start. Every step below is <strong>optional</strong>: add what you can, or skip and get verified later. You can also earn Peer-Verified from well-reviewed jobs.</p>

          {step === 0 && (
            <div className="onb-pane">
              <h3 className="onb-h">Upload your ID document <span className="onb-optional">optional</span></h3>
              <p className="meta">A national ID, passport, or driver&apos;s licence. You can skip this and be verified by an admin in person.</p>
              <div className="onb-why">{Icons.shield} <span><strong>Why we ask:</strong> if you add it, it helps an admin confirm your identity faster. It&apos;s optional supporting evidence, never required.</span></div>
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

          {step === 1 && (
            <div className="onb-pane">
              <h3 className="onb-h">Take a selfie <span className="onb-optional">optional</span></h3>
              <p className="meta">Center your face and capture — or skip it. No camera? No problem.</p>
              <div className="onb-why">{Icons.shield} <span><strong>Why we ask:</strong> if you add it, an admin can match it to your ID. Optional — admins also verify workers in person.</span></div>
              <div className="onb-cam">
                {selfie && selfie !== 'simulated'
                  ? <img src={selfie} alt="Captured selfie" />
                  : selfie === 'simulated'
                    ? <div className="onb-cam-sim">{Icons.checkCircle}<span>Scan simulated</span></div>
                    : <video ref={videoRef} playsInline muted />}
              </div>
              {camErr && <p className="meta" style={{ color: 'var(--color-orange-600)' }}>{camErr}</p>}
              <div className="row" style={{ justifyContent: 'center', marginTop: '0.75rem' }}>
                {!selfie && !camErr && <button className="btn-primary" onClick={capture}>Capture</button>}
                {!selfie && camErr && <button className="btn-primary" onClick={() => setSelfie('simulated')}>Simulate scan</button>}
                {selfie && <button className="btn-secondary" onClick={() => { setSelfie(null); startCam(); }}>Retake</button>}
              </div>
            </div>
          )}

          {step === 2 && (
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

          {step === 3 && (
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

          {step === 4 && (
            <div className="onb-pane">
              <h3 className="onb-h">Review & submit</h3>
              <ul className="onb-review">
                <li><span>ID document</span><b>{idDoc ? '✓ Uploaded' : '—'}</b></li>
                <li><span>Selfie</span><b>{selfie ? '✓ Captured' : '—'}</b></li>
                <li><span>Skills</span><b>{skills.join(', ') || '—'}</b></li>
                <li><span>Education</span><b>{education || '—'}</b></li>
                <li><span>Certificates</span><b>{certFiles.length ? `✓ ${certFiles.length} uploaded` : '—'}</b></li>
              </ul>
              <p className="meta">An admin reviews whatever you&apos;ve added (in person if needed) and approves you. You&apos;ll appear in Browse once verified — or earn Peer-Verified from well-reviewed jobs.</p>
            </div>
          )}

          <ErrorNote message={err} />

          <div className="onb-actions">
            {step > 0 ? <button className="btn-secondary" onClick={back} disabled={submitting}>Back</button> : <span />}
            {step < STEPS.length - 1
              ? <button className="btn-primary" onClick={next}>Continue</button>
              : <button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit for review'}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
