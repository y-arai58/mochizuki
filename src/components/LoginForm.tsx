import { useState } from "react";
import { lineInput, quietBtn, SERIF, T, wrap } from "../lib/theme";
import { login } from "../server/entries";

type Props = {
  configured: boolean;
  onLoggedIn: () => Promise<void>;
};

export function LoginForm({ configured, onLoggedIn }: Props) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id.trim() || !password || busy) return;
    setBusy(true);
    setNote("");
    try {
      await login({ data: { id, password } });
      await onLoggedIn();
    } catch (error) {
      setNote((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ ...wrap, paddingTop: 94, paddingBottom: 120, maxWidth: 420 }}>
      <p style={{ fontSize: 10, letterSpacing: "0.26em", color: T.warmGray, margin: 0 }}>MOCHIZUKI</p>
      <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 30, letterSpacing: "0.2em", margin: "18px 0 0" }}>
        望月
      </h1>
      <p style={{ fontSize: 12.5, lineHeight: 2.1, letterSpacing: "0.08em", color: T.warmGray, margin: "24px 0 0" }}>
        ふたりだけの月です。
        <br />
        IDとパスワードを入れてください。
      </p>

      {configured ? (
        <form onSubmit={submit} style={{ marginTop: 42 }}>
          <label style={{ display: "block", fontSize: 10, letterSpacing: "0.22em", color: T.warmGray }}>ID</label>
          <input
            autoComplete="username"
            value={id}
            onChange={(event) => setId(event.target.value.slice(0, 40))}
            style={{ ...lineInput, marginTop: 10, width: "100%" }}
          />
          <label style={{ display: "block", fontSize: 10, letterSpacing: "0.22em", color: T.warmGray, marginTop: 28 }}>
            PASSWORD
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value.slice(0, 200))}
            style={{ ...lineInput, marginTop: 10, width: "100%" }}
          />
          <button type="submit" disabled={busy || !id.trim() || !password} style={{ ...quietBtn(!busy && !!id.trim() && !!password), marginTop: 34 }}>
            {busy ? "入っています" : "月へ入る"}
          </button>
        </form>
      ) : (
        <p style={{ fontSize: 12.5, lineHeight: 2.1, letterSpacing: "0.08em", color: T.warmGray, marginTop: 42 }}>
          まだログインの準備ができていません。
        </p>
      )}

      {note && <p style={{ fontSize: 11, lineHeight: 2, letterSpacing: "0.08em", color: T.slateDeep, marginTop: 28 }}>{note}</p>}
    </main>
  );
}
