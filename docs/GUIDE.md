# Axis License 프로젝트 가이드

## 목차

1. [개요](#개요)
2. [기술 스택](#기술-스택)
3. [아키텍처](#아키텍처)
4. [프로젝트 구조](#프로젝트-구조)
5. [원본 파일 → Next.js 매핑](#원본-파일--nextjs-매핑)
6. [주요 데이터 흐름](#주요-데이터-흐름)
7. [API 사용 방법](#api-사용-방법)
8. [환경변수](#환경변수)
9. [로컬 실행](#로컬-실행)
10. [Cloud Run 배포](#cloud-run-배포)
11. [인증 방식](#인증-방식)
12. [DB 변경 시](#db-변경-시)
13. [관리자 비밀번호 변경](#관리자-비밀번호-변경)
14. [Git 브랜치 관리](#git-브랜치-관리)

---

## 개요

PHP/CodeIgniter 3 기반의 라이센스 관리 시스템을 **React + Next.js**로 리뉴얼한 프로젝트입니다.
Cloud Run 배포를 목적으로 하며, 기존 기능을 그대로 유지합니다.

---

## 기술 스택

| 항목 | 기존 | 변경 |
|------|------|------|
| 프레임워크 | PHP / CodeIgniter 3 | Next.js 14 (Pages Router) |
| 프론트엔드 | PHP View (HTML) | React JSX + MUI (Material UI v5) |
| DB 연결 | PDO / mysqli | pg (PostgreSQL 커넥션 풀) |
| 세션 | PHP Session | iron-session (쿠키 기반) |
| 파일 업로드 | FTP (PHP ftp_*) | basic-ftp |
| 설정값 | 하드코딩 | .env.local |

---

## 아키텍처

```
Pages (UI)
  └─ getServerSideProps → Models (DB 직접 호출)
  └─ getServerSideProps → utils/ftp.js (FTP 직접 호출)

API Routes (/api/auth/)
  └─ 인증 처리 전용 (login, logout)
  └─ 라이선스 등록/수정/삭제 (license.js → licenseService)
  └─ 파일 다운로드 (ftp.js default handler)

API Routes (/api/spauth/)
  └─ AOS/iOS 라이선스 인증 XML 응답 (Redis 캐시 적용)
```

### 계층 구조 원칙

- **Pages (`src/pages/auth/`)**: UI 렌더링 + `getServerSideProps`에서 모델/FTP 직접 호출
- **Models (`src/models/`)**: DB 쿼리 함수 전용 (pool.query만 사용)
- **Services (`src/services/`)**: 비즈니스 로직 (FTP 업로드 + DB 저장 + 캐시 무효화)
- **Utils (`src/utils/`)**: 폼 파싱, 날짜 등 범용 유틸리티
- **`/api/auth/`**: 인증(login/logout), 라이선스 CRUD, 파일 다운로드 담당
- **`/api/spauth/`**: 모바일 앱 전용 — Redis 캐시 적용

---

## 프로젝트 구조

```
license_/
├── GUIDE.md
├── jsconfig.json             # @ path alias (src/)
├── next.config.js            # rewrites: spauth.php → /api/spauth 등
├── package.json
├── public/
│   └── images/               # favicon, logo 이미지
└── src/
    ├── config/
    │   ├── db_pg.js          # PostgreSQL 커넥션 풀 (pg)
    │   ├── redis.js          # Redis 연결 설정 (ioredis)
    │   ├── session.js        # iron-session 옵션
    │   ├── auth.js           # IP 화이트리스트 자동로그인 처리
    │   └── theme.js          # MUI 테마 (#ff4400 브랜드 컬러)
    ├── lib/
    │   ├── cache.js          # Redis 캐시 유틸리티 (getCache, setCache, delCache)
    │   └── logger.js         # 파일 로그 유틸리티 (writeLog)
    ├── models/
    │   └── license_pg.js     # DB 쿼리 함수 (getLicenseList, getLicenseDetail, saveLicense, deleteLicense)
    ├── services/
    │   └── licenseService.js # 라이선스 등록/수정/삭제 비즈니스 로직 + 캐시 무효화
    ├── utils/
    │   ├── form.js           # parseForm (formidable), getField, readJsonBody
    │   └── date.js           # getNowStr (YmdHis 형식)
    ├── hooks/
    │   ├── useAppRouter.js   # 라우터 훅 (PATHS, buildListUrl, buildViewUrl, toList, toView, deleteItem, logout)
    │   └── useFlashMessage.js  # alert 후 URL query 정리
    ├── styles/
    │   └── spauth.css        # 기존 PHP 스타일시트 (레거시)
    ├── components/
    │   ├── Header.jsx        # MUI AppBar (로고, 로그아웃 버튼)
    │   ├── Footer.jsx        # 저작권 + dev 환경 렌더 정보
    │   └── Layout.jsx        # Header + Container + Footer 조합
    └── pages/
        ├── _app.jsx          # MUI ThemeProvider + CssBaseline
        ├── index.jsx         # / → /auth 리다이렉트
        ├── auth/
        │   ├── index.jsx          # 라이선스 목록 (SSR, 검색/페이지네이션)
        │   ├── Spauth_login.jsx   # 로그인
        │   └── Spauth_view.jsx    # 라이선스 등록/수정 (FTP+DB 처리)
        └── api/
            ├── spauth/
            │   ├── index.js  # 라이선스 인증 XML API (spauth.php 대응)
            │   ├── spauth.js # 라이선스 인증 XML API (spauth/spauth.php 대응)
            │   └── log/      # API 에러 로그 (custom_YYYYMMDD.log, .gitignore 제외)
            └── auth/
                ├── login.js  # 로그인 처리
                ├── logout.js # 로그아웃
                ├── license.js # 라이선스 등록/수정/삭제 API
                └── ftp.js    # FTP 함수(ftpUpload, ftpDelete, processUploads) + 파일 다운로드 핸들러
```

---

## 원본 파일 → Next.js 매핑

| 원본 (PHP) | Next.js | URL |
|---|---|---|
| `spauth.php` | `api/spauth/index.js` | `GET /spauth.php?license_code=` |
| `spauth/spauth.php` | `api/spauth/spauth.js` | `GET /spauth/spauth.php?license_code=` |
| `Auth` 컨트롤러 (blist) | `pages/auth/index.jsx` | `/auth` |
| `Auth` 컨트롤러 (login) | `pages/auth/Spauth_login.jsx` | `/auth/Spauth_login` |
| `Auth` 컨트롤러 (bregister) | `pages/auth/Spauth_view.jsx` | `/auth/Spauth_view` |
| `Auth` 컨트롤러 (proclogin) | `api/auth/login.js` | `POST /api/auth/login` |
| `Auth` 컨트롤러 (logout) | `api/auth/logout.js` | `GET /api/auth/logout` |
| `Auth` 컨트롤러 (procregister) | `getServerSideProps` in Spauth_view | multipart POST `/auth/Spauth_view` |
| `Auth` 컨트롤러 (bdelete) | `getServerSideProps` in Spauth_view | JSON POST `/auth/Spauth_view` |
| `Auth` 컨트롤러 (getfile) | `api/auth/ftp.js` (default handler) | `GET /api/auth/ftp?file=` |

---

## 주요 데이터 흐름

### 목록 조회 (`/auth`)
```
브라우저 → GET /auth
  → getServerSideProps → getLicenseList() (models/license_pg.js)
  → props로 rows, totalRows 전달 → SSR 렌더
```

### 등록/수정 저장 (`/auth/Spauth_view`)
```
브라우저 → handleSubmit → fetch('/api/auth/license', { method:'POST', body: FormData })
  → api/auth/license.js (multipart/form-data)
    → saveLicenseInfo()                   ← services/licenseService.js
      1. processUploads(fields, files)    ← pages/api/auth/ftp.js
         ├─ ftpUpload() → FTP 서버에 업로드
         └─ ftpDelete() → 구 파일 FTP 삭제
      2. saveLicense(mode, code, setData) ← models/license_pg.js
      3. delCache(licenseCode)            ← lib/cache.js (Redis 캐시 무효화)
  → JSON 응답 → 클라이언트 navigate
```

### 삭제
```
브라우저 → deleteItem() → fetch('/api/auth/license', { method:'POST', body: JSON })
  → api/auth/license.js (application/json)
    → deleteLicenseInfo(licenseCode)      ← services/licenseService.js
      1. ftpDelete() → FTP 파일 삭제
      2. deleteLicense(licenseCode)       ← models/license_pg.js
      3. delCache(licenseCode)            ← lib/cache.js (Redis 캐시 무효화)
  → JSON 응답 → 클라이언트 navigate
```

### spauth API 조회 (`/api/spauth`)
```
클라이언트 → GET /spauth?license_code=...
  → 검증 실패 시 → 에러 로그 기록 (api/spauth/log/custom_YYYYMMDD.log) → XML 반환
  → Redis 캐시 조회 (HIT → 즉시 XML 반환)
  → MISS → PostgreSQL DB 조회
    → 데이터 없음/DB 에러 시 → 에러 로그 기록 → XML 반환
    → 성공 → XML 생성 → Redis에 저장 (TTL 2시간) → XML 반환
```

---

## API 사용 방법

> 별도 문서를 참고하세요: [API_GUIDE.md](./API_GUIDE.md) | [REDIS_GUIDE.md](./REDIS_GUIDE.md) | [postgreSQL.md](./postgreSQL.md)

---

## 환경변수

`.env.local` 파일에 필요한 환경변수를 설정합니다. 항목 설명은 `.env.local` 파일 내 주석을 참고하세요.

> Cloud Run 배포 시 `.env.local` 대신 Cloud Run의 **환경변수 설정**에 등록합니다.

---

## 로컬 실행

### 1. 패키지 설치

```bash
cd license_
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

접속: http://localhost:3000

### 3. 빌드 및 프로덕션 실행

```bash
npm run build
npm start
```

기본 포트: **8080** (Cloud Run 기본 포트에 맞춰 설정)

---

## Cloud Run 배포

### Dockerfile 작성 예시

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
EXPOSE 8080
CMD ["npm", "start"]
```

### 배포 명령

```bash
# 빌드 및 푸시
gcloud builds submit --tag gcr.io/[PROJECT_ID]/axis-license

# Cloud Run 배포
gcloud run deploy axis-license \
  --image gcr.io/[PROJECT_ID]/axis-license \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --set-env-vars DB_HOST=...,DB_USER=...,SESSION_SECRET=...
```

> `.env.local`의 값들은 `--set-env-vars` 옵션 또는 Cloud Run 콘솔에서 환경변수로 등록합니다.

---

## 인증 방식

### 관리자 로그인
- URL: `/auth/Spauth_login`
- 비밀번호를 SHA-256 해시하여 `ADMIN_PASSWORD_HASH` 환경변수와 비교
- 로그인 성공 시 `iron-session` 쿠키 발급 (유효시간 2시간)

### IP 화이트리스트 자동로그인
- `ADMIN_IP_WHITELIST`에 등록된 IP에서 접근 시 자동 로그인 처리
- `X-Forwarded-For` 헤더 기준 (로드밸런서/프록시 환경 대응)
- Cloud Run에서는 Google의 로드밸런서가 실제 IP를 `X-Forwarded-For`에 설정

---

## DB 변경 시

`src/config/db_pg.js`의 커넥션 풀 설정만 수정하면 됩니다.
환경변수로 관리되므로 코드 변경 없이 `.env.local` (또는 Cloud Run 환경변수)만 수정합니다.

---

## 관리자 비밀번호 변경

새 비밀번호의 SHA-256 해시값을 생성 후 `ADMIN_PASSWORD_HASH`에 설정합니다.

```bash
# Node.js로 해시 생성
node -e "const c=require('crypto');console.log(c.createHash('sha256').update('새비밀번호').digest('hex'))"
```

출력된 해시값을 `.env.local`의 `ADMIN_PASSWORD_HASH`에 저장합니다.

---

## Git 브랜치 관리

### 브랜치 구조

| 브랜치 | 내용 | 비고 |
|--------|------|------|
| `main` | 기존 PHP (CodeIgniter 3) 프로젝트 | 변경 금지 |
| `renew` | React + Next.js 리뉴얼 프로젝트 | 현재 작업 브랜치 |

> `renew` 브랜치는 `main`과 완전히 독립된 히스토리를 가집니다. **절대 main에 merge하지 마세요.**

### 저장소

```
https://github.com/AxisAdmin/license.git
```

### 브랜치 전환

```bash
# 기존 PHP 프로젝트로 전환
git checkout main

# 리뉴얼 프로젝트로 전환
git checkout renew
```

### 리뉴얼 프로젝트 클론 (새 환경에서)

```bash
git clone -b renew https://github.com/AxisAdmin/license.git license_renew
cd license_renew
npm install
```

### 작업 후 푸시

```bash
# renew 브랜치에서 작업 후
git add .
git commit -m "커밋 메시지"
git push origin renew
```

### 주의 사항

- `main` 브랜치에 push하거나 merge하지 않도록 주의
- `renew` 브랜치에서 작업 전 `git branch` 명령으로 현재 브랜치 확인
- `.env.local`은 `.gitignore`에 포함되어 있어 원격에 올라가지 않음
