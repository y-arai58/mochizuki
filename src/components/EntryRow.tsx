import { useEffect, useState } from "react";
import { fmtStamp } from "../lib/moon";
import { SANS, SERIF, T } from "../lib/theme";
import type { Entry } from "../server/entries";

export function Eyebrow({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          fontFamily: SANS,
          fontSize: 10,
          letterSpacing: "0.26em",
          color: T.warmGray,
        }}
      >
        <span>{n}</span>
        <span>{label}</span>
      </div>
      <div style={{ height: 1, background: T.beige, margin: "12px 0 0" }} />
    </div>
  );
}

type RowProps = {
  entry: Entry;
  myEmail: string;
  showAuthor: boolean;
  narrow: boolean;
  index: number;
  onDelete: (id: string) => void;
};

export function EntryRow({ entry, myEmail, showAuthor, narrow, index, onDelete }: RowProps) {
  const mine = entry.author_email === myEmail;
  const [stamp, setStamp] = useState("");

  // 記録時刻は閲覧者のローカル時刻で見せる。Workersの時刻帯とSSR結果を混ぜない。
  useEffect(() => {
    setStamp(fmtStamp(entry.created_at));
  }, [entry.created_at]);

  return (
    <div
      className="mz-row mz-fade"
      style={{
        animationDelay: `${Math.min(index, 6) * 60}ms`,
        display: "flex",
        gap: narrow ? 16 : 30,
        alignItems: "flex-start",
        padding: "22px 0",
        borderBottom: `1px solid ${T.beige}`,
      }}
    >
      <div style={{ flexShrink: 0, width: narrow ? 62 : 96, paddingTop: 4 }}>
        <div style={{ minHeight: 14, fontSize: 9.5, letterSpacing: "0.16em", color: T.warmGray }}>
          {stamp}
        </div>
        {showAuthor && (
          <div
            style={{
              fontSize: 9.5,
              letterSpacing: "0.18em",
              marginTop: 8,
              color: mine ? T.warmGray : T.slateDeep,
            }}
          >
            {entry.author_name}
          </div>
        )}
      </div>
      <p
        style={{
          flex: 1,
          margin: 0,
          fontFamily: SERIF,
          fontSize: 15,
          lineHeight: 2,
          letterSpacing: "0.06em",
          wordBreak: "break-word",
        }}
      >
        {entry.text}
      </p>
      {mine && (
        <button
          className="mz-del"
          onClick={() => onDelete(entry.id)}
          aria-label="この記録を消す"
          style={{
            background: "none",
            border: "none",
            color: T.warmGray,
            fontSize: 9,
            letterSpacing: "0.2em",
            cursor: "pointer",
            padding: "4px 0",
            flexShrink: 0,
          }}
        >
          DEL
        </button>
      )}
    </div>
  );
}
