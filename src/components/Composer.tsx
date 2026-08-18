import { useEffect, useRef, useState } from "react";
import { circleBtn, lineInput, quietBtn, SERIF, T } from "../lib/theme";

type Props = {
  onSubmit: (text: string) => Promise<void>;
};

/** ブラウザ側の型（標準dtsに無いため最小限で宣言） */
type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

export function Composer({ onSubmit }: Props) {
  const [draft, setDraft] = useState("");
  const [writing, setWriting] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [voiceOK, setVoiceOK] = useState(true);
  const [voiceNote, setVoiceNote] = useState("");
  const [busy, setBusy] = useState(false);
  const recRef = useRef<SR | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const open = writing || listening || !!draft;

  useEffect(() => {
    const w = window as any;
    if (!(w.SpeechRecognition || w.webkitSpeechRecognition)) {
      setVoiceOK(false);
      setVoiceNote("このブラウザでは音声が使えません。SafariかChromeで開いてください");
    }

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|Brave/.test(navigator.userAgent);
    if (isIos && !isSafari) {
      setVoiceOK(false);
      setVoiceNote("iPhoneではSafariで開いてください");
    }

    return () => {
      try {
        recRef.current?.stop();
      } catch {}
    };
  }, []);

  const stopVoice = () => {
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  };

  const startVoice = () => {
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceOK(false);
      setVoiceNote("このブラウザでは音声が使えません。SafariかChromeで開いてください");
      return;
    }
    const rec: SR = new Ctor();
    rec.lang = "ja-JP";
    rec.interimResults = true;
    // モバイルでは連続認識が不安定なため、ひとことごとに確定する。
    rec.continuous = false;
    rec.onstart = () => {
      setListening(true);
      setInterim("");
      setVoiceNote("");
    };
    rec.onresult = (e: any) => {
      let fin = "";
      let itr = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t;
        else itr += t;
      }
      if (fin) setDraft((d) => (d + fin).slice(0, 200));
      setInterim(itr);
    };
    rec.onerror = (e: any) => {
      setListening(false);
      setInterim("");
      if (e.error === "not-allowed") {
        setVoiceOK(false);
        setVoiceNote("マイクの許可が必要です。ブラウザのサイト設定を確認してください");
      } else if (e.error === "service-not-allowed") {
        setVoiceOK(false);
        setVoiceNote("このブラウザでは音声が使えません。SafariかChromeで開いてください");
      } else if (e.error === "network") {
        setVoiceNote("通信できず、音声を文字にできませんでした");
      } else if (e.error === "no-speech") {
        setVoiceNote("声を聞き取れませんでした。もう一度試してください");
      } else {
        setVoiceNote("音声入力を始められませんでした。もう一度試してください");
      }
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    try {
      recRef.current = rec;
      setVoiceNote("");
      rec.start();
      setInterim("");
    } catch {
      setListening(false);
      setVoiceNote("音声入力を始められませんでした。もう一度試してください");
    }
  };

  const submit = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    stopVoice();
    setBusy(true);
    try {
      await onSubmit(text);
      setDraft("");
      setWriting(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 30 }}>
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          <div style={{ position: "relative", width: 58, height: 58 }}>
            {listening && (
              <span
                className="mz-ring"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: `1px solid ${T.slate}`,
                  display: "block",
                }}
              />
            )}
            <button
              type="button"
              onClick={listening ? stopVoice : startVoice}
              aria-label={listening ? "音声入力をとめる" : "音声で入れる"}
              style={circleBtn(listening)}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              >
                <rect x="9.5" y="2.5" width="5" height="11" rx="2.5" />
                <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
                <path d="M12 17.5V21" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              stopVoice();
              setWriting(true);
              setTimeout(() => taRef.current?.focus(), 60);
            }}
            aria-label="文字で入れる"
            style={circleBtn(writing && !listening)}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
              <path d="M14.5 6.5l3 3" />
            </svg>
          </button>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: 14, letterSpacing: "0.14em" }}>
            {listening ? "きいています" : "ありがとうを そそぐ"}
          </div>
          <div
            style={{
              fontSize: 11.5,
              lineHeight: 1.9,
              color: T.warmGray,
              marginTop: 6,
              letterSpacing: "0.04em",
            }}
          >
            {listening
              ? interim || "そのままどうぞ"
              : !voiceOK
                ? voiceNote || "音声が使えません。鉛筆から書けます"
                : voiceNote || (open ? "書き終えたら そそぐ" : "話す、または 書く")}
          </div>
        </div>
      </div>

      {open && (
        <div className="mz-fade">
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 200))}
            placeholder="コーヒーをいれてくれて うれしかった"
            rows={2}
            style={{
              ...lineInput,
              marginTop: 34,
              lineHeight: 2,
              resize: "none",
              fontSize: 15.5,
              fontFamily: SERIF,
              letterSpacing: "0.05em",
            }}
          />
          <div style={{ marginTop: 26 }}>
            <button type="button" onClick={submit} disabled={!draft.trim() || busy} style={quietBtn(!!draft.trim() && !busy)}>
              {busy ? "そそいでいます" : "そそぐ"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
