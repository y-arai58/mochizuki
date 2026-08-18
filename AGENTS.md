# AGENTS.md

このリポジトリで作業するエージェント向けの規約。人間の読み手にはREADME.mdと`HANDOFF.md`がある。

## プロダクト

「望月（mochizuki）」。ありがとうを記録すると月が満ちる。30件で望月（満月）。ひと月ごとに一つの月が残り、1年ページで12ヶ月ぶんの月相が並ぶ。夫婦2人での利用を想定した個人用途のアプリ。

## スタック

TanStack Start（React + Vite） / Cloudflare Workers / D1 / Cloudflare Access。TypeScript。

**Cloudflare Pagesは使わない。** Workersへデプロイする。`wrangler.jsonc` の `main` は `@tanstack/react-start/server-entry`。

## コマンド

```bash
npm run dev          # vite dev（Workersランタイムとバインディングを再現）
npm run build        # vite build
npm run deploy       # build して wrangler deploy
npm run cf-typegen   # D1Database などの型を生成
npm run db:local     # ローカルD1にschema.sqlを流す
npm run db:remote    # 本番D1にschema.sqlを流す
```

変更後は必ず `npm run build` が通ることを確認する。型エラーを`any`や`@ts-ignore`で潰さない。

## 絶対に壊してはいけないもの

### セキュリティ

- 認証は Cloudflare Access に依存している。`src/server/entries.ts` の `authMiddleware` を経由しないサーバー関数を追加してはならない。
- `DEV_EMAIL` はローカル専用のフォールバック。**本番の環境変数に設定する提案をしてはならない。** これを設定すると認証が無効化される。
- `.dev.vars` をコミットしない。
- 記録の削除は本人のものだけ（`author_email` の一致を必須にする）。この条件を外さない。

### D1のコスト

D1は**読んだ行数**で課金される。`WHERE` や `ORDER BY` に使う列にはインデックスが必要（`schema.sql` 参照）。新しいクエリを追加するときは、既存のインデックスで足りるか確認し、足りなければインデックスも追加する。`SELECT *` と全件取得を避ける。12ヶ月グリッドは集計（`monthCounts`）だけを読み、全件を読まない。

### タイムゾーン

月の境目はユーザーのローカル時刻で決まる。記録時にクライアントが `ym`（`YYYY-MM`）を送り、集計はこの列で行う。**サーバー側で `created_at` から月を計算し直してはならない。** UTC集計にすると月末深夜の記録が前月に入る。

### 月相のロジック

`src/lib/moon.ts` が単一の情報源。画面・アーカイブ・ロゴすべてがここを使う。

- `FULL = 30` が上限。**30件を超えても月は欠けない。**
- 望月（満月）は `count >= 30` のときだけ。29件では小望月に留まる（丸め誤差で29件が満月になる実装にしないこと）。
- 呼び名は満ちる側の16段階のみ。十六夜・立待月など満月以降の呼び名は使わない。

### キービジュアルの寸法

`src/components/Moonscape.tsx` 冒頭の定数。目盛りの環が空の帯からはみ出さないこと。

```
(R + TICK_GAP) <= (SEA_Y - SKY_TOP) / 2 - 16
```

現在: R=78, TICK_GAP=20, SKY_TOP=34, SEA_Y=268 → 環は53〜249、空は34〜268。

### アニメーションの約束

- **揺れるのは海だけ。月の中身は静止する。** 記録しても海は反応しない。
- 記録時の合図は月まわりのみ（金色の光輪・目盛りが1つ点る・月相のフェード）。水が落ちる演出や波紋は意図的に削除済みなので復活させない。
- SVG要素にCSSの`transform`アニメーションを当てる場合、同じ要素の`transform`属性は上書きされる。位置決めは必ず親グループに置く（過去にこれで海が画面いっぱいに広がるバグを出した）。
- `prefers-reduced-motion` で常時アニメーションを止める。

## デザイン規約

参考は「Landscape → Abstraction → Interface」。自然風景を抽象化した造形をUIの言語にしている。

- 写真とイラストを使わない。フラットな色面・ゆるやかな曲線・1pxの線・円・大きな余白だけで構成する
- **純白・純黒・グラデーションを使わない。** 配色は `src/lib/theme.ts` の `T` のみ
- カードUIを作らない。border-radius・drop-shadow・glassmorphismを使わない。区切りは1pxの線と余白
- 見出しは明朝（`SERIF`）、ラベルは欧文サンセリフ（`SANS`）に広い`letter-spacing`
- セクション見出しは `01 RECORD` のような番号＋欧文ラベル（`Eyebrow`）。日本語の見出しは付けない
- モバイルは縮小ではなく構図を組み替える（`useNarrow` と `viewBox` の切り替え）
- ロゴは `src/components/Mark.tsx`。`litPath()` から描いているので勝手に別のSVGに差し替えない。ルールは `brand/README.md`

スタイルはインラインstyleと`src/lib/theme.ts`で組んでいる。CSSフレームワークやUIライブラリを導入しない。アニメーション定義は `src/lib/styles.css`。

## コードの方針

- 状態は検索パラメータに持たせる（`?scope=shared`、`/year?year=2026&month=8`）。URLを送れば同じ画面が開くことを保つ
- データ取得はルートのローダー。更新後は `router.invalidate()`。手書きのリフレッシュstateを増やさない
- ブラウザAPI（`window`、SpeechRecognition）はSSRで動かない。`useEffect`の中か、クライアント専用コンポーネントに閉じる
- 日本語のUI文言は「ですます」を使わず短く。「そそぐ」「満ちる」といった既存の語彙に合わせる
- コメントは日本語。なぜそうしたかを書く（何をしているかはコードで読める）

## 依存の追加

原則追加しない。追加する場合は理由を書いて確認を取る。Workersランタイムで動かないNode専用パッケージを入れない。

## 注意（TanStack Startのバージョン差）

APIが変わりやすい。以下は動作確認が必要な箇所。

- `createServerFn` の入力検証は現在ハンドラ内で手検証している。`.inputValidator` / `.validator` の名前がバージョンで異なるため意図的に使っていない
- `getRequestHeader` は `@tanstack/react-start/server` から。`request`オブジェクトを引数で受け取る古い書き方は使わない
- Cloudflareバインディングは `import { env } from "cloudflare:workers"`
- `package.json` と `tsconfig.json` はこのリポジトリに含めていない（バージョン固定を避けるため）。`npm create cloudflare@latest -- mochizuki --framework=tanstack-start` の生成物を使う
