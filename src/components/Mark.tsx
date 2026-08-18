import { litPath } from "../lib/moon";
import { T } from "../lib/theme";

/** ロゴの月相。満月＝ただの円で識別できないため、満ちる途中を描く */
export const LOGO_F = 0.72;

/**
 * ロゴマーク。本体のキービジュアルと同じ litPath() で描いているので、
 * 月相の定義を変えるとロゴも一緒に変わる。
 */
export function Mark({ size = 24, outline = true }: { size?: number; outline?: boolean }) {
  const r = 26;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="望月" style={{ display: "block" }}>
      <circle cx="32" cy="32" r={r} fill={T.slateDeep} />
      <path d={litPath(32, 32, r, LOGO_F)} fill={T.moonLit} />
      {outline && size >= 24 && (
        <circle cx="32" cy="32" r={r} fill="none" stroke={T.charcoal} strokeWidth="1" opacity="0.5" />
      )}
    </svg>
  );
}
