import { useRef, useEffect, useCallback } from 'react';

// A small canvas the user draws their signature on. Emits a PNG data URL via
// onChange whenever a stroke ends (empty string after Clear).
export function SignaturePad({ onChange, height = 150 }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  const setup = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#6d28d9';
  }, []);

  useEffect(() => { setup(); }, [setup]);

  function pos(e) {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  }
  function start(e) {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
  }
  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current) onChange?.(canvasRef.current.toDataURL('image/png'));
  }
  function clear() {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    dirty.current = false;
    onChange?.('');
  }

  return (
    <div className="sigpad">
      <canvas
        ref={canvasRef}
        className="sigpad-canvas"
        style={{ height }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div className="sigpad-foot">
        <span className="meta">Draw your signature above</span>
        <button type="button" className="sigpad-clear" onClick={clear}>Clear</button>
      </div>
    </div>
  );
}
