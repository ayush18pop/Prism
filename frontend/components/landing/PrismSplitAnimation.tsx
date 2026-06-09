'use client'

import React from 'react'

interface Props { className?: string; style?: React.CSSProperties }

const BARS   = [22, 33, 48, 66, 82, 90, 88, 74, 60, 46, 33, 20]
const IN_RNG = [false, false, false, true, true, true, true, true, false, false, false, false]

// Upright prism — apex at top, flat base at bottom
//   Apex:        (355,  68)
//   Bottom-left: (302, 194)
//   Bottom-right:(408, 194)
//
// Left face crosses y=131 at x≈329  → input beam terminates here
// Right face at 20% down  → LP-Y exits at (366, 93)
// Right face at 80% down  → LP-D exits at (397, 169)

export function PrismSplitAnimation({ className, style }: Props) {
  return (
    <div className={className} style={{ width: '100%', ...style }}>
      <svg
        viewBox="0 0 720 262"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="Uniswap LP position splits through the Prism hook into LP-Y and LP-D tokens"
        role="img"
      >
        <defs>
          {/* Motion paths */}
          <path id="psa-mp-in"     d="M182,131 L327,131" />
          <path id="psa-mp-amber"  d="M368,93 L552,43" />
          <path id="psa-mp-violet" d="M399,170 L552,219" />

          {/* Glow filters */}
          <filter id="psa-f-amber" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="psa-f-violet" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="psa-f-prism" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>

          {/* Vertical gradient: amber at apex → violet at base */}
          <linearGradient id="psa-g-prism" x1="355" y1="68" x2="355" y2="194" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#F0B429" stopOpacity="0.12"/>
            <stop offset="45%"  stopColor="#FFFFFF" stopOpacity="0.02"/>
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.12"/>
          </linearGradient>
        </defs>

        <style>{`
          @keyframes psa-flow-in {
            from { stroke-dashoffset: 10; }
            to   { stroke-dashoffset:  0; }
          }
          @keyframes psa-flow-out {
            from { stroke-dashoffset: 13; }
            to   { stroke-dashoffset:  0; }
          }
          @keyframes psa-prism-halo {
            0%,100% { opacity: 0;    }
            45%,55% { opacity: 0.09; }
          }
          .psa-beam-in {
            stroke: #333;
            stroke-width: 1.5;
            stroke-dasharray: 6 4;
            animation: psa-flow-in 0.65s linear infinite;
          }
          .psa-beam-amber {
            stroke: #F0B429;
            stroke-width: 2;
            stroke-dasharray: 8 5;
            animation: psa-flow-out 0.88s linear infinite;
            filter: url(#psa-f-amber);
          }
          .psa-beam-violet {
            stroke: #7C3AED;
            stroke-width: 2;
            stroke-dasharray: 8 5;
            animation: psa-flow-out 0.88s linear infinite;
            animation-delay: 0.22s;
            filter: url(#psa-f-violet);
          }
          .psa-prism-halo {
            animation: psa-prism-halo 2.8s ease-in-out infinite;
          }
        `}</style>

        {/* ══ LP POSITION BOX ══════════════════════════════════════ */}
        <rect x="8" y="8" width="170" height="246" rx="1"
              fill="#0F0F0F" stroke="#242424" strokeWidth="1"/>

        <text x="20" y="28" fill="#444" fontFamily="'JetBrains Mono',monospace"
              fontSize="8" letterSpacing="0.12em">UNISWAP V4</text>
        <text x="20" y="43" fill="#888" fontFamily="'JetBrains Mono',monospace"
              fontSize="10" letterSpacing="0.06em" fontWeight="500">LP POSITION</text>
        <line x1="20" y1="51" x2="168" y2="51" stroke="#242424" strokeWidth="1"/>

        {/* Liquidity depth chart — bars bottom-anchored at y=170 */}
        {BARS.map((h, i) => (
          <rect key={i}
                x={23 + i * 12} y={170 - h} width={7} height={h} rx="0.5"
                fill={IN_RNG[i] ? '#F0B429' : '#333'}
                opacity={IN_RNG[i] ? 0.55 : 0.4}/>
        ))}

        {/* Tick range band */}
        <rect x="23" y="180" width="130" height="15" rx="1" fill="#1C1C1C"/>
        <rect x="59" y="180" width="60" height="15" rx="1"
              fill="rgba(240,180,41,0.14)" stroke="rgba(240,180,41,0.24)" strokeWidth="0.5"/>
        <text x="89" y="191" fill="rgba(240,180,41,0.55)"
              fontFamily="'JetBrains Mono',monospace" fontSize="7" textAnchor="middle">in range</text>

        <line x1="59"  y1="177" x2="59"  y2="198" stroke="#444" strokeWidth="1"/>
        <line x1="119" y1="177" x2="119" y2="198" stroke="#444" strokeWidth="1"/>

        {/* Current price */}
        <line x1="87" y1="160" x2="87" y2="198"
              stroke="#888" strokeWidth="1.5" strokeDasharray="3 2"/>
        <polygon points="87,157 83,163 91,163" fill="#888"/>

        <line x1="23" y1="200" x2="153" y2="200" stroke="#333" strokeWidth="1"/>
        <text x="59"  y="212" fill="#444" fontFamily="'JetBrains Mono',monospace"
              fontSize="7.5" textAnchor="middle">-500</text>
        <text x="119" y="212" fill="#444" fontFamily="'JetBrains Mono',monospace"
              fontSize="7.5" textAnchor="middle">+500</text>
        <text x="87" y="226" fill="#888" fontFamily="'JetBrains Mono',monospace"
              fontSize="8" textAnchor="middle">current</text>
        <text x="87" y="237" fill="#444" fontFamily="'JetBrains Mono',monospace"
              fontSize="7.5" textAnchor="middle">price</text>

        {/* ══ INPUT BEAM — hits left face at (329, 131) ════════════ */}
        <line x1="182" y1="131" x2="328" y2="131" className="psa-beam-in"/>
        <polygon points="329,131 322,127 322,135" fill="#333"/>

        {([0, 0.45, 0.88] as const).map((d, i) => (
          <circle key={i} r="2.5" fill="#444">
            <animateMotion dur="0.95s" repeatCount="indefinite" begin={`${d}s`}>
              <mpath href="#psa-mp-in"/>
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0"
                     keyTimes="0;0.08;0.9;1" dur="0.95s"
                     repeatCount="indefinite" begin={`${d}s`}/>
          </circle>
        ))}

        {/* ══ UPRIGHT PRISM ════════════════════════════════════════ */}
        {/*   Apex (355,68) · Bottom-left (302,194) · Bottom-right (408,194) */}

        {/* Outer halo */}
        <polygon points="355,68 302,194 408,194"
                 fill="none" stroke="#ccc" strokeWidth="12"
                 className="psa-prism-halo"
                 style={{ filter: 'url(#psa-f-prism)' }}/>

        {/* Main face */}
        <polygon points="355,68 302,194 408,194"
                 fill="url(#psa-g-prism)" stroke="#333" strokeWidth="1.5"/>

        {/* Internal refraction — entry (329,131) → two exit points */}
        <line x1="329" y1="131" x2="365" y2="95"
              stroke="#F0B429" strokeWidth="0.8" opacity="0.32"/>
        <line x1="329" y1="131" x2="396" y2="168"
              stroke="#7C3AED" strokeWidth="0.8" opacity="0.32"/>

        {/* Label at centroid (355, 152) */}
        <text x="355" y="155" fill="#444" fontFamily="'JetBrains Mono',monospace"
              fontSize="7" textAnchor="middle" letterSpacing="0.15em">PRISM</text>

        {/* ══ AMBER BEAM → LP-Y (exits right face at ~20% down) ═══ */}
        <line x1="368" y1="93" x2="552" y2="43" className="psa-beam-amber"/>

        {([0, 0.37, 0.73] as const).map((d, i) => (
          <circle key={i} r="2.5" fill="#F0B429">
            <animateMotion dur="1.1s" repeatCount="indefinite" begin={`${d}s`}>
              <mpath href="#psa-mp-amber"/>
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0"
                     keyTimes="0;0.08;0.9;1" dur="1.1s"
                     repeatCount="indefinite" begin={`${d}s`}/>
          </circle>
        ))}

        <circle cx="572" cy="43" r="25"
                fill="rgba(240,180,41,0.1)" stroke="#F0B429" strokeWidth="1.5"/>
        <text x="572" y="39" fill="#F0B429" fontFamily="'JetBrains Mono',monospace"
              fontSize="11" textAnchor="middle" fontWeight="600" letterSpacing="0.04em">LP-Y</text>
        <text x="572" y="52" fill="rgba(240,180,41,0.5)"
              fontFamily="'JetBrains Mono',monospace" fontSize="7.5" textAnchor="middle">yield</text>

        <text x="603" y="36" fill="#F0B429" fontFamily="'JetBrains Mono',monospace"
              fontSize="9.5" opacity="0.9">earns fees</text>
        <text x="603" y="51" fill="#444" fontFamily="'JetBrains Mono',monospace"
              fontSize="9.5">zero IL</text>

        {/* ══ VIOLET BEAM → LP-D (exits right face at ~80% down) ══ */}
        <line x1="399" y1="170" x2="552" y2="219" className="psa-beam-violet"/>

        {([0.18, 0.55, 0.9] as const).map((d, i) => (
          <circle key={i} r="2.5" fill="#7C3AED">
            <animateMotion dur="1.1s" repeatCount="indefinite" begin={`${d}s`}>
              <mpath href="#psa-mp-violet"/>
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0"
                     keyTimes="0;0.08;0.9;1" dur="1.1s"
                     repeatCount="indefinite" begin={`${d}s`}/>
          </circle>
        ))}

        <circle cx="572" cy="219" r="25"
                fill="rgba(124,58,237,0.1)" stroke="#7C3AED" strokeWidth="1.5"/>
        <text x="572" y="215" fill="#7C3AED" fontFamily="'JetBrains Mono',monospace"
              fontSize="11" textAnchor="middle" fontWeight="600" letterSpacing="0.04em">LP-D</text>
        <text x="572" y="228" fill="rgba(124,58,237,0.5)"
              fontFamily="'JetBrains Mono',monospace" fontSize="7.5" textAnchor="middle">delta</text>

        <text x="603" y="212" fill="#7C3AED" fontFamily="'JetBrains Mono',monospace"
              fontSize="9.5" opacity="0.9">absorbs IL</text>
        <text x="603" y="227" fill="#444" fontFamily="'JetBrains Mono',monospace"
              fontSize="9.5">fee share</text>

      </svg>
    </div>
  )
}
