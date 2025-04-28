# @recipetools/core デモアプリケーション

このリポジトリは[@recipetools/core](https://github.com/irori-dev/recipetools-core)ライブラリの機能を紹介するためのデモアプリケーションです。

## 概要

@recipetools/coreは、料理レシピを構造化データとして扱い、様々な分析や可視化を行うためのツールキットです。主な機能は以下の通りです：

- レシピJSONの検証（バリデーション）
- レシピデータの解析
- 調理プロセスの可視化（Mermaidグラフの生成）

このデモアプリケーションでは、上記機能の使用方法をブラウザ上で体験できます。

## 使い方

1. サンプルのレシピJSONをテキストエリアに貼り付ける
2. 「レシピを表示する」ボタンをクリック
3. レシピの各情報と調理プロセス図が表示されます

## 試してみる

以下のURLで公開されているデモアプリを試すことができます：
[https://recipetools-playground.web.app](https://recipetools-playground.web.app)

## サンプルレシピJSON

`public/samples`ディレクトリにサンプルJSONが用意されています。これらのサンプルを使って@recipetools/coreの機能を試すことができます。

## 開発者向け情報

### インストール
```bash
pnpm install
```

### 開発サーバー起動
```bash
pnpm dev
```

### ビルド
```bash
pnpm build
```

### デプロイ（Firebase）
```bash
pnpm build
npx firebase deploy
```

## ライセンス

MIT
