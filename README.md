# SOLARICH 1000 着せ替えシート検討

SOLARICH 1000 の着せ替えシートに関する検討内容を社内レビュー用にまとめた静的サイト。

## 公開URL

https://javasparrowinada.github.io/solarich-1000/

## 構成

| ファイル | 内容 |
|---|---|
| `index.html` | 検討ページ本体（前提 / シート案 / 仕様・制約 / 論点） |
| `assets/` | シート案の画像 |

素の HTML / CSS 単一ファイル構成。ビルド不要、`index.html` を直接編集する。

## 運用

1. `git fetch origin main && git checkout -B claude/xxx origin/main`
2. 編集してコミット
3. PR 作成 → マージ
4. GitHub Pages の反映を本番URLで確認
