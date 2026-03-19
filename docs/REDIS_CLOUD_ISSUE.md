# Redis 클라우드 서비스 비교 (Redis Cloud vs GCP Memorystore)

## 목차

1. [개요](#1-개요)
2. [Redis Cloud](#2-redis-cloud)
3. [GCP Memorystore for Redis](#3-gcp-memorystore-for-redis)
4. [서비스 비교](#4-서비스-비교)
5. [요금 비교](#5-요금-비교)
6. [환경변수 설정](#6-환경변수-설정)
7. [Memorystore 설정 방법 (GCP CLI)](#7-memorystore-설정-방법-gcp-cli)
8. [선택 가이드](#8-선택-가이드)
9. [알아두면 유용한 정보](#9-알아두면-유용한-정보)

---

## 1. 개요

이 프로젝트에서 Redis는 spauth API의 응답 캐시 용도로 사용됩니다.
배포 환경에서 사용할 수 있는 Redis 클라우드 서비스 두 가지를 비교합니다.

> 현재 코드는 Redis 장애 시 DB fallback이 적용되어 있으므로, Redis 없이도 정상 동작합니다.

---

## 2. Redis Cloud

### 기본 정보

| 항목 | 내용 |
|------|------|
| 제공사 | Redis Ltd. (Redis 공식) |
| 사이트 | https://redis.io/cloud |
| 콘솔 | https://app.redislabs.com/ |
| 호스팅 | AWS, GCP, Azure 중 선택 |
| 서울 리전 | GCP `asia-northeast3` 선택 가능 |
| 접속 방식 | 공개 엔드포인트 (인터넷 경유, TLS + 비밀번호) |

### 플랜 비교

| 플랜 | 메모리 | 커넥션 | 고가용성 | 백업 | SLA | 월 비용 |
|------|--------|--------|---------|------|-----|--------|
| **Free** | 30MB | 30개 | 없음 | 없음 | 없음 | **$0** |
| **Essentials** | 250MB | 256개 | Multi-AZ 자동 복제 | 일일 백업 | 99.99% | **~$5 ~ $7** |
| **Pro** | 1GB~ | 무제한 | Multi-AZ + Active-Active | 실시간 복제 | 99.999% | **~$65~** |

### 장점

- Free 플랜으로 무료 운영 가능
- 설정이 간단함 (엔드포인트 + 비밀번호만 설정)
- Redis 공식 엔진 사용 (최신 기능 빠르게 지원)
- GCP 서울 리전 선택 가능 (지연시간 최소화)
- Essentials부터 자동 백업, Multi-AZ 제공

### 단점

- 공개 엔드포인트로 접속 (VPC 내부 통신 아님)
- GCP와 별도 콘솔에서 관리
- 별도 결제 (GCP 통합 결제 불가)
- Free 플랜은 30MB, 30 커넥션 제한
- 네트워크 지연 ~2~5ms (인터넷 경유)

---

## 3. GCP Memorystore for Redis

### 기본 정보

| 항목 | 내용 |
|------|------|
| 제공사 | Google Cloud |
| 콘솔 | GCP Console > Memorystore |
| 호스팅 | GCP 내부 |
| 서울 리전 | `asia-northeast3` |
| 접속 방식 | VPC 내부 IP (프라이빗, 외부 노출 없음) |

### 티어 비교

| 티어 | 메모리 | 복제 | 자동 장애조치 | 월 비용 (정가) | 3년 약정 |
|------|--------|------|-------------|--------------|---------|
| **Basic** | 1GB ~ | 없음 | 없음 | **~$30** | **~$15** |
| **Standard** | 1GB ~ | 읽기 전용 복제본 | 자동 장애조치 | **~$60** | **~$30** |

### 장점

- VPC 내부 통신 (외부 노출 없음, 높은 보안)
- 지연시간 <1ms (같은 VPC)
- GCP 콘솔에서 통합 관리 (Cloud Monitoring 연동)
- GCP 통합 결제
- 3년 약정 시 ~50% 할인

### 단점

- 최소 비용 ~$30/월 (3년 약정 시 ~$15)
- VPC 커넥터 설정 필요 (Cloud Run 연결 시)
- VPC 커넥터 자체 비용 추가 발생 가능 (~$7/월)
- 무료 플랜 없음
- Basic 티어는 복제/장애조치 미지원

---

## 4. 서비스 비교

| 항목 | Redis Cloud | Memorystore |
|------|------------|-------------|
| **최소 비용** | $0 (Free) | ~$30/월 |
| **보안** | TLS + 비밀번호 (공개) | VPC 내부 (프라이빗) |
| **지연시간** | ~2~5ms | <1ms |
| **관리 콘솔** | Redis Cloud 별도 | GCP 통합 |
| **결제** | 별도 결제 | GCP 통합 |
| **설정 난이도** | 간단 (URL+비밀번호) | VPC 커넥터 필요 |
| **고가용성** | Essentials부터 | Standard 티어만 |
| **백업** | Essentials부터 자동 | 수동 RDB 내보내기 |
| **스케일링** | 자동 스케일링 가능 | 수동 (인스턴스 변경) |
| **모니터링** | Redis Cloud 대시보드 | Cloud Monitoring 통합 |
| **엔진** | Redis 공식 엔진 | 오픈소스 Redis 호환 |
| **약정 할인** | 없음 | 1년 ~25%, 3년 ~50% |

---

## 5. 요금 비교

### 월 비용 (이 프로젝트 기준)

| 구성 | Redis 비용 | Cloud SQL | Cloud Run | 합계 (USD) | 원화 (약) |
|------|-----------|-----------|-----------|-----------|----------|
| Redis 미사용 | $0 | ~$10 | $0 | **~$10** | ~1.4만원 |
| Redis Cloud Free | $0 | ~$10 | $0 | **~$10** | ~1.4만원 |
| Redis Cloud Essentials | ~$5~7 | ~$10 | $0 | **~$15~17** | ~2.1만원 |
| Memorystore Basic | ~$30 | ~$10 | $0 | **~$40** | ~5.6만원 |
| Memorystore Basic (3년) | ~$15 | ~$5 | $0 | **~$20** | ~2.8만원 |

### 연간 비용 비교

| 구성 | 연 비용 (USD) | 3년 총 비용 (USD) |
|------|-------------|-----------------|
| Redis Cloud Free | ~$120 | ~$360 |
| Redis Cloud Essentials | ~$180~204 | ~$540~612 |
| Memorystore Basic (정가) | ~$480 | ~$1,440 |
| Memorystore Basic (3년 약정) | ~$240 | ~$720 |

---

## 6. 환경변수 설정

### Redis Cloud

```env
REDIS_HOST=redis-12345.c1.asia-northeast3-1.gce.redns.redis-cloud.com
REDIS_PORT=6379
REDIS_PASS=your-redis-cloud-password
REDIS_DB=0
```

### GCP Memorystore

```env
REDIS_HOST=10.0.0.3
REDIS_PORT=6379
REDIS_PASS=
REDIS_DB=0
```

> Memorystore Basic 티어는 비밀번호 없이 VPC 내부 IP로 접속합니다.

### Redis 미사용

환경변수에서 `REDIS_*` 항목을 설정하지 않거나 삭제하면 됩니다.
코드에서 Redis 연결 실패 시 자동으로 DB fallback이 적용됩니다.

---

## 7. Memorystore 설정 방법 (GCP CLI)

### 7-1. VPC 커넥터 생성

Cloud Run에서 Memorystore에 접근하려면 VPC 커넥터가 필요합니다.

```bash
gcloud compute networks vpc-access connectors create axis-license-vpc \
  --region=asia-northeast3 \
  --range=10.8.0.0/28
```

### 7-2. Memorystore 인스턴스 생성

```bash
gcloud redis instances create axis-license-redis \
  --size=1 \
  --region=asia-northeast3 \
  --tier=basic
```

### 7-3. 내부 IP 확인

```bash
gcloud redis instances describe axis-license-redis \
  --region=asia-northeast3 \
  --format="value(host)"
```

### 7-4. Cloud Run 배포 시 VPC 커넥터 연결

```bash
gcloud run deploy axis-license \
  --image gcr.io/[PROJECT_ID]/axis-license \
  --vpc-connector=axis-license-vpc \
  --set-env-vars "REDIS_HOST=10.0.0.3,REDIS_PORT=6379,REDIS_PASS=,REDIS_DB=0"
```

---

## 8. 선택 가이드

### 상황별 추천

| 상황 | 추천 | 이유 |
|------|------|------|
| 비용 최소화 | Redis Cloud Free 또는 미사용 | $0 |
| 프로덕션 (소규모) | Redis Cloud Essentials | ~$5~7/월, 자동 백업, Multi-AZ |
| 보안 최우선 | Memorystore | VPC 내부 통신, 외부 노출 없음 |
| GCP 통합 관리 | Memorystore | 콘솔, 모니터링, 결제 통합 |
| 빠른 설정 | Redis Cloud | 엔드포인트+비밀번호만 설정 |
| 장기 운영 (3년+) | Memorystore (약정) | 약정 할인으로 ~$15/월 |

### 이 프로젝트 기준 판단

현재 코드는 Redis 장애 시 DB fallback이 적용되어 있으므로:

- Redis가 **필수가 아닌 성능 최적화 용도**
- 캐시 미스 시에도 DB 조회로 정상 응답 (TTL 2시간)
- Redis 없이도 서비스 운영 가능

따라서 **초기에는 Redis Cloud Free($0)로 시작**하고, 트래픽 증가 시 Essentials 또는 Memorystore로 전환하는 것을 권장합니다.

---

## 9. 알아두면 유용한 정보

### Redis Cloud 관련

- **Free 플랜 비활성화 주의** — 30일간 요청이 없으면 인스턴스가 자동 삭제될 수 있음
- **리전 선택** — 반드시 GCP `asia-northeast3` (서울)을 선택해야 지연시간 최소화
- **TLS 연결** — ioredis는 기본적으로 TLS를 지원하며, Redis Cloud는 TLS가 기본 활성화
- **플랜 변경** — Free → Essentials 업그레이드 시 데이터 유지됨 (다운타임 없음)
- **모니터링** — Redis Cloud 콘솔에서 메모리 사용량, 커넥션 수, 초당 요청 수 확인 가능

### Memorystore 관련

- **VPC 커넥터 비용** — 커넥터 자체에 ~$7/월 비용이 추가 발생할 수 있음 (e2-micro 인스턴스 기반)
- **메모리 크기 변경** — 운영 중 크기 변경 가능하지만 Basic 티어는 다운타임 발생
- **Standard 티어** — 자동 장애조치 지원, 읽기 전용 복제본 제공 (비용 2배)
- **유지보수 윈도우** — Google이 패치를 적용하는 유지보수 시간이 있음 (Basic 티어는 다운타임 발생)
- **약정 할인 적용** — GCP 콘솔 > 결제 > 약정에서 신청 (Compute Engine CUD와 별도)

### 공통

- **데이터 영속성** — 두 서비스 모두 캐시 용도이므로 데이터 유실 가능성 있음 (이 프로젝트에서는 DB fallback으로 대응)
- **연결 풀링** — Cloud Run 인스턴스가 여러 개일 때 커넥션 수 주의 (Free 플랜 30개 제한)
- **Cloud Run 콜드 스타트** — 인스턴스 시작 시 Redis 연결 지연 ~100ms 발생 가능 (첫 요청만 영향)
- **환경변수 변경** — Redis 서비스를 변경해도 코드 수정 없이 환경변수만 변경하면 됨
