# GCP 관리 가이드

배포된 서비스의 로그 확인, 접속, 관리 방법을 정리한 가이드입니다.

## 목차

1. [Cloud Run](#1-cloud-run)
2. [Memorystore for Redis](#2-memorystore-for-redis)

---

## 1. Cloud Run

### 1-1. 서비스 상태 확인

```bash
# 서비스 목록
gcloud run services list

# 서비스 상세 정보 (URL, 상태, 최신 리비전 등)
gcloud run services describe axis-license --region=asia-northeast3

# 서비스 URL만 확인
gcloud run services describe axis-license --region=asia-northeast3 --format="value(status.url)"
```

### 1-2. 로그 확인

```bash
# 최근 로그 50건
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=axis-license" --limit=50 --format="table(timestamp, textPayload)"

# 실시간 로그 스트리밍 (beta 컴포넌트 필요: gcloud components install beta)
gcloud beta logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=axis-license"

# 에러 로그만 필터링
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=axis-license AND severity>=ERROR" --limit=20 --format="table(timestamp, textPayload)"
```

> Cloud Console에서도 확인 가능: **Cloud Run → axis-license → 로그** 탭

### 1-3. 리비전 관리

리비전은 배포할 때마다 생성되는 서비스의 스냅샷입니다.

```bash
# 리비전 목록 (배포 이력)
gcloud run revisions list --service=axis-license --region=asia-northeast3

# 특정 리비전 상세 정보
gcloud run revisions describe [REVISION_NAME] --region=asia-northeast3

# 이전 리비전으로 트래픽 전환 (롤백)
gcloud run services update-traffic axis-license --region=asia-northeast3 --to-revisions=[REVISION_NAME]=100
```

### 1-4. 환경변수 확인/수정

```bash
# 현재 환경변수 확인
gcloud run services describe axis-license --region=asia-northeast3 --format="yaml(spec.template.spec.containers[0].env)"

# 환경변수 수정 (파일)
gcloud run services update axis-license --region=asia-northeast3 --env-vars-file=.env.production.yaml

# 환경변수 개별 수정
gcloud run services update axis-license --region=asia-northeast3 --update-env-vars="KEY=VALUE"
```

### 1-5. 스케일링 설정

```bash
# 인스턴스 수 설정 (최소 0, 최대 3)
gcloud run services update axis-license --region=asia-northeast3 --min-instances=0 --max-instances=3

# 콜드 스타트 방지 (최소 1개 항상 유지, 비용 발생)
gcloud run services update axis-license --region=asia-northeast3 --min-instances=1
```

### 1-6. 서비스 삭제

```bash
gcloud run services delete axis-license --region=asia-northeast3
```

---

## 2. Memorystore for Redis

### 2-1. 인스턴스 상태 확인

```bash
# 인스턴스 목록
gcloud redis instances list --region=asia-northeast3

# 인스턴스 상세 정보 (IP, 포트, 메모리, 상태 등)
gcloud redis instances describe license-redis --region=asia-northeast3

# IP만 확인
gcloud redis instances describe license-redis --region=asia-northeast3 --format="value(host)"
```

### 2-2. Redis CLI 접속

Memorystore는 VPC 내부에서만 접근 가능하므로, GCE VM을 경유해야 합니다.

```bash
# 1. 임시 VM 생성 (같은 리전)
gcloud compute instances create redis-client --zone=asia-northeast3-a --machine-type=e2-micro

# 2. VM에 SSH 접속
gcloud compute ssh redis-client --zone=asia-northeast3-a

# 3. redis-cli 설치 (VM 내에서 실행)
sudo apt-get update && sudo apt-get install -y redis-tools

# 4. Memorystore 접속
redis-cli -h [REDIS_IP] -p 6379
```

#### 자주 사용하는 redis-cli 명령어

```bash
PING                    # 접속 확인 (PONG 응답)
KEYS *                  # 저장된 전체 키 목록
DBSIZE                  # 저장된 키 개수
GET [KEY]               # 특정 키의 값 조회
TTL [KEY]               # 특정 키의 남은 TTL(초) 확인
INFO memory             # 메모리 사용량
INFO stats              # 히트율, 명령 처리 수 등
INFO clients            # 현재 연결된 클라이언트 수
FLUSHDB                 # 현재 DB의 모든 키 삭제 (주의)
```

#### VM 정리 (비용 방지)

작업이 끝나면 반드시 VM을 삭제하세요.

```bash
gcloud compute instances delete redis-client --zone=asia-northeast3-a
```

### 2-3. 모니터링

Memorystore는 별도의 쿼리 로그를 제공하지 않습니다. Cloud Console에서 지표를 확인합니다.

**Cloud Console → Memorystore → license-redis → 모니터링 탭**

| 지표 | 설명 |
|------|------|
| Memory Usage | 메모리 사용량 / 전체 용량 |
| Connected Clients | 현재 연결된 클라이언트 수 |
| Cache Hit Ratio | 캐시 히트율 (높을수록 좋음) |
| Calls | 초당 명령 처리 수 |
| Evicted Keys | 메모리 부족으로 제거된 키 수 |

### 2-4. 인스턴스 관리

```bash
# 메모리 크기 변경 (1GB → 2GB)
gcloud redis instances update license-redis --region=asia-northeast3 --size=2

# 인스턴스 삭제
gcloud redis instances delete license-redis --region=asia-northeast3
```

### 2-5. VPC 커넥터 관리

```bash
# 커넥터 목록
gcloud compute networks vpc-access connectors list --region=asia-northeast3

# 커넥터 상세 정보
gcloud compute networks vpc-access connectors describe license-vpc --region=asia-northeast3

# 커넥터 삭제
gcloud compute networks vpc-access connectors delete license-vpc --region=asia-northeast3
```
