# Axis License

PHP/CodeIgniter 3 기반의 라이선스 관리 시스템을 **React + Next.js**로 리뉴얼한 프로젝트입니다.
GCP Cloud Run 배포를 목적으로 하며, 기존 기능을 그대로 유지합니다.

> 이 프로젝트는 `renew` 브랜치에서 관리됩니다. `main` 브랜치는 기존 PHP 프로젝트입니다.

---

## 가이드 문서

| 문서 | 설명 |
|------|------|
| [GUIDE.md](./docs/GUIDE.md) | 프로젝트 구조, 아키텍처, 데이터 흐름, 로컬 실행, 인증 방식 |
| [API_GUIDE.md](./docs/API_GUIDE.md) | spauth API 사용 방법, 요청/응답 XML 구조 |
| [REDIS_GUIDE.md](./docs/REDIS_GUIDE.md) | Redis 캐시 설정, Docker Redis 실행, 캐시 키 구조 |
| [REDIS_CLOUD_ISSUE.md](./docs/REDIS_CLOUD_ISSUE.md) | Redis Cloud vs GCP Memorystore 비교, 요금, 선택 가이드 |
| [postgreSQL.md](./docs/postgreSQL.md) | PostgreSQL 테이블 생성, Collation 설정, 컬럼 구조 |
| [GCP_GUIDE.md](./docs/GCP_GUIDE.md) | GCP 배포 가이드, Cloud SQL/Redis 설정, 환경변수, 비용 |

---

## 빠른 시작

```bash
# 클론 (renew 브랜치)
git clone -b renew https://github.com/AxisAdmin/license.git
cd license

# 패키지 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일을 편집하여 DB, Redis 등 설정

# Redis 실행 (Docker)
docker run -d --name axis_license_redis -p 6389:6379 redis:7-alpine
```

> Redis는 로컬 테스트용으로 포트 **6389**을 사용합니다.
> 기본 포트인 **6379** 사용에 문제가 없다면 `-p 6379:6379`로 변경하여 사용해도 됩니다.
> (변경 시 `.env.local`의 `REDIS_PORT` 값도 함께 수정)

```bash
# 개발 서버 실행
npm run dev
```

> 상세한 실행 방법은 [GUIDE.md](./docs/GUIDE.md)를, Redis 설정은 [REDIS_GUIDE.md](./docs/REDIS_GUIDE.md)를 참고하세요.

---

## 기술 스택

### Framework / UI

| 기술 | 설명 |
|------|------|
| **Next.js 14** | Pages Router 기반 SSR 프레임워크 |
| **React 18** | UI 컴포넌트 |
| **MUI 7** | Material UI 컴포넌트 라이브러리 |

### Database / Cache

| 기술 | 설명 |
|------|------|
| **PostgreSQL** | 메인 데이터베이스 (pg 라이브러리) |
| **Redis** | spauth API 응답 캐시 (ioredis, TTL 2시간) |

### Infra

| 기술 | 설명 |
|------|------|
| **Docker** | 컨테이너 이미지 빌드 (standalone) |
| **GCP Cloud Run** | 서버리스 컨테이너 실행 (포트 8080) |
| **GCP Cloud SQL** | PostgreSQL 호스팅 |

### 기존 대비 변경 사항

| 항목 | 기존 (PHP) | 변경 (Next.js) |
|------|-----------|---------------|
| 프레임워크 | CodeIgniter 3 | Next.js 14 (Pages Router) |
| 프론트엔드 | PHP View (HTML) | React JSX + MUI |
| DB | MySQL (PDO/mysqli) | PostgreSQL (pg) |
| 캐시 | 없음 | Redis (ioredis) |
| 에러 로그 | PHP error_log (spauth/log/) | 파일 로그 (api/spauth/log/, logger.js) |
| 세션 | PHP Session | iron-session (쿠키) |
| 파일 업로드 | PHP ftp_* | basic-ftp |
| 설정값 | 하드코딩 | .env.local (환경변수) |
| 배포 | Apache (온프레미스) | GCP Cloud Run (Docker) |
