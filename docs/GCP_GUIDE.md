# GCP 배포 가이드

## 목차

1. [개요](#1-개요)
2. [사전 준비](#2-사전-준비)
3. [Cloud SQL 설정 (PostgreSQL)](#3-cloud-sql-설정-postgresql)
4. [Redis 설정 (선택)](#4-redis-설정-선택)
5. [배포](#5-배포)
6. [환경변수 관리](#6-환경변수-관리)
7. [업데이트 배포](#7-업데이트-배포)
8. [월 예상 비용](#8-월-예상-비용)
9. [트러블슈팅](#9-트러블슈팅)

---

## 1. 개요

Axis License 프로젝트를 GCP(Google Cloud Platform)에 배포하기 위한 가이드입니다.

### 사용 GCP 서비스

| 서비스 | 용도 |
|--------|------|
| **Cloud Run** | Next.js 앱 서버 실행 |
| **Cloud Build** | Docker 이미지 빌드 |
| **Container Registry (GCR)** | Docker 이미지 저장 |
| **Cloud SQL** (선택) | PostgreSQL 데이터베이스 |

### 외부 서비스

| 서비스 | 용도 |
|--------|------|
| **cafe24 FTP/CDN** | 이미지 파일 업로드 및 배포 |
| **Redis Cloud** (선택) | Redis 캐시 (Free 또는 Essentials) |

---

## 2. 사전 준비

### 2-1. GCP 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. 프로젝트 ID 확인 (배포 명령어에서 사용)

### 2-2. gcloud CLI 설치

```bash
# 설치 확인
gcloud --version

# 로그인
gcloud auth login

# 프로젝트 설정
gcloud config set project [PROJECT_ID]

# 리전 설정
gcloud config set run/region asia-northeast3
```

### 2-3. API 활성화

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

---

## 3. Cloud SQL 설정 (PostgreSQL)

### 3-1. 인스턴스 생성

```bash
gcloud sql instances create axis-license-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=asia-northeast3 \
  --storage-size=10GB \
  --storage-type=SSD
```

### 3-2. 데이터베이스 및 사용자 생성

```bash
# 데이터베이스 생성
gcloud sql databases create spauth --instance=axis-license-db

# 사용자 생성
gcloud sql users create [DB_USER] \
  --instance=axis-license-db \
  --password=[DB_PASS]
```

### 3-3. Cloud Run 연결 허용

Cloud Run에서 Cloud SQL에 접속하려면 연결 이름이 필요합니다.

```bash
# 연결 이름 확인
gcloud sql instances describe axis-license-db --format="value(connectionName)"
```

출력 예시: `[PROJECT_ID]:asia-northeast3:axis-license-db`

> 이 값은 Cloud Run 배포 시 `--add-cloudsql-instances` 옵션에 사용됩니다.

### 3-4. 테이블 생성

Cloud SQL에 접속하여 테이블을 생성합니다. SQL은 [postgreSQL.md](./postgreSQL.md)를 참고하세요.

```bash
# Cloud SQL 프록시로 접속
gcloud sql connect axis-license-db --user=[DB_USER] --database=spauth
```

---

## 4. Redis 설정 (선택)

현재 코드는 Redis 장애 시 DB로 자동 fallback되므로 Redis 없이도 운영 가능합니다.

### 옵션 비교

| 옵션 | 월 비용 | 설정 난이도 |
|------|--------|------------|
| Redis 없이 운영 | $0 | 없음 |
| Redis Cloud Free (30MB) | $0 | 간단 (URL+비밀번호) |
| Redis Cloud Essentials (250MB) | ~$5~7 | 간단 (URL+비밀번호) |
| GCP Memorystore (1GB) | ~$30 | VPC 커넥터 설정 필요 |

### Redis Cloud 사용 시

1. [Redis Cloud](https://app.redislabs.com/) 가입
2. Subscription 생성 → GCP `asia-northeast3` (서울) 선택
3. Database 생성 후 접속 정보 확인 (Endpoint, Password)
4. 환경변수에 설정:

```
REDIS_HOST=redis-12345.c1.asia-northeast3-1.gce.redns.redis-cloud.com
REDIS_PORT=6379
REDIS_PASS=발급된비밀번호
REDIS_DB=0
```

### Memorystore 사용 시

VPC 커넥터 설정이 추가로 필요합니다.

```bash
# VPC 커넥터 생성
gcloud compute networks vpc-access connectors create axis-license-vpc \
  --region=asia-northeast3 \
  --range=10.8.0.0/28

# Memorystore 인스턴스 생성
gcloud redis instances create axis-license-redis \
  --size=1 \
  --region=asia-northeast3 \
  --tier=basic
```

> 배포 시 `--vpc-connector=axis-license-vpc` 옵션을 추가해야 합니다.

---

## 5. 배포

### 5-1. Docker 이미지 빌드 및 푸시

```bash
gcloud builds submit --tag gcr.io/[PROJECT_ID]/axis-license
```

### 5-2. Cloud Run 배포

**Redis Cloud 사용 시:**

```bash
gcloud run deploy axis-license \
  --image gcr.io/[PROJECT_ID]/axis-license \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --add-cloudsql-instances [PROJECT_ID]:asia-northeast3:axis-license-db \
  --set-env-vars "\
DB_HOST=/cloudsql/[PROJECT_ID]:asia-northeast3:axis-license-db,\
DB_USER=[DB_USER],\
DB_PASS=[DB_PASS],\
DB_NAME=spauth,\
DB_PORT=5432,\
REDIS_HOST=[REDIS_HOST],\
REDIS_PORT=6379,\
REDIS_PASS=[REDIS_PASS],\
REDIS_DB=0,\
SESSION_SECRET=[SESSION_SECRET],\
CDN_BASE_URL=[CDN_URL],\
SPAUTH_CDN_BASE_URL=[SPAUTH_CDN_URL],\
FTP_SERVER=[FTP_SERVER],\
FTP_PORT=21,\
FTP_USER=[FTP_USER],\
FTP_PASS=[FTP_PASS],\
FTP_PATH=web/images,\
ADMIN_IP_WHITELIST=[IP_LIST],\
ADMIN_PASSWORD_HASH=[HASH]"
```

**Memorystore 사용 시** — 위 명령어에 추가:

```bash
  --vpc-connector=axis-license-vpc
```

**Redis 없이 사용 시** — `REDIS_*` 환경변수 생략

### 5-3. 배포 확인

```bash
# 서비스 URL 확인
gcloud run services describe axis-license --format="value(status.url)"

# 로그 확인
gcloud run services logs read axis-license --limit=50
```

---

## 6. 환경변수 관리

Cloud Run 콘솔에서 환경변수를 관리하는 것이 보안상 안전합니다.

1. [Cloud Run 콘솔](https://console.cloud.google.com/run) 접속
2. `axis-license` 서비스 선택
3. **수정 및 새 버전 배포** → 컨테이너 → 변수 및 보안 비밀
4. 환경변수 추가/수정 후 배포

### 필수 환경변수 목록

| 변수명 | 설명 |
|--------|------|
| `DB_HOST` | Cloud SQL 접속 경로 (`/cloudsql/연결이름` 또는 IP) |
| `DB_USER` | DB 사용자명 |
| `DB_PASS` | DB 비밀번호 |
| `DB_NAME` | 데이터베이스명 (`spauth`) |
| `DB_PORT` | DB 포트 (`5432`) |
| `REDIS_HOST` | Redis 호스트 (선택) |
| `REDIS_PORT` | Redis 포트 (선택, 기본 `6379`) |
| `REDIS_PASS` | Redis 비밀번호 (선택) |
| `REDIS_DB` | Redis DB 번호 (선택, 기본 `0`) |
| `SESSION_SECRET` | 세션 암호화 키 (32자 이상) |
| `CDN_BASE_URL` | CDN URL (`/api/spauth`용) |
| `SPAUTH_CDN_BASE_URL` | CDN URL (`/api/spauth/spauth`용) |
| `FTP_SERVER` | FTP 서버 주소 |
| `FTP_PORT` | FTP 포트 (`21`) |
| `FTP_USER` | FTP 사용자명 |
| `FTP_PASS` | FTP 비밀번호 |
| `FTP_PATH` | FTP 업로드 경로 |
| `ADMIN_IP_WHITELIST` | 자동 로그인 IP (쉼표 구분) |
| `ADMIN_PASSWORD_HASH` | 관리자 비밀번호 SHA-256 해시 |

---

## 7. 업데이트 배포

코드 수정 후 재배포:

```bash
# 빌드 + 푸시
gcloud builds submit --tag gcr.io/[PROJECT_ID]/axis-license

# 새 버전 배포 (환경변수는 이전 설정 유지됨)
gcloud run deploy axis-license \
  --image gcr.io/[PROJECT_ID]/axis-license \
  --platform managed \
  --region asia-northeast3
```

---

## 8. 월 예상 비용

| 구성 | Cloud Run | Cloud SQL | Redis | 합계 (USD) | 원화 (약) |
|------|-----------|-----------|-------|-----------|----------|
| Redis 없이 | $0 | ~$10 | $0 | **~$10** | ~1.4만원 |
| Redis Cloud Free | $0 | ~$10 | $0 | **~$10** | ~1.4만원 |
| Redis Cloud Essentials | $0 | ~$10 | ~$5~7 | **~$15~17** | ~2.1만원 |
| Memorystore | $0 | ~$10 | ~$30 | **~$40** | ~5.6만원 |

> Cloud SQL 3년 약정 시 ~52% 할인 적용 가능 (~$10 → ~$5)

---

## 9. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 배포 후 502 에러 | 컨테이너 시작 실패 | `gcloud run services logs read axis-license` 로그 확인 |
| DB 연결 실패 | Cloud SQL 연결 이름 오류 | `--add-cloudsql-instances` 값 확인 |
| Redis 연결 실패 | 환경변수 누락 또는 네트워크 | Redis 없이도 정상 동작 (DB fallback) |
| FTP 업로드 실패 | 아웃바운드 차단 | Cloud Run은 기본적으로 외부 통신 허용 — FTP 서버 방화벽 확인 |
| 이미지 빌드 실패 | 메모리 부족 | `gcloud builds submit --machine-type=e2-highcpu-8` 옵션 추가 |
| 자동 로그인 안됨 | X-Forwarded-For IP 불일치 | Cloud Run 앞단 로드밸런서 IP 확인 후 `ADMIN_IP_WHITELIST` 수정 |
