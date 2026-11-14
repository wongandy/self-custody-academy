// Flat illustrations for the six roadmap lesson cards.
// Colors come from CSS variables set on the card, so each card state and theme can recolor them:
//   --art-fill   device bodies and solid shapes
//   --art-stroke outlines and line work
//   --art-paper  screens, paper and cards
//   --art-accent Bitcoin-orange highlights

import type { ReactNode } from 'react';
import lesson1Art from '@/components/roadmap/lesson-1.webp';
import lesson2Art from '@/components/roadmap/lesson-2.webp';

const S = {
  fill: 'var(--art-fill)',
  stroke: 'var(--art-stroke)',
  paper: 'var(--art-paper)',
  accent: 'var(--art-accent)',
};

const line = { stroke: S.stroke, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
const accentLine = { ...line, stroke: S.accent };

/** A hardware wallet: body, screen and two buttons. (x, y) is the top-left corner; 34 × 54. */
function Device({ x, y, children }: { x: number; y: number; children?: ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={34} height={54} rx={8} fill={S.fill} stroke={S.stroke} strokeWidth={2.5} />
      <rect x={x + 5} y={y + 7} width={24} height={20} rx={3} fill={S.paper} />
      <circle cx={x + 11} cy={y + 38} r={3} fill={S.paper} />
      <circle cx={x + 23} cy={y + 38} r={3} fill={S.paper} />
      {children}
    </g>
  );
}

/** A recovery-phrase card with two columns of word slots. (x, y) is the top-left corner; 44 × 50. */
function SeedCard({ x, y }: { x: number; y: number }) {
  const rows = [0, 1, 2, 3];
  return (
    <g>
      <rect x={x} y={y} width={44} height={50} rx={5} fill={S.paper} stroke={S.stroke} strokeWidth={2.5} />
      {rows.map((r) => (
        <g key={r}>
          <circle cx={x + 7} cy={y + 10 + r * 10} r={1.8} fill={S.accent} />
          <line x1={x + 11} y1={y + 10 + r * 10} x2={x + 19} y2={y + 10 + r * 10} {...line} strokeWidth={2} />
          <circle cx={x + 26} cy={y + 10 + r * 10} r={1.8} fill={S.accent} />
          <line x1={x + 30} y1={y + 10 + r * 10} x2={x + 38} y2={y + 10 + r * 10} {...line} strokeWidth={2} />
        </g>
      ))}
    </g>
  );
}

/** A coin with a ring. */
function Coin({ cx, cy, r = 11 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={S.accent} stroke={S.stroke} strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={r - 5} fill="none" stroke={S.paper} strokeWidth={2} />
    </g>
  );
}

function Arrow({ d, head }: { d: string; head: string }) {
  return (
    <g>
      <path d={d} {...accentLine} strokeWidth={3} />
      <path d={head} {...accentLine} strokeWidth={3} />
    </g>
  );
}

function SetUpArt() {
  return (
    <>
      <Device x={36} y={23}>
        <path d="M47 37l4 4 7-8" {...accentLine} />
      </Device>
      <path d="M76 50h8" {...line} strokeDasharray="2 5" />
      <SeedCard x={88} y={25} />
    </>
  );
}

function ConnectArt() {
  return (
    <>
      <Device x={20} y={24}>
        <circle cx={37} cy={40} r={3.5} fill={S.accent} />
      </Device>
      <path d="M58 51c10 0 12-6 22-6" {...accentLine} strokeDasharray="4 5" />
      <rect x={84} y={24} width={58} height={40} rx={4} fill={S.paper} stroke={S.stroke} strokeWidth={2.5} />
      <polyline points="92,54 103,46 112,50 123,37 134,41" {...accentLine} />
      <path d="M78 68h70l-5 7H83z" fill={S.fill} stroke={S.stroke} strokeWidth={2.5} strokeLinejoin="round" />
    </>
  );
}

function ReceiveArt() {
  const finder = (x: number, y: number) => (
    <g>
      <rect x={x} y={y} width={14} height={14} rx={2} fill="none" stroke={S.stroke} strokeWidth={2.5} />
      <rect x={x + 4.5} y={y + 4.5} width={5} height={5} rx={1} fill={S.stroke} />
    </g>
  );
  const dots = [
    [62, 30], [56, 40], [64, 46], [42, 56], [52, 58], [60, 60], [68, 54], [46, 66], [66, 66],
  ];
  return (
    <>
      <rect x={28} y={20} width={58} height={60} rx={6} fill={S.paper} stroke={S.stroke} strokeWidth={2.5} />
      {finder(34, 26)}
      {finder(66, 26)}
      {finder(34, 60)}
      {dots.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={5} height={5} rx={1} fill={S.stroke} />
      ))}
      <Coin cx={128} cy={28} />
      <Arrow d="M124 44c-4 14-14 22-28 24" head="M101 61l-6 7 9 2" />
    </>
  );
}

function RecoverArt() {
  return (
    <>
      <SeedCard x={18} y={25} />
      <Arrow d="M70 40a14 14 0 1 1-1 18" head="M64 34l6 6 6-6" />
      <Device x={106} y={23}>
        <path d="M117 37l4 4 7-8" {...accentLine} />
      </Device>
    </>
  );
}

function WithdrawArt() {
  return (
    <>
      <path d="M18 38l30-16 30 16z" fill={S.paper} stroke={S.stroke} strokeWidth={2.5} strokeLinejoin="round" />
      {[26, 40, 54, 68].map((x) => (
        <rect key={x} x={x - 3} y={42} width={6} height={26} rx={1.5} fill={S.paper} stroke={S.stroke} strokeWidth={2} />
      ))}
      <rect x={16} y={70} width={64} height={7} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={2.5} />
      <Coin cx={48} cy={31} r={6} />
      <Arrow d="M86 50h22" head="M101 43l7 7-7 7" />
      <Device x={114} y={23}>
        <circle cx={131} cy={40} r={4} fill={S.accent} />
      </Device>
    </>
  );
}

function SendArt() {
  return (
    <>
      <Device x={30} y={23}>
        <path d="M38 41c3-6 5-6 6-2s3 4 5-1 4-3 5 1" {...accentLine} strokeWidth={2} />
      </Device>
      <Arrow d="M72 50h34" head="M99 43l7 7-7 7" />
      <Coin cx={126} cy={50} r={13} />
      <path d="M118 30l4-6M130 30l-1-7M138 36l6-4" {...line} strokeWidth={2} />
    </>
  );
}

const ART = [SetUpArt, ConnectArt, ReceiveArt, RecoverArt, WithdrawArt, SendArt];

// Painted illustrations replace the SVG for these lessons. Each is a square image with the
// art on a cream circle; CSS crops it to that circle so it sits on the card's themed panel.
const IMAGES: Record<number, string> = {
  1: lesson1Art,
  2: lesson2Art,
};

export default function LessonArt({ n }: { n: number }) {
  const image = IMAGES[n];
  if (image) return <img className="roadmap-card-img" src={image} alt="" draggable={false} />;
  const Art = ART[n - 1];
  if (!Art) return null;
  return (
    <svg className="roadmap-card-svg" viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <Art />
    </svg>
  );
}
