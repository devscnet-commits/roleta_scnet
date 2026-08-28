import { useEffect, useRef, useState } from 'react';

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  function pushHardBreak(word) {
    let chunk = '';
    for (const ch of word) {
      const test = chunk + ch;
      if (chunk && ctx.measureText(test).width > maxWidth) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk = test;
      }
    }
    return chunk;
  }

  for (const word of words) {
    if (lines.length >= maxLines) break;
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = ctx.measureText(word).width > maxWidth ? pushHardBreak(word) : word;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  const usedWordCount = lines.join(' ').split(' ').length;
  const truncated = usedWordCount < words.length || lines.length > maxLines;
  const finalLines = lines.slice(0, maxLines);
  if (truncated && finalLines.length) {
    let last = finalLines[finalLines.length - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    finalLines[finalLines.length - 1] = `${last}…`;
  }
  return finalLines;
}

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
    ctx.strokeStyle = 'rgba(11, 31, 58, 0.65)';
    ctx.lineJoin = 'round';

    const maxTextWidth = radius - 22 - radius * 0.36;
    const fontSize = Math.max(13, radius * 0.075);
    ctx.font = `700 ${fontSize}px 'Baloo 2', sans-serif`;
    ctx.lineWidth = fontSize * 0.14;

    const lines = ctx.measureText(seg.title).width <= maxTextWidth ? [seg.title] : wrapLines(ctx, seg.title, maxTextWidth, 2);
    const lineHeight = fontSize * 1.05;
    const startY = 4 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, li) => {
      const y = startY + li * lineHeight;
      ctx.strokeText(line, radius - 22, y);
      ctx.fillText(line, radius - 22, y);
    });
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
