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
  let finalLines = lines.slice(0, maxLines);
  if (truncated && finalLines.length) {
    let last = finalLines[finalLines.length - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    finalLines[finalLines.length - 1] = `${last}…`;
  }
  return { lines: finalLines, truncated };
}

// Shrinks the font (and allows more stacked lines) until the whole title
// fits the wedge without being cut off, only truncating as a last resort.
function fitWheelText(ctx, text, { maxWidth, maxBlockHeight, maxFontSize, minFontSize }) {
  let best = null;
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 1) {
    ctx.font = `700 ${fontSize}px 'Baloo 2', sans-serif`;
    const lineHeight = fontSize * 1.05;
    const maxLines = Math.max(1, Math.min(3, Math.floor(maxBlockHeight / lineHeight)));
    const fullWidth = ctx.measureText(text).width;
    const { lines, truncated } = fullWidth <= maxWidth ? { lines: [text], truncated: false } : wrapLines(ctx, text, maxWidth, maxLines);
    best = { fontSize, lineHeight, lines };
    if (!truncated) return best;
  }
  return best;
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

    // Text sits along the wedge bisector, right-aligned near the rim. The
    // narrowest point is near the hub, so size everything off the wedge
    // angle (not just the radius) to keep text from spilling into neighbors.
    const centerHubRadius = radius * 0.3;
    const outerTextX = radius - 26;
    const nearHubX = centerHubRadius + 12;
    const maxTextWidth = Math.max(30, outerTextX - nearHubX);
    const maxBlockHeight = Math.max(18, 2 * nearHubX * Math.tan(sliceAngle / 2) * 0.85);
    const maxFontSize = Math.max(12, Math.min(22, radius * sliceAngle * 0.1));

    const { fontSize, lineHeight, lines } = fitWheelText(ctx, seg.title, {
      maxWidth: maxTextWidth,
      maxBlockHeight,
      maxFontSize,
      minFontSize: 9,
    });
    ctx.font = `700 ${fontSize}px 'Baloo 2', sans-serif`;
    ctx.lineWidth = fontSize * 0.14;

    const startY = 4 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, li) => {
      const y = startY + li * lineHeight;
      ctx.strokeText(line, outerTextX, y);
      ctx.fillText(line, outerTextX, y);
    });
    ctx.restore();
  });
}

const LIGHT_COUNT = 20;
const LIGHTS = Array.from({ length: LIGHT_COUNT }, (_, i) => {
  const angle = (i / LIGHT_COUNT) * 2 * Math.PI - Math.PI / 2;
  const radiusPct = 53;
  return {
    left: `${50 + radiusPct * Math.cos(angle)}%`,
    top: `${50 + radiusPct * Math.sin(angle)}%`,
    delay: `${(i % 4) * 0.15}s`,
  };
});

export default function Wheel({ segments, spinToId, spinToken, onSpinEnd, onSpinClick, spinLabel = 'GIRAR', spinDisabled, spinning }) {
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
    <div className={`wheel-wrap${spinning ? ' is-spinning' : ''}`}>
      <div className="wheel-lights">
        {LIGHTS.map((l, i) => (
          <span key={i} className="wheel-light" style={{ left: l.left, top: l.top, animationDelay: l.delay }} />
        ))}
      </div>
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
