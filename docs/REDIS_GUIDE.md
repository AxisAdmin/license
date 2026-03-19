# Redis 캐시 가이드 (Docker Redis + ioredis)

## 목차

1. [개요](#1-개요)
2. [Docker Redis 설치 및 실행](#2-docker-redis-설치-및-실행)
3. [환경 설정](#3-환경-설정)
4. [프로젝트 실행 및 테스트](#4-프로젝트-실행-및-테스트)
5. [Redis 캐시 확인 (redis-cli)](#5-redis-캐시-확인-redis-cli)
6. [캐시 키 구조](#6-캐시-키-구조)
7. [관련 파일 구조](#7-관련-파일-구조)
8. [트러블슈팅](#8-트러블슈팅)
9. [배포 환경 전환](#9-배포-환경-전환)

---

## 1. 개요

spauth API의 응답 속도 향상을 위해 Redis 캐시를 적용했습니다.
로컬 환경에서는 Docker로 Redis 컨테이너를 실행합니다.

### 캐시 흐름

```
API 요청 → license_code 검증
  → Redis 캐시 조회 (HIT → 즉시 XML 반환)
  → Redis 캐시 MISS → PostgreSQL DB 조회
  → XML 생성 → Redis에 저장 (TTL 24시간)
  → XML 반환
```

### 캐시 무효화

```
관리자 등록/수정/삭제 → DB 반영 → 해당 license_code 캐시 자동 삭제
```

---

## 2. Docker Redis 설치 및 실행

### 2-1. 사전 준비

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 및 실행

### 2-2. Redis 컨테이너 실행 (로컬 테스트용, 포트 6389)

```bash
docker run -d --name axis_license_redis -p 6389:6379 redis:7-alpine
```

| 옵션 | 설명 |
|------|------|
| `-d` | 백그라운드 실행 |
| `--name axis_license_redis` | 컨테이너 이름 지정 |
| `-p 6389:6379` | **호스트 6389 → 컨테이너 내부 6379** 매핑 (로컬 테스트용) |
| `redis:7-alpine` | 경량 Alpine 기반 Redis 7 이미지 |

> 로컬에서는 포트 **6389**을 사용하고, 배포 환경에서는 기본 포트 **6379**를 그대로 사용합니다.

### 2-3. 실행 확인

```bash
# 컨테이너 상태 확인
docker ps

# Redis 접속 테스트
docker exec -it axis_license_redis redis-cli ping
```

`PONG`이 출력되면 정상 실행입니다.

### 2-4. 컨테이너 관리

```bash
# 컨테이너 중지
docker stop axis_license_redis

# 컨테이너 시작 (중지 후 재시작)
docker start axis_license_redis

# 컨테이너 삭제 (중지 후)
docker rm axis_license_redis

# 로그 확인
docker logs axis_license_redis
```

> PC 재시작 후 Docker Desktop이 실행되면 컨테이너는 자동으로 시작되지 않습니다.
> `docker start axis_license_redis`로 다시 시작하거나, 실행 시 `--restart unless-stopped` 옵션을 추가하세요:
>
> ```bash
> docker run -d --name axis_license_redis --restart unless-stopped -p 6389:6379 redis:7-alpine
> ```

### 2-5. 포트 충돌 시 해결 방법

`6389` 포트가 이미 사용 중이라면 아래 에러가 발생합니다:

```
Error response from daemon: Ports are not available: exposing port TCP 0.0.0.0:6389 -> 0.0.0.0:0: listen tcp 0.0.0.0:6389: bind: Only one usage of each socket address is normally permitted.
```

**해결 방법:**

1. **어떤 프로세스가 포트를 사용 중인지 확인**

   ```bash
   netstat -ano | findstr :6389
   ```

2. **해당 프로세스 종료 후 다시 실행**, 또는 **다른 포트 사용**

   ```bash
   # 예: 6390 포트로 변경
   docker run -d --name axis_license_redis -p 6390:6379 redis:7-alpine
   ```

   > 포트를 변경한 경우 `.env.local`의 `REDIS_PORT` 값도 함께 변경해야 합니다.

3. **기존 Redis 컨테이너가 남아있는 경우**

   같은 이름의 컨테이너가 이미 존재하면 생성이 실패합니다:

   ```bash
   # 기존 컨테이너 확인
   docker ps -a --filter name=axis_license_redis

   # 기존 컨테이너 삭제 후 다시 실행
   docker rm -f axis_license_redis
   ```

---

## 3. 환경 설정

`.env.local` 파일에 아래 설정이 포함되어 있어야 합니다:

```env
# Redis (로컬 Docker)
REDIS_HOST=localhost
REDIS_PORT=6389
REDIS_PASS=
REDIS_DB=0
```

> Docker Redis 기본 설치 시 비밀번호가 없으므로 `REDIS_PASS`는 비워둡니다.
> 포트를 6389로 사용하는 이유: 로컬 테스트 환경과 배포 환경의 포트를 분리하기 위함

---

## 4. 프로젝트 실행 및 테스트

### 4-1. 프로젝트 시작

```bash
npm run dev
```

> 터미널에 `[Redis] connection error` 메시지가 없으면 정상 연결입니다.

### 4-2. API 테스트

브라우저 또는 터미널에서 요청합니다:

```bash
# 첫 번째 요청 — DB 조회 후 Redis에 캐시 저장됨
curl "http://localhost:3000/spauth?license_code=YOUR-LICENSE-CODE"

# 두 번째 요청 — Redis 캐시에서 즉시 반환 (DB 조회 없음)
curl "http://localhost:3000/spauth?license_code=YOUR-LICENSE-CODE"
```

`/spauth/spauth` 엔드포인트도 동일하게 테스트합니다:

```bash
curl "http://localhost:3000/spauth/spauth?license_code=YOUR-LICENSE-CODE"
```

---

## 5. Redis 캐시 확인 (redis-cli)

### 5-1. CLI 접속

```bash
docker exec -it axis_license_redis redis-cli
```

### 5-2. 캐시 키 목록 확인

```bash
KEYS spauth:*
```

출력 예시:

```
1) "spauth:spauth:780FE6EC-BA01-4D38-A27F-A02111D02D8E"
2) "spauth:spauth_2:780FE6EC-BA01-4D38-A27F-A02111D02D8E"
```

### 5-3. 캐시 내용 확인

```bash
GET spauth:spauth:780FE6EC-BA01-4D38-A27F-A02111D02D8E
```

### 5-4. TTL 확인 (남은 만료 시간, 초)

```bash
TTL spauth:spauth:780FE6EC-BA01-4D38-A27F-A02111D02D8E
```

### 5-5. 캐시 수동 삭제

```bash
# 특정 키 삭제
DEL spauth:spauth:780FE6EC-BA01-4D38-A27F-A02111D02D8E

# 모든 spauth 캐시 삭제
KEYS spauth:*
# 출력된 키를 복사하여 DEL 명령 실행

# 전체 Redis 데이터 삭제 (주의)
FLUSHDB
```

---

## 6. 캐시 키 구조

```
spauth:{variant}:{license_code}
```

| 키 패턴 | API 엔드포인트 | 설명 |
|---------|---------------|------|
| `spauth:spauth:{code}` | `/spauth?license_code=` | 전체 필드 XML (Geo-IP 포함) |
| `spauth:spauth_2:{code}` | `/spauth/spauth?license_code=` | 기본 필드 XML (모바일용) |

- **TTL**: 7200초 (2시간)
- **무효화 시점**: 관리자가 라이선스를 등록/수정/삭제할 때 자동 삭제

---

## 7. 관련 파일 구조

```
src/
  config/
    redis.js              ← Redis 연결 설정 (ioredis 싱글톤)
  lib/
    cache.js              ← 캐시 유틸리티 (getCache, setCache, delCache)
  pages/api/spauth/
    index.js              ← /spauth API (Redis 캐시 적용)
    spauth.js             ← /spauth/spauth API (Redis 캐시 적용)
  services/
    licenseService.js     ← 등록/수정/삭제 시 캐시 무효화 (delCache)
```

---

## 8. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `[Redis] connection error: connect ECONNREFUSED` | Docker 컨테이너가 실행되지 않음 | `docker start axis_license_redis` 실행 |
| `docker: Error response from daemon` (포트 충돌) | 6389 포트가 이미 사용 중 | 위 2-5 섹션 참고 |
| 캐시가 저장되지 않음 | `.env.local` 설정 확인 | `REDIS_HOST=localhost`, `REDIS_PORT=6389` 확인 |
| DB 수정 후에도 이전 데이터가 반환됨 | 캐시가 남아있음 | 관리자 페이지에서 수정하면 자동 삭제됨. 직접 DB 수정 시 `docker exec -it axis_license_redis redis-cli FLUSHDB` 실행 |
| API가 느림 (캐시 미적용 의심) | Redis 연결 실패로 fallback 중 | 터미널 로그에서 `[Redis]` 에러 확인 |

---

## 9. 배포 환경 전환

배포 시에는 `.env`(또는 Cloud Run 환경변수)만 변경하면 됩니다.
코드 수정은 필요 없습니다.

### 환경별 설정 비교

| 환경 | REDIS_HOST | REDIS_PORT | REDIS_PASS | 비고 |
|------|-----------|------------|------------|------|
| 로컬 (Docker) | localhost | **6389** | (없음) | 테스트 환경 전용 포트 |
| Redis Cloud | Redis Cloud 엔드포인트 | **6379** | 발급된 비밀번호 | 외부 서비스 |
| GCP Memorystore | Memorystore 내부 IP | **6379** | (없음) | VPC 내부 통신 |
| Redis 미사용 | (설정 안 함) | - | - | DB fallback 자동 적용 |

> Redis 클라우드 서비스(Redis Cloud, GCP Memorystore)의 상세 비교, 요금, 설정 방법은 [REDIS_CLOUD_ISSUE.md](./REDIS_CLOUD_ISSUE.md)를 참고하세요.

> 현재 코드는 Redis 장애 시 DB fallback이 적용되어 있으므로, Redis 없이도 정상 동작합니다.
