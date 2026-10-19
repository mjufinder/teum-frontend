# mjufinder-fe

mjufinder 프로젝트의 프론트엔드입니다.

## 기술 스택

- **Next.js** (App Router) — React 기반 프레임워크
- **TypeScript**
- **Tailwind CSS**
- **Supabase** — 인증(소셜 로그인) / DB 클라이언트
- **Vercel** — 배포

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 에 Supabase / 백엔드 주소 값을 채워주세요.

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속.

## 환경변수

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 |
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI 백엔드 주소 (기본 `http://localhost:8000`) |

## 프로젝트 구조

```
src/
├── app/            # App Router 페이지/레이아웃
└── lib/
    ├── supabase.ts # Supabase 클라이언트
    └── api.ts      # FastAPI 호출용 fetch 래퍼
```

## 주요 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 |
| `npm run lint` | ESLint 검사 |

## 배포 (Vercel)

1. Vercel 에서 이 레포를 import
2. Environment Variables 에 위 환경변수 등록
3. 자동 배포

## 연관 레포

- 백엔드: [mjufinder-be](https://github.com/mjufinder/mjufinder-be)
