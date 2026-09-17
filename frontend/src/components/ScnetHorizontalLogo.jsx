export default function ScnetHorizontalLogo({ className = 'h-9 w-auto', variant = 'white' }) {
  const color = variant === 'white' ? '#FFFFFF' : '#0055C3';

  return (
    <svg viewBox="0 0 740 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="SCNET Internet de Fibra">
      <g fill={color}>
        <rect x="180" y="8" width="46" height="52" rx="16" transform="rotate(22 203 34)" />
        <rect x="126" y="28" width="44" height="50" rx="15" transform="rotate(22 148 53)" />
        <rect x="160" y="66" width="46" height="52" rx="16" transform="rotate(22 183 92)" />
        <rect x="52" y="44" width="34" height="20" rx="9" transform="rotate(22 69 54)" />
        <path d="M 95 18 C 112 12, 133 21, 139 38 C 142 47, 131 64, 114 70 C 92 78, 75 62, 75 45 C 75 30, 84 21, 95 18 Z" />
        <rect x="38" y="68" width="42" height="28" rx="10" transform="rotate(22 59 82)" />
        <rect x="34" y="100" width="35" height="28" rx="10" transform="rotate(22 51 114)" />
        <rect x="68" y="88" width="70" height="48" rx="17" transform="rotate(20 103 112)" />
        <rect x="66" y="125" width="54" height="50" rx="17" transform="rotate(22 93 150)" />
        <path d="M 86 80 C 108 72, 137 77, 148 94 C 156 108, 142 130, 126 138 C 98 149, 78 122, 86 80 Z" />
      </g>
      <g fill={color}>
        <text x="235" y="124" fontFamily="'Baloo 2', system-ui, sans-serif" fontWeight="900" fontSize="125" letterSpacing="-2px">
          SCNET
        </text>
        <text x="238" y="166" fontFamily="'Baloo 2', system-ui, sans-serif" fontWeight="800" fontSize="35" letterSpacing="4.5px">
          INTERNET DE FIBRA
        </text>
      </g>
    </svg>
  );
}
