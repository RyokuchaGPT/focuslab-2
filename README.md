# Google Focus Lab

> 集中状態を設計・維持・回復するためのサウンドツール（非公式プロトタイプ）

## 概要

Google Focus Lab は、音楽アプリではありません。人間の集中状態を設計、維持、回復するためのツールです。音は抽象的で機能的な媒体として扱われ、音楽コンテンツとしては扱いません。

## 実装済み機能

### コア機能
- ✅ **サウンドプロファイルエディター** - 4つのレイヤーによるビジュアル音声構成エディター
  - **ベース周波数レイヤー** - 知覚的な深さを表すカーブエディター（低め/標準/高め）
  - **テクスチャレイヤー** - なめらかさ/ざらつきを調整するペイントスタイルエディター
  - **モジュレーションレイヤー** - 時間ベースの変動（安定/ゆらぎ/不規則）
  - **無音区間レイヤー** - ドラッグ＆リサイズ可能な無音ブロック

### オーディオエンジン
- ✅ **Web Audio API実装** - ミニマルで機能的なオーディオグラフ
  ```
  OscillatorNode → BiquadFilterNode → GainNode → StereoPannerNode → GainNode → Destination
  ```
- ✅ リバーブ・ディレイなし（中立的で気を散らさない音）
- ✅ リアルタイムプレビュー機能

### UI/UX
- ✅ **Material Design 3 (Material You)** 準拠のデザインシステム
- ✅ トップアプリバー
- ✅ タイムラインカード（水平スクロール対応）
- ✅ レイヤーエディター（アコーディオン形式）
- ✅ ボトムアクションバー
- ✅ ナビゲーションドロワー
- ✅ モーダルダイアログ（プロファイル選択、保存、設定）
- ✅ スナックバー通知

### PWA機能
- ✅ **100%オフライン動作**
- ✅ Service Worker によるキャッシング
- ✅ インストール可能（デスクトップ・モバイル）
- ✅ manifest.json 完備
- ✅ アイコンセット（72px〜512px SVG）

### データ管理
- ✅ localStorage によるオフラインデータ永続化
- ✅ プロファイルの作成・編集・削除
- ✅ プリセットプロファイル（集中モード、深い集中、クリエイティブ）
- ✅ セッション履歴の記録
- ✅ 設定の保存（マスターボリューム、通知、Pro モード）

### Pro モード（Adaptive Focus）
- ✅ セッション中の自動音調整
- ✅ 経過時間とインタラクション頻度に基づく微調整
- ✅ セッション後のメッセージ表示：「このセッションでは音が自動調整されました」

## ファイル構造

```
/
├── index.html              # メインHTML
├── manifest.json           # PWAマニフェスト
├── sw.js                   # Service Worker
├── css/
│   ├── material-tokens.css # Material Design 3 トークン
│   └── styles.css          # メインスタイルシート
├── js/
│   ├── app.js              # アプリケーションエントリポイント
│   ├── audio-engine.js     # Web Audio API エンジン
│   ├── data-model.js       # データモデル（localStorage）
│   └── ui-controller.js    # UIコントローラー
├── icons/
│   ├── icon-72.svg
│   ├── icon-96.svg
│   ├── icon-128.svg
│   ├── icon-144.svg
│   ├── icon-152.svg
│   ├── icon-192.svg
│   ├── icon-384.svg
│   └── icon-512.svg
└── README.md
```

## 機能エントリーポイント

| パス | 説明 |
|------|------|
| `/index.html` | メインアプリケーション |

## データモデル

### Sound Profile
```json
{
  "id": "profile-id",
  "name": "集中プロファイル",
  "duration": 1500,
  "layers": {
    "baseFrequency": {
      "curve": [{ "time": 0, "value": 0.4 }]
    },
    "texture": {
      "densityMap": [{ "time": 0, "value": 0.3 }]
    },
    "modulation": {
      "type": "gentle",
      "intensity": 0.3
    },
    "silence": {
      "blocks": [{ "start": 420, "duration": 4 }]
    }
  }
}
```

### ストレージキー
- `focuslab_profiles` - ユーザープロファイル
- `focuslab_current_profile` - 現在のプロファイルID
- `focuslab_settings` - アプリ設定
- `focuslab_history` - セッション履歴

## 技術仕様

### 制約
- ✅ 100%オフライン動作
- ✅ サーバー、API、クラウド、分析なし
- ✅ localStorage のみ使用
- ✅ フレームワークなし（Vanilla JavaScript）
- ✅ 外部ライブラリなし

### Material Design 3 準拠
- サーフェスベースのUI（ボーダーではなく）
- 微妙なエレベーション
- 色はUIの状態を示す（音パラメータではない）
- 画面ごとに1つのプライマリアクション
- 機能的なモーションのみ（状態遷移、約200ms）

### Web Audio API 構成
- OscillatorNode（正弦波）
- BiquadFilterNode（テクスチャ用ローパスフィルター）
- GainNode（密度、無音ゲート、マスター）
- StereoPannerNode（微妙な空間移動）

## 推奨される次のステップ

1. **セッションスケジューリング** - タイマーとポモドーロテクニックの統合
2. **バイノーラルビート** - オプションのバイノーラルビートレイヤー追加
3. **データエクスポート/インポート** - プロファイルのバックアップ機能
4. **キーボードショートカット** - より詳細なキーボード操作
5. **タイムラインの詳細編集** - ポイントの追加・削除・移動の改善

## ライセンス

このプロジェクトは非公式プロトタイプであり、Google とは関係ありません。
教育目的でのみ使用してください。

---

*"A real internal Google tool that escaped the lab."*
