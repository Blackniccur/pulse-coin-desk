import { useEffect, useRef, useState } from "react";

export type Candle = { o: number; h: number; l: number; c: number; t: number };

function seed(count: number, base: number): Candle[] {
  const out: Candle[] = [];
  let price = base;
  // deterministic seed so SSR and first client render match
  let s = 1337;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 0x100000000;
    return s / 0x100000000;
  };
  for (let i = count; i > 0; i--) {
    const o = price;
    const vol = base * 0.004;
    const c = o + (rand() - 0.48) * vol;
    const h = Math.max(o, c) + rand() * vol * 0.6;
    const l = Math.min(o, c) - rand() * vol * 0.6;
    out.push({ o, h, l, c, t: i * 60_000 });
    price = c;
  }
  return out;
}

export function useLiveCandles(base = 67_420) {
  const [candles, setCandles] = useState<Candle[]>(() => seed(48, base));

  useEffect(() => {
    const id = setInterval(() => {
      setCandles((prev) => {
        const next = prev.slice();
        const last = { ...next[next.length - 1] };
        const drift = last.c * 0.0012 * (Math.random() - 0.5);
        last.c = +(last.c + drift).toFixed(2);
        last.h = Math.max(last.h, last.c);
        last.l = Math.min(last.l, last.c);
        next[next.length - 1] = last;

        // roll a new candle every ~6 ticks
        if (Math.random() < 0.18) {
          const o = last.c;
          next.push({ o, h: o, l: o, c: o, t: Date.now() });
          if (next.length > 60) next.shift();
        }
        return next;
      });
    }, 700);
    return () => clearInterval(id);
  }, []);

  return candles;
}

export function CandlestickChart({ candles }: { candles: Candle[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padR = 56;
    const padY = 12;
    const chartW = W - padR;

    ctx.clearRect(0, 0, W, H);

    const highs = candles.map((c) => c.h);
    const lows = candles.map((c) => c.l);
    const hi = Math.max(...highs);
    const lo = Math.min(...lows);
    const range = hi - lo || 1;
    const y = (p: number) => padY + ((hi - p) / range) * (H - padY * 2);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const yy = (H / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(chartW, yy);
      ctx.stroke();
    }

    // price labels
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.textAlign = "left";
    for (let i = 0; i <= 4; i++) {
      const p = hi - (range / 4) * i;
      const yy = padY + ((H - padY * 2) / 4) * i;
      ctx.fillText(p.toFixed(0), chartW + 6, yy + 3);
    }

    const cw = chartW / candles.length;
    const bw = Math.max(2, cw * 0.62);

    candles.forEach((c, i) => {
      const x = i * cw + cw / 2;
      const bull = c.c >= c.o;
      const color = bull ? "#3fdca0" : "#f25f5c";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;
      // wick
      ctx.beginPath();
      ctx.moveTo(x, y(c.h));
      ctx.lineTo(x, y(c.l));
      ctx.stroke();
      // body
      const yo = y(c.o);
      const yc = y(c.c);
      const top = Math.min(yo, yc);
      const h = Math.max(1, Math.abs(yc - yo));
      ctx.fillRect(x - bw / 2, top, bw, h);
    });

    // last price line
    const last = candles[candles.length - 1];
    const ly = y(last.c);
    ctx.strokeStyle = last.c >= last.o ? "#3fdca0" : "#f25f5c";
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(chartW, ly);
    ctx.stroke();
    ctx.setLineDash([]);

    // last price tag
    ctx.fillStyle = last.c >= last.o ? "#3fdca0" : "#f25f5c";
    ctx.fillRect(chartW, ly - 9, padR, 18);
    ctx.fillStyle = "#0c1018";
    ctx.font = "bold 10px JetBrains Mono, monospace";
    ctx.fillText(last.c.toFixed(2), chartW + 4, ly + 3);
  }, [candles]);

  return <canvas ref={ref} className="w-full h-full block" />;
}
