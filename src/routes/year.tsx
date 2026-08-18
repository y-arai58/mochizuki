import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { EntryRow, Eyebrow } from "../components/EntryRow";
import { MoonDisc } from "../components/MoonDisc";
import { illum, phaseName } from "../lib/moon";
import { SANS, SERIF, T, textLink, wrap } from "../lib/theme";
import { useNarrow } from "../lib/useNarrow";
import type { Scope } from "../server/entries";
import { deleteEntry, getMe, listEntries, monthCounts } from "../server/entries";

type Search = { scope: Scope; year: number; month?: number };

const thisYear = () => new Date().getFullYear();

export const Route = createFileRoute("/year")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const year = Number(s.year);
    const month = Number(s.month);
    return {
      scope: s.scope === "shared" ? "shared" : "solo",
      year: Number.isInteger(year) && year > 1970 && year < 3000 ? year : thisYear(),
      month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : undefined,
    };
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { scope, year, month } }) => {
    const [me, counts, picked] = await Promise.all([
      getMe(),
      monthCounts({ data: { scope } }),
      month
        ? listEntries({ data: { scope, ym: `${year}-${String(month).padStart(2, "0")}`, limit: 200 } })
        : Promise.resolve({ entries: [] }),
    ]);
    return { me, counts: counts.counts, picked: picked.entries };
  },
  component: TheYear,
});

function TheYear() {
  const { me, counts, picked } = Route.useLoaderData();
  const { scope, year, month } = Route.useSearch();
  const router = useRouter();
  const narrow = useNarrow();

  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth();

  const yearTotal = Object.entries(counts).reduce(
    (a, [k, v]) => (k.startsWith(`${year}-`) ? a + v : a),
    0
  );

  const remove = async (id: string) => {
    await deleteEntry({ data: { id } }).catch(() => {});
    await router.invalidate();
  };

  return (
    <main style={{ ...wrap, paddingTop: 40, paddingBottom: 110 }}>
      <h1
        style={{
          fontFamily: SERIF,
          fontWeight: 400,
          fontSize: "clamp(21px,5.6vw,30px)",
          letterSpacing: "0.24em",
          margin: "0 0 4px",
          lineHeight: 1.6,
        }}
      >
        一年の月
      </h1>
      <p
        style={{
          fontSize: 12,
          lineHeight: 2,
          letterSpacing: "0.1em",
          color: T.warmGray,
          margin: "12px 0 34px",
          maxWidth: 320,
        }}
      >
        その月に溜まったありがとうの数だけ、月が満ちています。
      </p>

      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <Link to="/year" search={{ scope, year: year - 1 }} style={textLink(false)}>
          ← PREV
        </Link>
        <div style={{ fontFamily: SERIF, fontSize: 24, letterSpacing: "0.24em" }}>{year}</div>
        {year < curY ? (
          <Link to="/year" search={{ scope, year: year + 1 }} style={textLink(false)}>
            NEXT →
          </Link>
        ) : (
          <span style={{ ...textLink(false), opacity: 0.3 }}>NEXT →</span>
        )}
        <div style={{ marginLeft: "auto", fontSize: 9.5, letterSpacing: "0.22em", color: T.warmGray }}>
          {yearTotal} RECORDS
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${narrow ? 3 : 4}, 1fr)`, marginTop: 28 }}>
        {Array.from({ length: 12 }).map((_, i) => {
          const m = i + 1;
          const c = counts[`${year}-${String(m).padStart(2, "0")}`] ?? 0;
          const future = year === curY && i > curM;
          const on = month === m;
          return (
            <Link
              key={m}
              to="/year"
              search={{ scope, year, month: on ? undefined : m }}
              className="mz-cell"
              style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
                borderTop: `1px solid ${on ? T.charcoal : T.beige}`,
                background: on ? T.offwhite : "transparent",
                padding: "22px 6px 20px",
                textAlign: "center",
                fontFamily: SANS,
                opacity: future ? 0.4 : 1,
              }}
            >
              <div style={{ fontSize: 9, letterSpacing: "0.22em", color: T.warmGray }}>
                {String(m).padStart(2, "0")}
              </div>
              <svg viewBox="0 0 64 64" style={{ width: 52, display: "block", margin: "12px auto 0" }}>
                <MoonDisc cx={32} cy={32} r={23} f={illum(c)} seq={`${year}-${m}-${c}`} dark={T.bluePale} />
              </svg>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 12.5,
                  letterSpacing: "0.14em",
                  marginTop: 12,
                  color: c === 0 ? T.warmGray : T.charcoal,
                  opacity: c === 0 ? 0.55 : 1,
                }}
              >
                {phaseName(c)}
              </div>
            </Link>
          );
        })}
      </div>

      {month && (
        <div className="mz-fade" style={{ marginTop: 46 }}>
          <Eyebrow
            n={String(month).padStart(2, "0")}
            label={`${year} ／ ${phaseName(counts[`${year}-${String(month).padStart(2, "0")}`] ?? 0)}`}
          />
          {picked.length === 0 ? (
            <p style={{ fontSize: 12.5, lineHeight: 2.2, color: T.warmGray, letterSpacing: "0.06em", marginTop: 26 }}>
              この月の記録はありません。
            </p>
          ) : (
            <div style={{ marginTop: 8 }}>
              {picked.map((e, i) => (
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
            </div>
          )}
        </div>
      )}
    </main>
  );
}
