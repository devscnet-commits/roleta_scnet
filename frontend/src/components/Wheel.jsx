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
    ctx.font = `600 ${Math.max(10, radius * 0.09)}px sans-serif`;
    const label = seg.title.length > 16 ? seg.title.slice(0, 15) + '…' : seg.title;
    ctx.fillText(label, radius - 14, 4);
    ctx.restore();
  });
}

export default function Wheel({ segments, spinToId, spinToken, onSpinEnd }) {
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
        width={280}
        height={280}
        className="wheel-canvas"
        style={{ transform: `rotate(${rotation}deg)` }}
      />
    </div>
  );
}
