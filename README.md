# StockBrief-fe

StockBrief 프론트엔드 레포지토리. Next.js App Router 기반의 한국 국내 주식 추천 후보 서비스 UI.

StockBrief는 투자 조언을 제공하지 않는다. 모든 추천은 `검토 후보 추천`이며, 매수·매도 지시, 목표가, 수익 보장이 아니다.

## 레포 범위

| 구분 | 내용 |
| --- | --- |
| `src/app/` | Next.js App Router 페이지 |
| `src/components/` | UI 컴포넌트 (CandidateCard, EvidenceBadge, RiskTag 등) |
| `src/lib/` | API 클라이언트, Cognito 인증, watchlist 스토리지/싱크 |
| `src/types/` | TypeScript API 및 watchlist 타입 정의 |
| `docs/product/` | MVP PRD, 제품 정책 |
| `docs/engineering/` | API 계약 (BE 참조용) |

## 로컬 셋업

```bash
npm install
```

환경변수 설정:

```bash
cp .env.example .env.local
# NEXT_PUBLIC_API_BASE_URL 등 설정
```

## 개발 서버 실행

```bash
npm run dev
```

기본 주소: [http://localhost:3000](http://localhost:3000)

백엔드 API는 `http://localhost:8000` 에서 실행되어야 한다.

## 주요 페이지

| 경로 | 설명 |
| --- | --- |
| `/` | 메인 (추천 후보 목록으로 리다이렉트) |
| `/recommendations` | 추천 후보 목록 |
| `/stocks/[ticker]` | 종목 상세 및 에비던스 |
| `/watchlist` | 관심목록 (localStorage 기반, MVP) |
| `/onboarding` | 온보딩 |
| `/account` | 계정 (P1, Cognito 인증 필요) |

## 검증 명령어

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript 타입 체크
npm run build      # 프로덕션 빌드
```

## 브랜치 정책

- `main`: 보호 브랜치, 직접 push 금지
- `feat/<issue>-<slug>`: 새 기능
- `fix/<issue>-<slug>`: 버그 수정
- `docs/<slug>`: 문서 변경
- `release/<version>`: 릴리즈 직전 안정화

커밋 타입: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`

## API 계약

API 계약은 BE 레포에서 먼저 고정한다. `docs/engineering/API_CONTRACT.md`를 참조하고, 타입은 `src/types/api.ts`에서 관리한다.

- Backend canonical API base: `/v1`
- Recommendation candidates: `GET /v1/recommendations/candidates`

## 관련 레포

- [StockBrief-be](https://github.com/your-org/StockBrief-be) — FastAPI 백엔드, DB, 인프라
- [StockBrief-wiki](https://github.com/your-org/StockBrief-wiki) — 결정 로그, 회의록, 스프린트 기록
