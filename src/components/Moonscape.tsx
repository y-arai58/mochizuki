import { FULL, illum } from "../lib/moon";
import { T } from "../lib/theme";
import { MoonDisc } from "./MoonDisc";

const SKY_TOP = 34; // 空の帯の上端
const SEA_Y = 268; // 水平線
const CX = 450;
const CY = 151; // 空の帯の中心
const R = 78; // 月の半径
const TICK_GAP = 20; // 月と目盛りの環のすきま
// 目盛りの環が空の帯から出ないこと: (R + TICK_GAP) <= (SEA_Y - SKY_TOP) / 2 - 16

const surfacePath = (a: number) => {
  let d = "M 0 0";
  for (let i = 0; i < 9; i++)
    d += ` c 40 ${a} 110 ${a} 150 0 c 34 ${a * 0.42} 116 ${a * 0.42} 150 0`;
  return d + " L 2700 620 L 0 620 Z";
};
const W1 = surfacePath(20);
const W2 = surfacePath(13);

type Props = {
  count: number;
  narrow: boolean;
  /** そそいだ回数。増えると光輪と目盛りが反応する */
  seq: number;
};

export function Moonscape({ count, narrow, seq }: Props) {
  const f = illum(count);
  const lit = Math.min(FULL, count);

  return (
    <svg viewBox={narrow ? "240 10 420 420" : "0 0 900 452"} width="100%" style={{ display: "block" }}>
      {/* 空の色面 */}
      <rect x="-20" y={SKY_TOP} width="940" height={SEA_Y - SKY_TOP} fill={T.bluePale} opacity="0.45" />

      {/* 雲 */}
      <g className="mz-cloudA" opacity="0.75">
        <path
          d="M 92 108 C 122 92 178 92 208 104 C 250 88 330 92 364 110 C 398 124 378 138 326 138 L 114 138 C 74 138 68 120 92 108 Z"
          fill={T.offwhite}
        />
      </g>
      <g className="mz-cloudB" opacity="0.6">
        <path
          d="M 596 196 C 636 182 724 184 762 196 C 826 190 878 200 898 212 C 920 226 884 234 834 234 L 630 234 C 580 234 564 208 596 196 Z"
          fill={T.offwhite}
        />
      </g>

      {/* 月 ─ 中身は静止 */}
      {seq > 0 && (
        <circle
          key={`halo-${seq}`}
          className="mz-halo"
          cx={CX}
          cy={CY}
          r={R + 10}
          fill="none"
          stroke={T.gold}
          strokeWidth="1"
          opacity="0"
        />
      )}
      <MoonDisc cx={CX} cy={CY} r={R} f={f} seq={count} />

      {/* 目盛りの環 ─ 1件＝1点、一周で望月 */}
      {Array.from({ length: FULL }).map((_, k) => {
        const a = ((-90 + k * (360 / FULL)) * Math.PI) / 180;
        const on = k < lit;
        return (
          <circle
            key={`${k}-${on ? "on" : "off"}`}
            className={on && k === lit - 1 && seq > 0 ? "mz-tick" : undefined}
            cx={(CX + Math.cos(a) * (R + TICK_GAP)).toFixed(1)}
            cy={(CY + Math.sin(a) * (R + TICK_GAP)).toFixed(1)}
            r={on ? 2.6 : 1.6}
            fill={on ? T.gold : T.warmGray}
            opacity={on ? 1 : 0.32}
          />
        );
      })}

      {/* 海 ─ 揺れるのはここだけ。そそいでも変化しない */}
      <g className="mz-bob">
        <g transform={`translate(0,${SEA_Y})`}>
          <g className="mz-driftB">
            <path d={W2} fill={T.blue} opacity="0.5" transform="translate(-1200,0)" />
          </g>
          <g className="mz-driftA">
            <path d={W1} fill={T.slate} opacity="0.38" transform="translate(-750,0)" />
          </g>
        </g>
        <line x1="-40" y1={SEA_Y} x2="940" y2={SEA_Y} stroke={T.slate} strokeWidth="1" opacity="0.55" />
        {/* 月あかりの反射。満ちるほど明るい */}
        <g opacity={0.16 + f * 0.44}>
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <line
              key={k}
              x1={CX - 22 + k * 3}
              y1={SEA_Y + 14 + k * 16}
              x2={CX + 22 - k * 3}
              y2={SEA_Y + 14 + k * 16}
              stroke={T.moonLit}
              strokeWidth={3 - k * 0.35}
              opacity={0.9 - k * 0.13}
            />
          ))}
        </g>
      </g>

      {/* 砂洲 ─ セクションを横断する有機的な色面 */}
      <path
        d="M -20 372 C 160 352 300 364 452 372 C 600 380 760 368 920 356 L 920 460 L -20 460 Z"
        fill={T.sandLight}
      />
      <path
        d="M -20 398 C 180 380 340 392 500 398 C 660 404 800 396 920 386 L 920 460 L -20 460 Z"
        fill={T.sand}
      />
    </svg>
  );
}
