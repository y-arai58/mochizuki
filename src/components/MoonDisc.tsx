import { litPath } from "../lib/moon";
import { T } from "../lib/theme";

type Props = {
  cx: number;
  cy: number;
  r: number;
  /** 0=新月 → 1=望月 */
  f: number;
  /** 変わったときにフェードさせるためのキー */
  seq?: string | number;
  dark?: string;
  ring?: boolean;
};

export function MoonDisc({ cx, cy, r, f, seq, dark = T.moonDark, ring = true }: Props) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={dark} />
      {f > 0.001 && <path key={seq} className="mz-lit" d={litPath(cx, cy, r, f)} fill={T.moonLit} />}
      {ring && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.charcoal} strokeWidth="1" opacity="0.3" />
      )}
    </g>
  );
}
