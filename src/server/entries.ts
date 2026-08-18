import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { env as cfEnv } from "cloudflare:workers";
import { FULL, isYm } from "../lib/moon";

/** `npm run cf-typegen` を実行すると Env が生成されるが、無くても動くよう最小限で受ける */
const env = cfEnv as unknown as { DB: D1Database; DEV_EMAIL?: string };

export type Scope = "solo" | "shared";
export type Entry = {
  id: string;
  text: string;
  created_at: number;
  author_email: string;
  author_name: string;
};

const groupId = (scope: Scope, email: string) => (scope === "shared" ? "shared" : `solo:${email}`);
const asScope = (v: unknown): Scope => (v === "shared" ? "shared" : "solo");
const nameFromEmail = (email: string) => email.split("@")[0];

/**
 * 本人の特定は Cloudflare Access に任せる。
 * Access を通ったリクエストには Cf-Access-Authenticated-User-Email が必ず付く。
 * ローカル開発時だけ .dev.vars の DEV_EMAIL を使う（本番では設定しないこと）。
 */
const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const email = getRequestHeader("cf-access-authenticated-user-email") ?? env.DEV_EMAIL;
  if (!email) throw new Error("Cloudflare Access が有効になっていません");
  return next({ context: { email: String(email).toLowerCase() } });
});

/* ───────── 表示名 ───────── */

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const row = await env.DB.prepare("SELECT name FROM profiles WHERE email = ?1")
      .bind(context.email)
      .first<{ name: string }>();
    return { email: context.email, name: row?.name ?? nameFromEmail(context.email) };
  });

export const setName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ data, context }) => {
    const name = String((data as { name?: unknown })?.name ?? "").trim().slice(0, 20);
    if (!name) throw new Error("名前が空です");
    await env.DB.prepare(
      `INSERT INTO profiles (email, name) VALUES (?1, ?2)
       ON CONFLICT(email) DO UPDATE SET name = excluded.name`
    )
      .bind(context.email, name)
      .run();
    return { email: context.email, name };
  });

/* ───────── 記録 ───────── */

export const listEntries = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ data, context }) => {
    const d = (data ?? {}) as { scope?: unknown; ym?: unknown; limit?: unknown };
    const g = groupId(asScope(d.scope), context.email);
    const limit = Math.min(Math.max(Number(d.limit) || 60, 1), 500);

    const stmt = isYm(d.ym)
      ? env.DB.prepare(
          `SELECT id, text, created_at, author_email, author_name
             FROM entries WHERE group_id = ?1 AND ym = ?2
             ORDER BY created_at DESC LIMIT ?3`
        ).bind(g, d.ym, limit)
      : env.DB.prepare(
          `SELECT id, text, created_at, author_email, author_name
             FROM entries WHERE group_id = ?1
             ORDER BY created_at DESC LIMIT ?2`
        ).bind(g, limit);

    const { results } = await stmt.all<Entry>();
    return { entries: results ?? [] };
  });

/** 月ごとの件数。12ヶ月グリッドは全件ではなくこれだけを読む */
export const monthCounts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ data, context }) => {
    const g = groupId(asScope((data as { scope?: unknown })?.scope), context.email);
    const { results } = await env.DB.prepare(
      "SELECT ym, COUNT(*) AS n FROM entries WHERE group_id = ?1 GROUP BY ym"
    )
      .bind(g)
      .all<{ ym: string; n: number }>();
    const counts: Record<string, number> = {};
    for (const r of results ?? []) counts[r.ym] = r.n;
    return { counts };
  });

export const addEntry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ data, context }) => {
    const d = (data ?? {}) as { text?: unknown; scope?: unknown; ym?: unknown };
    const text = String(d.text ?? "").trim();
    if (!text) throw new Error("ありがとうが空です");
    if (text.length > 200) throw new Error("長すぎます");
    if (!isYm(d.ym)) throw new Error("月の指定が不正です");

    const profile = await env.DB.prepare("SELECT name FROM profiles WHERE email = ?1")
      .bind(context.email)
      .first<{ name: string }>();

    const entry = {
      id: crypto.randomUUID(),
      group_id: groupId(asScope(d.scope), context.email),
      ym: d.ym,
      created_at: Date.now(),
      author_email: context.email,
      author_name: profile?.name ?? nameFromEmail(context.email),
      text,
    };

    await env.DB.prepare(
      `INSERT INTO entries (id, group_id, ym, created_at, author_email, author_name, text)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    )
      .bind(
        entry.id,
        entry.group_id,
        entry.ym,
        entry.created_at,
        entry.author_email,
        entry.author_name,
        entry.text
      )
      .run();

    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM entries WHERE group_id = ?1 AND ym = ?2"
    )
      .bind(entry.group_id, entry.ym)
      .first<{ n: number }>();

    return { id: entry.id, count: row?.n ?? 0, full: (row?.n ?? 0) >= FULL };
  });

export const deleteEntry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ data, context }) => {
    const id = String((data as { id?: unknown })?.id ?? "");
    if (!id) throw new Error("idがありません");
    const res = await env.DB.prepare("DELETE FROM entries WHERE id = ?1 AND author_email = ?2")
      .bind(id, context.email)
      .run();
    if (!res.meta.changes) throw new Error("見つかりませんでした");
    return { deleted: id };
  });
