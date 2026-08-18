import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Composer } from "../components/Composer";
import { EntryRow, Eyebrow } from "../components/EntryRow";
import { LoginForm } from "../components/LoginForm";
import { Moonscape } from "../components/Moonscape";
import { FULL, phaseName, ymKey } from "../lib/moon";
import { SERIF, T, lineInput, textLink, wrap } from "../lib/theme";
import { useNarrow } from "../lib/useNarrow";
import type { Scope } from "../server/entries";
import { addEntry, deleteEntry, getMe, getSession, listEntries, monthCounts, setName } from "../server/entries";

type Search = { scope: Scope };

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    scope: s.scope === "shared" ? "shared" : "solo",
  }),
  loaderDeps: ({ search: { scope } }) => ({ scope }),
  loader: async ({ deps: { scope } }) => {
    const session = await getSession();
    if (!session.user) return { session, me: null, counts: {}, entries: [] };
    const [me, counts, entries] = await Promise.all([
      getMe(),
      monthCounts({ data: { scope } }),
      listEntries({ data: { scope, limit: 60 } }),
    ]);
    return { session, me, counts: counts.counts, entries: entries.entries };
  },
  component: ThisMoon,
});

function ThisMoon() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const { scope } = Route.useSearch();

  const narrow = useNarrow();
  const [seq, setSeq] = useState(0);
  const [note, setNote] = useState("");
  const [nameDraft, setNameDraft] = useState(data.me?.name ?? "");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (data.me) setNameDraft(data.me.name);
  }, [data.me]);

  if (!data.me) return <LoginForm configured={data.session.configured} onLoggedIn={() => router.invalidate()} />;

  const { me, counts, entries } = data;

  const now = new Date();
  const ym = ymKey(now);
  const cur = counts[ym] ?? 0;

  const say = (m: string, ms = 3200) => {
    setNote(m);
    setTimeout(() => setNote(""), ms);
  };

  const pour = async (text: string) => {
    const before = phaseName(cur);
    try {
      const res = await addEntry({ data: { text, scope, ym } });
      setSeq((s) => s + 1);
      const after = phaseName(res.count);
      say(
        after !== before
          ? after === "望月"
            ? "望月になりました"
            : `月が ${after} になりました`
          : res.full
            ? "望月のままです"
            : "月がすこし満ちました"
      );
      await router.invalidate();
    } catch (e) {
      say(`そそげませんでした：${(e as Error).message}`, 6000);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteEntry({ data: { id } });
      await router.invalidate();
    } catch (e) {
      say(`消せませんでした：${(e as Error).message}`, 6000);
    }
  };

  const rename = async () => {
    const n = nameDraft.trim();
    if (!n || n === me.name) return;
    try {
      await setName({ data: { name: n } });
      say("表示名を変えました");
      await router.invalidate();
    } catch (e) {
      say(`保存できませんでした：${(e as Error).message}`, 6000);
    }
  };

  const list = showAll ? entries : entries.slice(0, 4);

  return (
    <main>
      <div style={wrap}>
        <h1
          style={{
            fontFamily: SERIF,
            fontWeight: 400,
            fontSize: "clamp(21px,5.6vw,30px)",
            letterSpacing: "0.24em",
            margin: "20px 0 0",
            lineHeight: 1.6,
          }}
        >
          望月
        </h1>
        <p
          style={{
            fontSize: 12,
            lineHeight: 2,
            letterSpacing: "0.1em",
            color: T.warmGray,
            margin: "14px 0 0",
            maxWidth: 320,
          }}
        >
          ひとことで、月がすこし満ちる。
          <br />
          {FULL}のありがとうで望月になる。
        </p>
      </div>

      <div style={{ position: "relative", marginTop: -6 }}>
        <Moonscape count={cur} narrow={narrow} seq={seq} />
        <div style={{ position: "absolute", left: 26, bottom: "5%", pointerEvents: "none", maxWidth: "64%" }}>
          <div style={{ fontFamily: SERIF, fontSize: "clamp(38px,11vw,62px)", lineHeight: 1, letterSpacing: "0.04em" }}>
            {String(Math.min(cur, 99)).padStart(2, "0")}
          </div>
          <div style={{ height: 1, background: T.charcoal, opacity: 0.25, margin: "12px 0 10px", width: 88 }} />
          <div style={{ fontFamily: SERIF, fontSize: 14, letterSpacing: "0.2em", lineHeight: 1.4 }}>
            {phaseName(cur)}
          </div>
          <div style={{ fontSize: 9.5, letterSpacing: "0.24em", color: T.warmGray, marginTop: 8, lineHeight: 1.9 }}>
            {ym.replace("-", ".")}
            {cur < FULL ? ` ／ 望月まで ${FULL - cur}` : cur > FULL ? ` ／ ＋${cur - FULL}` : ""}
          </div>
        </div>
      </div>

      {/* 視点 */}
      <div style={{ ...wrap, paddingTop: 46, display: "flex", gap: 34 }}>
        {(
          [
            ["solo", "ひとりで", "SOLO"],
            ["shared", "ふたりで", "SHARED"],
          ] as const
        ).map(([k, jp, en]) => (
          <Link
            key={k}
            to="/"
            search={{ scope: k }}
            style={{
              textDecoration: "none",
              borderBottom: `1px solid ${scope === k ? T.charcoal : "transparent"}`,
              padding: "0 0 9px",
              transition: "border-color .4s",
            }}
          >
            <div style={{ fontSize: 9, letterSpacing: "0.28em", color: T.warmGray }}>{en}</div>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 15,
                letterSpacing: "0.16em",
                marginTop: 7,
                color: scope === k ? T.charcoal : T.warmGray,
                transition: "color .4s",
              }}
            >
              {jp}
            </div>
          </Link>
        ))}
      </div>

      {/* 01 RECORD */}
      <section style={{ ...wrap, paddingTop: 54 }}>
        <Eyebrow n="01" label="RECORD" />
        <Composer onSubmit={pour} />
      </section>

      {/* 02 ARCHIVE */}
      <section style={{ ...wrap, paddingTop: 74 }}>
        <Eyebrow n="02" label="ARCHIVE" />
        {entries.length === 0 ? (
          <p style={{ fontSize: 12.5, lineHeight: 2.2, color: T.warmGray, letterSpacing: "0.06em", marginTop: 30 }}>
            今月はまだ新月です。
            <br />
            今日うれしかったことを ひとつ入れてみてください。
          </p>
        ) : (
          <div style={{ marginTop: 8 }}>
            {list.map((e, i) => (
              <EntryRow
                key={e.id}
                entry={e}
                index={i}
                myEmail={me.email}
                showAuthor={scope === "shared"}
                narrow={narrow}
                onDelete={remove}
              />
            ))}
            {entries.length > 4 && (
              <button type="button" onClick={() => setShowAll((v) => !v)} style={{ ...textLink(true), padding: "26px 0 0" }}>
                {showAll ? "CLOSE" : `MORE  ${entries.length - 4}`}
              </button>
            )}
          </div>
        )}
      </section>

      {/* 03 PROFILE */}
      <section style={{ ...wrap, paddingTop: 74, paddingBottom: 110 }}>
        <Eyebrow n="03" label="PROFILE" />
        <p style={{ fontSize: 11.5, lineHeight: 2, color: T.warmGray, letterSpacing: "0.06em", margin: "26px 0 20px" }}>
          {me.email}
          <br />
          「ふたりで」に入れた記録は、この名前で相手に見えます。
        </p>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value.slice(0, 20))}
            placeholder="ゆい"
            style={{ ...lineInput, flex: 1 }}
          />
          <button type="button" onClick={rename} style={{ ...textLink(true), padding: "0 0 12px" }}>
            SAVE
          </button>
        </div>
      </section>

      {note && (
        <div
          className="mz-fade"
          style={{
            position: "fixed",
            left: "50%",
            bottom: 30,
            transform: "translateX(-50%)",
            background: T.offwhite,
            border: `1px solid ${T.beige}`,
            padding: "13px 26px",
            fontSize: 10.5,
            letterSpacing: "0.2em",
            maxWidth: "88%",
            textAlign: "center",
            zIndex: 40,
          }}
        >
          {note}
        </div>
      )}
    </main>
  );
}
