🇺🇸 [한국어](./README.ko.md)

# DuoTrack

앱인토스 (Vite + React + TDS) 국내 어학 앱 사용자의 최대 불만인 '광고 중단 + 학습 흐름 파괴' 문제와 Duolingo식 게임화의 낮은 실력 향상 효과에 지친 학습자들을 위해, 광고 없는 집중 학습 + 실제 시험(토익·오픽) 점수 연동 트래킹으로 '학습 ROI'를 증명해주는 영어 학습 성과 관리 앱 Duolingo는 광고가 학습 흐름을 자주 방해하고(앱스토어 1점 리뷰 다수), 게임 요소가 재미는 있으나 토익 점수 향상과 연결되지 않는다는 불만이 지배적. 국내 어학 학원·인강은 학습은 하는데 '얼마나 늘었는지' 객관적 측정이 안 됨. 취업 준비생·직장인은 토익·오픽 목표 점수까지의 진척도를 한눈에 보고 싶어함.

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/Home` | Home |
| `/NotFound` | NotFound |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-07-22
