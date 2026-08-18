# mochizuki ｜ 望月

ありがとうを記録すると月が満ちる。30件で望月、月ごとに一つの月が残る。

音声でひとこと話すか、書くだけ。記録が増えるほど月が満ちていき、その月に何回ありがとうを感じたかが月相として残ります。ひとりで溜めることも、ふたりでひとつの月を分け合うこともできます。

**望月**（もちづき）は満月の古い呼び名です。プロダクト名がそのままゴールの状態を指しています。

作業を引き継ぐ場合は `HANDOFF.md`、エージェントに任せる場合は `AGENTS.md` を先に読んでください。

---

## 仕組み

**1件で月がすこし満ちる。30件で望月。** 月のまわりに並んだ30個の目盛りが、記録した数だけ金色に灯り、環が一周すると望月になります。ひと月に30ということは1日1つが目安です。

呼び名は満ちる側の16段階を使います。

| 件数 | 呼び名 | 件数 | 呼び名 |
|---:|---|---:|---|
| 0 | 新月 | 15–16 | 八日月 |
| 1–2 | 既朔 | 17–18 | 九夜月 |
| 3–4 | 繊月 | 19–20 | 十日夜 |
| 5–6 | 三日月 | 21–22 | 十一日月 |
| 7–8 | 眉月 | 23–24 | 十二日月 |
| 9–10 | 五日月 | 25–26 | 十三夜 |
| 11–12 | 六日月 | 27–29 | 小望月 |
| 13–14 | 上弦の月 | 30+ | **望月** |

望月が上限です。それ以上入れても欠けることはなく、超過分は `＋4` のように添えて表示します。満月の前夜を指す「小望月」が、望月のひとつ手前に来ます。

## 画面

| ルート | 内容 |
|---|---|
| `/?scope=solo\|shared` | 今月の月と、記録の入力 |
| `/year?scope=&year=&month=` | 1ページ12ヶ月。月をタップするとその月の記録が開く |

表示の状態はすべて検索パラメータに持たせています。特定の月を開いたURLをそのまま相手に送れます。

揺れるのは海だけで、月の中身は静止しています。記録した瞬間は月に金色の光輪が一度巡り、目盛りがひとつ点ります。

## ロゴ

マークは満ちる途中の月です。満月はただの円になり識別できないため、名前が到達点、マークがその過程を表しています。本体と同じ `litPath()` で描いているので、月相の定義を変えるとロゴも一緒に変わります。

一式は `brand/` に、書き出したPNGは `public/` にあります。使用ルールは `brand/README.md` を参照してください。

## デザイン

自然風景を抽象化した造形をそのままUIの言語にしています。写真もイラストも使わず、フラットな色面・ゆるやかな曲線・1pxの水平線・円・大きな余白だけで構成。見出しは明朝、ラベルは欧文サンセリフに広いletter-spacing。

| 役割 | 色 |
|---|---|
| Warm Ivory | `#F2EEE6` |
| Off White | `#FAF8F3` |
| Soft Beige | `#E6DFD2` |
| Sand | `#DACAA9` |
| Muted Blue Gray | `#BCCAD3` |
| Slate Blue | `#7A93A5` |
| Pale Gold | `#E3C489` |
| Charcoal | `#2F3439` |

純白・純黒とグラデーションは使いません。`prefers-reduced-motion` を設定している環境ではアニメーションを止めます。

キービジュアルの寸法は `src/components/Moonscape.tsx` 冒頭の定数で決まります。月を大きくするときは、目盛りの環が空の帯からはみ出さないよう次の関係を守ってください。

```
(R + TICK_GAP) <= (SEA_Y - SKY_TOP) / 2 - 16
```

## 技術構成

| 役割 | 使うもの |
|---|---|
| フレームワーク | TanStack Start（React + Vite） |
| 実行環境 | Cloudflare Workers（`@cloudflare/vite-plugin`） |
| 保存 | Cloudflare D1（SQLite） |
| 本人確認 | アプリ内のID・パスワード（Cloudflare Workers Secret） |

2人ぶんのID・パスワードは Workers Secret の `AUTH_USERS` にだけ保管します。ログイン後は署名付き・HTTP Only Cookieで本人を識別します。Cloudflare Access / Zero Trust は不要です。

SSRなので、最初のHTMLの時点で月は今月ぶんの数だけ満ちています。ルートのローダーが `monthCounts` と `listEntries` を並行で呼び、クライアント側の再取得を待たずに描画されます。

```
├── src/
│   ├── routes/
│   │   ├── __root.tsx      ドキュメント・head・ナビ
│   │   ├── index.tsx       今月の月（loader + 記録）
│   │   └── year.tsx        1年の月（12ヶ月グリッド）
│   ├── components/
│   │   ├── Moonscape.tsx   キービジュアル（月・目盛りの環・海）
│   │   ├── MoonDisc.tsx    月相の円
│   │   ├── EntryRow.tsx    記録の行と見出しラベル
│   │   ├── Mark.tsx        ロゴマーク
│   │   └── Composer.tsx    音声・文字の入力
│   ├── lib/
│   │   ├── moon.ts         月相のロジック
│   │   ├── theme.ts        配色とスタイル
│   │   ├── styles.css      アニメーション定義
│   │   └── useNarrow.ts    構図の切り替え
│   └── server/
│       └── entries.ts      server functions（D1・ログイン）
├── brand/                  ロゴ一式と使用ルール
├── public/                 アイコン・manifest
├── schema.sql
├── vite.config.ts
└── wrangler.jsonc
```

### サーバー関数

記録に関する関数はすべて `authMiddleware` を通り、`context.email` に本人が入ります。ログイン用の `getSession` / `login` / `logout` だけは例外です。

| 関数 | 用途 |
|---|---|
| `getMe` / `setName` | 表示名の取得・変更 |
| `listEntries` | 記録の一覧（`scope` / `ym` / `limit`） |
| `monthCounts` | 月ごとの件数（`GROUP BY ym`） |
| `addEntry` | 記録の追加。追加後の件数を返す |
| `deleteEntry` | 自分の記録だけ削除 |
| `getSession` / `login` / `logout` | ログイン状態の取得・開始・終了 |

`scope=shared` は登録した2人が共有する一つの月、`solo` は本人だけの月です。

月の境目はタイムゾーンで変わるため、記録時にクライアントのローカル月（`YYYY-MM`）を `ym` として保存し、集計はこの列で行います。UTCで集計すると月末深夜の記録が前月に入ってしまいます。

12ヶ月グリッドは全件ではなく集計結果だけを読みます。D1は読んだ行数で課金されるため、絞り込みに使う列にはインデックスを張っています（`schema.sql` 参照）。

## セットアップ

このリポジトリには実行に必要な設定一式が含まれています。

### 1. D1 を作る

```bash
npx wrangler d1 create mochizuki
```

出力された `database_id` を `wrangler.jsonc` に貼り、スキーマを流します。

```bash
npm run db:local    # ローカル用
npm run db:remote   # 本番用
npm run cf-typegen  # D1Database などの型を生成
```

### 2. ローカルで動かす

```bash
cp .dev.vars.example .dev.vars
npm run dev
```

`.dev.vars` の2組の `id` / `email` / `name` / `password` と、32文字以上の `SESSION_SECRET` を自分用の値に変更します。このファイルは秘密情報なのでコミットしません。

`@cloudflare/vite-plugin` が開発サーバー上でWorkersランタイムとD1を再現するので、`vite dev` のままバインディングが使えます。

### 3. 本番のログイン情報を設定する

Cloudflare Dashboard で **Workers & Pages → mochizuki → Settings → Variables and Secrets** を開き、どちらも **Secret** として追加します。

| 名前 | 値 |
|---|---|
| `AUTH_USERS` | `[{"id":"user1","email":"user1@example.com","name":"名前1","password":"十分に長いパスワード"},{"id":"user2","email":"user2@example.com","name":"名前2","password":"十分に長いパスワード"}]` |
| `SESSION_SECRET` | 32文字以上のランダムな文字列 |

ID・メールアドレスは2人で重複させません。値をこのチャットやGitHubに貼らないでください。

### 4. デプロイ

```bash
npx wrangler login
npm run deploy
```

`*.workers.dev` のサブドメイン、または独自ドメインに出ます。GitHub連携（Workers Builds）にすれば push ごとの自動デプロイもできます。

## 費用

Cloudflare の無料枠で収まります。Workers は1日10万リクエスト、D1 は1日500万行読み取り・10万行書き込み・5GBです。2人で1日数十リクエストなら枠の0.1%にも届きません。

**無料プランは上限を超えても自動課金されず、その日は止まるだけです。** 課金が始まるのは自分で有料プラン（Workers Paid・月5ドル）を契約したときだけ。ただし有料に上げた後は超過分が自動請求されます。数字は変わることがあるので、始める前に公式の料金ページで確認してください。

## 音声入力について

Web Speech API を使います。Chrome系ブラウザで安定して動作し、iOS Safari では不安定なことがあります。使えない環境では鉛筆アイコン（テキスト入力）だけの表示に自動で切り替わります。

## これから

- [ ] 入力のバリデーションを Zod + `inputValidator` に置き換える
- [ ] Service Worker でオフラインでも開けるようにする
- [ ] 望月になった日を通知する
- [ ] iOS/Android のウィジェットで今月の月を見せる（ネイティブ化が必要）
