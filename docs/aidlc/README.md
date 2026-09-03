# AI-DLC 作業ディレクトリ

このプロジェクトは [AI-DLC](https://github.com/awslabs/aidlc-workflows)（AI-Driven Development Life Cycle）に沿って進める。
AI が提案し、人が検証して承認する。承認されていない段階の内容で実装しない。

## 進行状況

| Phase | Stage | 成果物 | 状態 |
| --- | --- | --- | --- |
| 1 Ideation | 1.1 Intent Capture | `intent.md` | **承認済み** |
| 2 Inception | 2.1 Reverse Engineering | `reverse-engineering.md` | **承認済み** |
| 2 Inception | 2.3 Requirements Analysis | `requirements.md` | **承認済み** |
| 2 Inception | 2.4 User Stories | — | **省略**（利用者は部員・管理者の2種のみで、既存システムが稼働中のため） |
| 2 Inception | 2.6 Domain Design | `components.md` | **承認済み** |
| 2 Inception | 2.7 Units Generation | `unit-of-work.md` | **承認済み** |
| 3 Construction | 3.1 以降 | 実装 | **次はここ**（U-9 から着手） |

既存システムが本番稼働しているため、Phase 0/1 の大半は省略し、2.1 Reverse Engineering から入る。
2.4 User Stories は、利用者が部員・管理者の2種のみで既存システムが稼働中のため省略した。

Inception は完了。実装は `unit-of-work.md` の単位で進める。
実装の根拠は必ずこのディレクトリの要件番号（FR-/NFR-/C-）を指す。

## 原則

- **承認ゲート**: 各段階は人の承認を経てから次へ進む。
- **問いを先に**: AI は不明点を質問として提示し、人が答えてから記述する（Mob Elaboration）。
- **記録が正**: ここに書かれていないことは実装しない。実装の根拠は必ずこのディレクトリを指す。
