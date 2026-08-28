import { useEffect, useRef, useState } from 'react';

function drawWheel(canvas, segments) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const radius = size / 2;
  const sliceAngle = (2 * Math.PI) / segments.length;

  ctx.clearRect(0, 0, size, size);

  segments.forEach((seg, i) => {
    const start = i * sliceAngle - Math.PI / 2;
    const end = start + sliceAngle;
    ctx.beginPath();
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = seg.color || '#1E88E5';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(start + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';

    const maxTextWidth = radius - 22 - radius * 0.36;
    let fontSize = Math.max(11, radius * 0.085);
    ctx.font = `700 ${fontSize}px 'Baloo 2', sans-serif`;
    while (fontSize > 9 && ctx.measureText(seg.title).width > maxTextWidth) {
      fontSize -= 1;
      ctx.font = `700 ${fontSize}px 'Baloo 2', sans-serif`;
    }
    let label = seg.title;
    if (ctx.measureText(label).width > maxTextWidth) {
      while (label.length > 3 && ctx.measureText(label + '…').width > maxTextWidth) {
        label = label.slice(0, -1);
      }
      label += '…';
    }
    ctx.fillText(label, radius - 22, 4);
    ctx.restore();
  });
}

export default function Wheel({ segments, spinToId, spinToken, onSpinEnd, onSpinClick, spinLabel = 'GIRAR', spinDisabled }) {
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (canvasRef.current) drawWheel(canvasRef.current, segments);
  }, [segments]);

  useEffect(() => {
    if (spinToken === 0 || spinToId == null) return;
    const idx = segments.findIndex((s) => s.id === spinToId);
    if (idx === -1) return;
    const sliceAngle = 360 / segments.length;
    const targetCenter = idx * sliceAngle + sliceAngle / 2;
    const fullSpins = 5 * 360;
    const finalRotation = rotationRef.current + fullSpins + (360 - targetCenter);
    rotationRef.current = finalRotation;
    setRotation(finalRotation);
    const timeout = setTimeout(() => onSpinEnd && onSpinEnd(), 4600);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer" />
      <canvas
        ref={canvasRef}
        width={480}
        height={480}
        className="wheel-canvas"
        style={{ transform: `rotate(${rotation}deg)` }}
      />
      {onSpinClick && (
        <button type="button" className="wheel-center-btn" onClick={onSpinClick} disabled={spinDisabled}>
          <span>{spinLabel}</span>
        </button>
      )}
    </div>
  );
}
