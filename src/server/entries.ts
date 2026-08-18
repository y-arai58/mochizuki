import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, getRequestProtocol, setCookie } from "@tanstack/react-start/server";
import { env as cfEnv } from "cloudflare:workers";
import { FULL, isYm } from "../lib/moon";

const env = cfEnv as unknown as { DB: D1Database; AUTH_USERS?: string; SESSION_SECRET?: string };

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

type AuthUser = {
  id: string;
  email: string;
  name: string;
  password: string;
};

type SessionPayload = {
  email: string;
  exp: number;
};

type WorkerSubtleCrypto = SubtleCrypto & {
  timingSafeEqual: (left: ArrayBuffer | ArrayBufferView, right: ArrayBuffer | ArrayBufferView) => boolean;
};

const SESSION_COOKIE = "mz_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const asAuthUser = (value: unknown): AuthUser | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const email = typeof candidate.email === "string" ? candidate.email.trim().toLowerCase() : "";
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const password = typeof candidate.password === "string" ? candidate.password : "";
  return id && email && name && password ? { id, email, name, password } : undefined;
};

const authUsers = (): AuthUser[] => {
  if (!env.AUTH_USERS) throw new Error("ログイン設定が完了していません");
  try {
    const parsed = JSON.parse(env.AUTH_USERS) as unknown;
    if (!Array.isArray(parsed)) throw new Error();
    const users = parsed.map(asAuthUser);
    if (users.some((user) => !user) || users.length !== 2) throw new Error();
    const validUsers = users as AuthUser[];
    if (
      new Set(validUsers.map((user) => user.id)).size !== validUsers.length ||
      new Set(validUsers.map((user) => user.email)).size !== validUsers.length
    ) {
      throw new Error();
    }
    return validUsers;
  } catch {
    throw new Error("ログイン設定が正しくありません");
  }
};

const sessionSecret = () => {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    throw new Error("ログイン設定が完了していません");
  }
  return env.SESSION_SECRET;
};

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const fromBase64Url = (value: string) => {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

const sign = async (value: string) => {
  const key = await crypto.subtle.importKey("raw", encoder.encode(sessionSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
};

const sameValue = (left: string, right: string) => {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  return leftBytes.length === rightBytes.length && (crypto.subtle as WorkerSubtleCrypto).timingSafeEqual(leftBytes, rightBytes);
};

const issueSession = async (email: string) => {
  const payload: SessionPayload = { email, exp: Date.now() + SESSION_TTL_SECONDS * 1000 };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  return `${encodedPayload}.${await sign(encodedPayload)}`;
};

const readSession = async (): Promise<AuthUser | undefined> => {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return undefined;
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra || !sameValue(signature, await sign(encodedPayload))) return undefined;

  try {
    const payload = JSON.parse(decoder.decode(fromBase64Url(encodedPayload))) as Partial<SessionPayload>;
    if (typeof payload.email !== "string" || typeof payload.exp !== "number" || payload.exp <= Date.now()) return undefined;
    return authUsers().find((user) => user.email === payload.email);
  } catch {
    return undefined;
  }
};

const sessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: getRequestProtocol() === "https",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
});

/**
 * 個別のID・パスワードで発行した署名付きCookieから本人を特定する。
 * 資格情報と署名鍵はWorkers Secretにのみ置き、ソースコードには含めない。
 */
const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const user = await readSession();
  if (!user) throw new Error("ログインしてください");
  return next({ context: { email: user.email, name: user.name } });
});

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const user = await readSession();
    return { configured: true, user: user ? { email: user.email, name: user.name } : null };
  } catch {
    return { configured: false, user: null };
  }
});

export const login = createServerFn({ method: "POST" })
  .validator((data: unknown) => data)
  .handler(async ({ data }) => {
    const input = (data ?? {}) as { id?: unknown; password?: unknown };
    const id = typeof input.id === "string" ? input.id.trim() : "";
    const password = typeof input.password === "string" ? input.password : "";
    const user = authUsers().find((candidate) => candidate.id === id);
    if (!user || !sameValue(user.password, password)) throw new Error("IDまたはパスワードが違います");

    setCookie(SESSION_COOKIE, await issueSession(user.email), sessionCookieOptions());
    return { email: user.email, name: user.name };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(SESSION_COOKIE, sessionCookieOptions());
  return { loggedOut: true };
});

/* ───────── 表示名 ───────── */

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const row = await env.DB.prepare("SELECT name FROM profiles WHERE email = ?1")
      .bind(context.email)
      .first<{ name: string }>();
    return { email: context.email, name: row?.name ?? context.name ?? nameFromEmail(context.email) };
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
      author_name: profile?.name ?? context.name ?? nameFromEmail(context.email),
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
