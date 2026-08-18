import type { CSSProperties } from "react";

/** 抽象ランドスケープの配色。純白・純黒とグラデーションは使わない */
export const T = {
  ivory: "#F2EEE6",
  offwhite: "#FAF8F3",
  beige: "#E6DFD2",
  sand: "#DACAA9",
  sandLight: "#E4D8BE",
  blue: "#BCCAD3",
  bluePale: "#D5DEE3",
  slate: "#7A93A5",
  slateDeep: "#54677A",
  warmGray: "#8E887C",
  charcoal: "#2F3439",
  gold: "#E3C489",
  moonLit: "#F7F0DE",
  moonDark: "#AFBEC8",
} as const;

export const SERIF =
  '"Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "Noto Serif JP", Georgia, "Times New Roman", serif';
export const SANS =
  '"Helvetica Neue", Arial, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif';

export const wrap: CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "0 26px" };

export const lineInput: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "transparent",
  border: "none",
  borderBottom: `1px solid ${T.beige}`,
  padding: "10px 2px",
  fontSize: 15,
  fontFamily: SANS,
  color: T.charcoal,
  borderRadius: 0,
};

export const circleBtn = (active: boolean): CSSProperties => ({
  position: "relative",
  width: 58,
  height: 58,
  flexShrink: 0,
  borderRadius: "50%",
  border: `1px solid ${active ? T.slateDeep : T.charcoal}`,
  background: active ? T.slate : "transparent",
  color: active ? T.offwhite : T.charcoal,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background .5s, border-color .5s, color .5s",
});

export const quietBtn = (active: boolean): CSSProperties => ({
  fontFamily: SANS,
  fontSize: 11,
  letterSpacing: "0.2em",
  padding: "14px 0",
  width: "100%",
  background: "transparent",
  border: `1px solid ${active ? T.charcoal : T.beige}`,
  color: active ? T.charcoal : T.warmGray,
  borderRadius: 0,
  cursor: active ? "pointer" : "default",
  transition: "border-color .4s, color .4s",
});

export const textLink = (active: boolean): CSSProperties => ({
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontSize: 10,
  letterSpacing: "0.24em",
  textDecoration: "none",
  color: active ? T.charcoal : T.warmGray,
});
