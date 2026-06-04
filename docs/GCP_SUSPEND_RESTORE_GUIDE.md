# GCP 중지 / 재가동 가이드

`license-491102` 프로젝트를 비용 절감을 위해 중지(일부 삭제)한 내역과, 차후 다시 사용할 때 복구하는 절차를 정리한 문서입니다.

> 기준일: **2026-06-04** / 프로젝트: `license-491102` / 리전: `asia-northeast3`

## 목차

1. [중지/삭제 내역](#1-중지삭제-내역)
2. [현재 비용 현황](#2-현재-비용-현황)
3. [재가동 절차](#3-재가동-절차)
   - [3-1. Cloud SQL 재생성](#3-1-cloud-sql-재생성)
   - [3-2. (선택) Redis 재생성](#3-2-선택-redis-재생성)
   - [3-3. Cloud Run 재배포](#3-3-cloud-run-재배포)
   - [3-4. 동작 확인](#3-4-동작-확인)
4. [주의사항](#4-주의사항)

---

## 1. 중지/삭제 내역

비용이 상시 발생하던 리소스를 정리했습니다. **Cloud Run 서비스 정의만 남기고, 데이터/네트워크 리소스는 삭제**했습니다.

| 리소스 | 이름 | 처리 | 비고 |
|--------|------|------|------|
| Cloud Run | `axis-license` | **유지** (min-instances=0) | 서비스 정의·환경변수 보존. 유휴 시 컴퓨팅 비용 없음. 단, SQL/VPC 참조 어노테이션이 끊긴 상태 |
| Cloud SQL | `license-db` | **삭제** | PostgreSQL 18. 디스크/백업 비용 제거. **데이터(`spauth`) 완전 소멸** (export 미실시) |
| Memorystore Redis | `license-redis` | **삭제** | 인스턴스는 중지 기능이 없어 삭제만이 비용 차단 방법 |
| VPC 커넥터 | `license-vpc` | **삭제** | e2-micro 최소 2대 상시 가동 → 월 $12~16 누수 제거 |

### 정리 후 잔존 리소스 (소액, 거의 무시 가능)

| 리소스 | 이름 | 월 비용 |
|--------|------|---------|
| Cloud Storage 버킷 | `run-sources-license-491102-asia-northeast3` | ~$0.x (Cloud Run 소스 배포 스테이징) |
| Artifact Registry | `cloud-run-source-deploy` (약 119MB) | ~$0.01 (Docker 이미지 저장) |

> 완전히 $0으로 만들려면 위 버킷·레지스트리와 Cloud Run 서비스까지 삭제하면 됩니다. 단, 재배포 시 다시 생성됩니다.

---

## 2. 현재 비용 현황

- 상시 과금되던 **Cloud SQL · Redis · VPC 커넥터가 모두 제거**되어 실질 고정비는 사실상 0에 수렴합니다.
- Cloud Run은 트래픽이 없으면 과금되지 않습니다(min-instances=0).
- 남은 버킷/이미지 저장 비용은 월 $0.01~$0.x 수준입니다.

---

## 3. 재가동 절차

전체 순서: **Cloud SQL 재생성 → (선택) Redis/VPC 재생성 → Cloud Run 재배포 → 확인**

### 사전 확인

```bash
gcloud config set project license-491102
gcloud config set run/region asia-northeast3

# 필요한 API가 비활성화돼 있으면 재활성화
gcloud services enable run.googleapis.com sqladmin.googleapis.com
```

### 3-1. Cloud SQL 재생성

> ⚠️ 기존 `license-db`는 삭제되었으므로 **새로 생성 + 스키마 재구축**이 필요합니다. 데이터는 백업하지 않았으므로 복구할 수 없습니다.
>
> ⚠️ **이름 재사용 제한**: 삭제한 인스턴스 이름(`license-db`)은 일정 기간(최대 약 1주일) 재사용이 제한될 수 있습니다. 같은 이름 생성이 거부되면, 기간이 지난 뒤 재시도하거나 다른 이름으로 만든 뒤 [3-3](#3-3-cloud-run-재배포)에서 연결 이름을 갱신하세요.

**삭제 전 원래 사양 (동일하게 재생성하려면 이 값 사용):**

| 항목 | 값 |
|------|-----|
| 인스턴스 이름 | `license-db` |
| DB 버전 | `POSTGRES_18` |
| 에디션 | `enterprise` |
| 티어 | `db-custom-2-8192` (2 vCPU / 8GB) |
| 디스크 | 10GB SSD |
| 데이터베이스 | `spauth` |
| 사용자 | `postgres` |

```bash
# 인스턴스 생성 (티어는 필요에 따라 더 낮춰도 됨: 예) db-custom-1-3840)
gcloud sql instances create license-db \
  --database-version=POSTGRES_18 \
  --edition=enterprise \
  --tier=db-custom-2-8192 \
  --region=asia-northeast3 \
  --storage-size=10GB \
  --storage-type=SSD

# 데이터베이스 생성
gcloud sql databases create spauth --instance=license-db

# 사용자 비밀번호 설정 (기존 DB_PASS 값과 동일하게 — Cloud Run 환경변수 참고)
gcloud sql users set-password postgres \
  --instance=license-db \
  --password=[기존 DB_PASS]

# 연결 이름 확인 (license-491102:asia-northeast3:license-db 형태)
gcloud sql instances describe license-db --format="value(connectionName)"
```

**스키마/데이터 재구축**: [postgreSQL.md](./postgreSQL.md)의 테이블 정의로 스키마를 생성합니다.

```bash
gcloud sql connect license-db --user=postgres --database=spauth
```

### 3-2. (선택) Redis 재생성

현재 코드는 **Redis 장애 시 DB로 자동 fallback**되므로 Redis 없이도 운영 가능합니다. 캐시가 필요할 때만 진행하세요.

> 비용 참고: Memorystore(1GB)는 인스턴스 ~$30 + VPC 커넥터 ~$15 ≈ **월 $45**로 가장 비쌉니다. 비용이 중요하면 **Redis Cloud Free/Essentials** 또는 **Redis 없이 운영**을 권장합니다. (자세한 비교는 [GCP_DEPLOY_GUIDE.md](./GCP_DEPLOY_GUIDE.md) 4장)

**Memorystore를 다시 쓰는 경우**, VPC 커넥터도 함께 재생성해야 합니다.

```bash
gcloud services enable redis.googleapis.com vpcaccess.googleapis.com

# VPC 커넥터 재생성 (원래: 이름 license-vpc, 대역 10.8.0.0/28)
gcloud compute networks vpc-access connectors create license-vpc \
  --region=asia-northeast3 \
  --range=10.8.0.0/28

# Memorystore 인스턴스 재생성 (원래: 이름 license-redis, 1GB, basic)
gcloud redis instances create license-redis \
  --size=1 \
  --region=asia-northeast3 \
  --tier=basic

# 새 Redis IP 확인 (재생성 시 IP가 바뀜 → 환경변수 갱신 필요)
gcloud redis instances describe license-redis --region=asia-northeast3 --format="value(host)"
```

### 3-3. Cloud Run 재배포

기존 `axis-license` 서비스는 남아 있지만, 삭제된 `license-db`·`license-vpc`를 가리키는 **끊긴 어노테이션**이 그대로 있습니다. 재배포하면서 연결을 다시 설정해야 합니다.

**환경변수 갱신 포인트:**

| 환경변수 | 값 |
|----------|-----|
| `DB_HOST` | `/cloudsql/license-491102:asia-northeast3:license-db` (연결 이름이 같으면 그대로) |
| `DB_PASS` | 3-1에서 설정한 비밀번호와 일치해야 함 |
| `REDIS_HOST` | Redis 재생성 시 **새 IP로 갱신** / Redis 미사용 시 `REDIS_*` 제거 |

> 다른 이름으로 SQL을 만들었다면 `--add-cloudsql-instances`와 `DB_HOST`를 **새 연결 이름**으로 모두 바꿔야 합니다.

**Memorystore(VPC) 사용 시:**

```bash
gcloud run deploy axis-license \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --add-cloudsql-instances license-491102:asia-northeast3:license-db \
  --vpc-connector=license-vpc \
  --env-vars-file=.env.production.yaml
```

**Redis Cloud 또는 Redis 미사용 시** (`--vpc-connector` 제거):

```bash
gcloud run deploy axis-license \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --add-cloudsql-instances license-491102:asia-northeast3:license-db \
  --env-vars-file=.env.production.yaml
```

> 끊긴 VPC 어노테이션만 제거하고 싶을 때:
> ```bash
> gcloud run services update axis-license --region=asia-northeast3 --clear-vpc-connector
> ```

### 3-4. 동작 확인

```bash
# 서비스 URL
gcloud run services describe axis-license --region=asia-northeast3 --format="value(status.url)"

# 최근 로그 (DB 연결 에러 여부 확인)
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=axis-license AND severity>=ERROR" --limit=20 --format="table(timestamp, textPayload)"
```

라이선스 인증 엔드포인트로 실제 동작 확인:

```bash
curl "https://[서비스URL]/spauth?license_code=[테스트 라이선스코드]"
```

---

## 4. 주의사항

- **데이터 소멸**: Cloud SQL은 export 없이 삭제했으므로 기존 `spauth` 데이터는 복구 불가. 재가동 시 스키마/데이터를 새로 구축해야 합니다.
- **인스턴스 이름 재사용 제한**: 삭제 직후 같은 이름(`license-db`, `license-redis`)이 일정 기간 막힐 수 있습니다. 거부되면 시간을 두고 재시도하거나 다른 이름 사용 후 Cloud Run 연결 갱신.
- **IP는 매번 바뀜**: Redis/SQL 재생성 시 IP가 새로 할당됩니다. 단, Cloud Run은 SQL을 **연결 이름**(`프로젝트:리전:인스턴스`)으로 접속하므로 같은 이름이면 `DB_HOST`는 그대로 둬도 됩니다. Redis는 IP로 접속하므로 `REDIS_HOST` 갱신 필요.
- **비밀번호 정합성**: 재생성한 DB 사용자 비밀번호와 Cloud Run의 `DB_PASS`가 일치해야 합니다.
- **비용**: Memorystore + VPC 커넥터 조합이 가장 비쌉니다(월 ~$45). 비용에 민감하면 Redis 없이 또는 Redis Cloud로 재가동하는 것을 권장합니다.

## 관련 문서

- [GCP_DEPLOY_GUIDE.md](./GCP_DEPLOY_GUIDE.md) — 최초 배포 절차 / 환경변수 전체 목록 / 비용 비교
- [GCP_MANAGE_GUIDE.md](./GCP_MANAGE_GUIDE.md) — 운영 중 로그/리비전/스케일링 관리
- [postgreSQL.md](./postgreSQL.md) — DB 스키마 정의
