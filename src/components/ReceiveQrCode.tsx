import { useMemo } from 'react';

const QR_MODULES = 25;

/** A 32-bit FNV-1a hash, so each address gets its own (stable) pattern. */
function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

// Decorative QR-style matrix seeded deterministically; not a scannable code.
function buildQrModules(address: string): boolean[][] {
  let seed = seedFrom(address);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const grid: boolean[][] = Array.from({ length: QR_MODULES }, () =>
    Array.from({ length: QR_MODULES }, () => rand() > 0.52));

  const drawFinder = (row0: number, col0: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = row0 + r;
        const col = col0 + c;
        if (row < 0 || col < 0 || row >= QR_MODULES || col >= QR_MODULES) continue;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          grid[row][col] = false;
          continue;
        }
        const ring = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[row][col] = ring || core;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, QR_MODULES - 7);
  drawFinder(QR_MODULES - 7, 0);
  return grid;
}

/** The QR code wallet software shows beside a receive address (decorative). */
export function ReceiveQrCode({ address }: { address: string }) {
  const modules = useMemo(() => buildQrModules(address), [address]);
  return (
    <svg viewBox={`0 0 ${QR_MODULES} ${QR_MODULES}`} shapeRendering="crispEdges" role="img" aria-label="Receive address QR code">
      <rect width={QR_MODULES} height={QR_MODULES} fill="#ffffff" />
      {modules.flatMap((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#17191b" /> : null))}
    </svg>
  );
}
