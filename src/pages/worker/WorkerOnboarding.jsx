import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getMyWorkerProfile, getCategories, updateMyWorkerProfile, submitVerification } from '../../api/client.js';
import { ErrorNote } from '../../components/shared/ui.jsx';
import { Icons } from '../../components/shared/icons.jsx';

// Guided worker verification onboarding (Duolingo-style, simulated): upload ID →
// face scan → skills → education & certifications → submit for admin review.
// The ID/face are NOT analysed or stored — this mirrors a real proctored flow.
const STEPS = ['Identity document', 'Face scan', 'Skills', 'Background', 'Review'];

export default function WorkerOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // collected data
  const [idFile, setIdFile] = useState('');
  const [selfie, setSelfie] = useState(null);      // dataURL or 'simulated'
  const [skills, setSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState('');
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState('');
  const [certifications, setCertifications] = useState('');

  const cats = useRef([]);
  const [catNames, setCatNames] = useState([]);
  useEffect(() => {
    getMyWorkerProfile().then((me) => {
      setSkills((me.skills || '').split(',').map((s) => s.trim()).filter(Boolean));
      setBio(me.bio || ''); setEducation(me.education || ''); setCertifications(me.certifications || '');
    }).catch(() => {});
    getCategories().then((c) => { cats.current = c; setCatNames(c.map((x) => x.name)); }).catch(() => {});
  }, []);

  // ---- camera (face scan) ----
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camErr, setCamErr] = useState('');
  const stopCam = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  async function startCam() {
    setCamErr('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}); }
    } catch {
      setCamErr("Camera unavailable or blocked — you can simulate the scan for this demo.");
    }
  }
  function capture() {
    const v = videoRef.current;
    if (v && v.videoWidth) {
      const c = document.createElement('canvas');
      c.width = 240; c.height = 240 * (v.videoHeight / v.videoWidth || 0.75);
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      setSelfie(c.toDataURL('image/jpeg', 0.6));
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
    if (step === 0 && !idFile) return setErr('Upload a photo of your ID to continue.');
    if (step === 1 && !selfie) return setErr('Capture (or simulate) your face scan to continue.');
    if (step === 2 && skills.length === 0) return setErr('Add at least one skill.');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  const back = () => { setErr(''); setStep((s) => Math.max(s - 1, 0)); };

  async function submit() {
    setErr(''); setSubmitting(true);
    try {
      await updateMyWorkerProfile({ skills: skills.join(', '), bio, education, certifications });
      await submitVerification({ document: idFile, faceScan: selfie ? 'captured' : null });
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
          <div className="onb-title">Verify your identity</div>
          <p className="onb-sub">Requesters only see verified workers. This is a simulated check — your ID and face scan are not stored or analysed.</p>

          {step === 0 && (
            <div className="onb-pane">
              <h3 className="onb-h">Upload your ID document</h3>
              <p className="meta">A national ID, passport, or driver&apos;s licence. (Simulated — not stored.)</p>
              <label className="onb-drop">
                {idFile ? <><span className="onb-drop-ic">{Icons.checkCircle}</span><span className="onb-drop-name">{idFile}</span><span className="meta">Tap to replace</span></>
                  : <><span className="onb-drop-ic">{Icons.upload}</span><span>Tap to choose a photo of your ID</span><span className="meta">JPG, PNG or PDF</span></>}
                <input type="file" accept="image/*,.pdf" hidden onChange={(e) => setIdFile(e.target.files?.[0]?.name || '')} />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="onb-pane">
              <h3 className="onb-h">Face scan</h3>
              <p className="meta">Center your face in the frame and capture — this confirms the ID belongs to you.</p>
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
              <h3 className="onb-h">Experience & qualifications</h3>
              <div className="form" style={{ maxWidth: '100%' }}>
                <label>Short bio
                  <textarea className="textarea" rows={2} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell requesters about your work and experience." />
                </label>
                <label>Education
                  <textarea className="textarea" rows={2} value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. Diploma in Plumbing, IPRC Kigali" />
                </label>
                <label>Certifications
                  <textarea className="textarea" rows={2} value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder="e.g. Certified Plumber — RP Board (one per line)" />
                </label>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="onb-pane">
              <h3 className="onb-h">Review & submit</h3>
              <ul className="onb-review">
                <li><span>ID document</span><b>{idFile ? '✓ Uploaded' : '—'}</b></li>
                <li><span>Face scan</span><b>{selfie ? '✓ Captured' : '—'}</b></li>
                <li><span>Skills</span><b>{skills.join(', ') || '—'}</b></li>
                <li><span>Education</span><b>{education || '—'}</b></li>
                <li><span>Certifications</span><b>{certifications || '—'}</b></li>
              </ul>
              <p className="meta">An admin will review your submission. You&apos;ll appear in Browse once approved.</p>
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
