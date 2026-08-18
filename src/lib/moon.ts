/**
 * 望月 ─ 月相のロジック
 * 30件で満月（望月）。満月が上限で、欠けることはない。
 */

export const FULL = 30;

const K1 = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const kanji = (n: number) => (n < 10 ? K1[n] : n === 10 ? "十" : "十" + K1[n - 10]);

const NAMED: Record<number, string> = {
  0: "新月",
  1: "既朔",
  2: "繊月",
  3: "三日月",
  4: "眉月",
  7: "上弦の月",
  9: "九夜月",
  10: "十日夜",
  13: "十三夜",
  14: "小望月",
  15: "望月",
};

/** 0件＝新月、30件＝望月。望月は上限に到達したときだけ */
export const ageOf = (c: number) =>
  c <= 0 ? 0 : c >= FULL ? 15 : Math.max(1, Math.min(14, Math.round((c / FULL) * 15)));

export const phaseName = (c: number) => NAMED[ageOf(c)] ?? `${kanji(ageOf(c))}日月`;

/** 照らされている割合 */
export const illum = (c: number) => Math.min(1, Math.max(0, c / FULL));

/** 月相の輪郭。f=0 新月 → f=1 望月（右から満ちる） */
export const litPath = (cx: number, cy: number, r: number, f: number) => {
  f = Math.max(0, Math.min(1, f));
  if (f <= 0.001) return "";
  if (f >= 0.999)
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  const rx = Math.abs(1 - 2 * f) * r;
  const sweep = f < 0.5 ? 0 : 1;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z`;
};

/** ローカル月のキー 'YYYY-MM' */
export const ymKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const isYm = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

export const fmtStamp = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}  ${String(
    d.getHours()
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
