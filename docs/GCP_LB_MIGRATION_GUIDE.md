# Firebase Hosting → GCP External HTTP(S) Load Balancer 전환 가이드

현재 운영 중인 `Firebase Hosting + Cloud Run(axis-license)` 구성을 **GCP External HTTP(S) Load Balancer**로 전환하는 절차서. HTTP 프로토콜 요청 수신, 308 method-preserving 리다이렉트, 더 세밀한 트래픽 제어 등이 필요할 때 사용.

> 전제: 이 문서는 [HTTP_PROTOCOL_GUIDE.md](./HTTP_PROTOCOL_GUIDE.md)에서 결정된 LB 전환 결정에 따른 실제 실행 절차를 다룸. "왜 전환하는가"는 해당 문서 참고.

---

## 📘 용어 안내 (GCP Console 명칭 매핑)

이 문서에서 "**GCP LB**", "**Load Balancer**"로 표기된 용어는 GCP Console에서 **"부하 분산"** 으로 표시됩니다. Console UI로 작업하실 때는 아래 매핑을 참고하세요.

### 한↔영 용어 매핑

| 본 문서 표기 (영문) | GCP Console 표기 (한글) |
|---|---|
| GCP Load Balancer / GCP LB | **부하 분산** |
| External HTTP(S) Load Balancer | **외부 애플리케이션 부하 분산기** |
| Global External Application Load Balancer | **전역 외부 애플리케이션 부하 분산기** |
| Cloud Load Balancing (제품군) | **Cloud 부하 분산** |

### Console UI 접근 경로

```
GCP Console
  → 좌측 햄버거 메뉴
  → 네트워킹 > 네트워크 서비스 > 부하 분산
  → [부하 분산기 만들기]
  → "애플리케이션 부하 분산기(HTTP/HTTPS)" 선택
  → "공개 (외부)" 선택
  → "전역 외부 애플리케이션 부하 분산기" 선택
```

### gcloud 리소스 ↔ Console 한글 명칭

가이드의 `gcloud compute` 명령어가 다루는 리소스를 Console에서 확인하려면:

| gcloud 리소스 | Console 한글 명칭 | Console 위치 |
|---|---|---|
| `addresses` | **외부 IP 주소** | VPC 네트워크 > IP 주소 |
| `network-endpoint-groups` (serverless) | **네트워크 엔드포인트 그룹 (서버리스)** | 부하 분산 > 백엔드 |
| `backend-services` | **백엔드 서비스** | 부하 분산 > 백엔드 |
| `url-maps` | **URL 맵** | 부하 분산 > 부하 분산기 상세 |
| `target-http-proxies` / `target-https-proxies` | **대상 HTTP/HTTPS 프록시** | 부하 분산 > 부하 분산기 상세 |
| `forwarding-rules` | **전달 규칙** | 부하 분산 > 프론트엔드 |
| `ssl-certificates` | **SSL 인증서** | 부하 분산 > SSL 인증서 또는 인증서 관리자 |

> CLI(`gcloud compute ...`)와 Console UI 모두 동일한 리소스를 다룹니다. 재현성·기록·자동화 측면에서 본 가이드는 CLI 기준으로 작성됐으나, Console UI에서도 동일하게 구성 가능합니다.

### 최근 명칭 변경 (2024년경)

Google이 부하 분산기 제품 라인을 정리하면서 명칭이 바뀌었습니다. 본 가이드의 영문 용어는 구 명칭 기준일 수 있으니 다음 매핑을 참고하세요:

| 이전 영문 명칭 | 현재 영문 명칭 | 현재 한글 명칭 |
|---|---|---|
| External HTTP(S) Load Balancer | Global External Application Load Balancer | **전역 외부 애플리케이션 부하 분산기** |
| Internal HTTP(S) Load Balancer | Internal Application Load Balancer | 내부 애플리케이션 부하 분산기 |

가이드의 `--load-balancing-scheme=EXTERNAL_MANAGED` 옵션이 바로 위 "전역 외부 애플리케이션 부하 분산기"에 해당합니다.

---

## 목차

1. [전환 전후 비교](#1-전환-전후-비교)
2. [전환 시 영향 사항](#2-전환-시-영향-사항)
3. [사전 준비 체크리스트](#3-사전-준비-체크리스트)
4. [전환 절차 (전체 흐름)](#4-전환-절차-전체-흐름)
5. [Phase 1 — LB 리소스 생성 (운영 영향 없음)](#5-phase-1--lb-리소스-생성-운영-영향-없음)
6. [Phase 2 — LB 사전 동작 검증](#6-phase-2--lb-사전-동작-검증)
7. [Phase 3 — DNS TTL 사전 단축](#7-phase-3--dns-ttl-사전-단축)
8. [Phase 4 — 컷오버 (실제 전환)](#8-phase-4--컷오버-실제-전환)
9. [Phase 5 — 전환 후 검증](#9-phase-5--전환-후-검증)
10. [롤백 절차](#10-롤백-절차)
11. [선택: 308 method-preserving 리다이렉트](#11-선택-308-method-preserving-리다이렉트)
12. [정리 (Firebase Hosting 해제 / 비용)](#12-정리-firebase-hosting-해제--비용)
13. [트러블슈팅](#13-트러블슈팅)

---

## 1. 전환 전후 비교

### 현재 (Firebase Hosting + Cloud Run)

```
Client
  ↓ HTTPS (Firebase가 HTTP는 301로 강제 업그레이드)
[Firebase Hosting CDN]
  ↓ rewrite (firebase.json: ** → Cloud Run)
[Cloud Run: axis-license (asia-northeast3)]
```

### 전환 후 (GCP LB + Cloud Run)

```
Client
  ↓ HTTP(80) 또는 HTTPS(443)
[GCP External HTTP(S) Load Balancer (전역, EXTERNAL_MANAGED)]
  ↓ Serverless NEG
[Cloud Run: axis-license (asia-northeast3, 동일 서비스 재사용)]
```

| 항목 | Firebase Hosting | GCP LB |
|---|---|---|
| HTTP 수신 | 불가 (자동 301 → HTTPS) | 가능 |
| 리다이렉트 응답 코드 변경 | 불가 (301 고정) | 가능 (308 등) |
| SSL 인증서 | Firebase 자동 발급 | Google-managed 또는 자체 발급 |
| CDN 캐시 | 자동 | 별도 Cloud CDN 옵션 필요 |
| 비용 (저트래픽) | 거의 무료 ~ 적음 | 월 ~$18 기본 + 트래픽 |
| 설정 복잡도 | 낮음 | 보통 |

---

## 2. 전환 시 영향 사항

### 그대로 동작하는 것
- Cloud Run 서비스(`axis-license`) 자체는 변경 없음. 코드/환경변수/리비전 그대로.
- Next.js 내부 라우팅(`next.config.js`의 rewrites: `/spauth.php → /api/spauth` 등) 그대로 동작.
- API 로직, DB, Redis, 모든 비즈니스 코드 영향 없음.

### 변경되는 것
- 진입 URL이 Firebase Hosting 엣지 → GCP LB IP로 바뀜.
- `firebase.json`의 `hosting.rewrites`는 더 이상 평가되지 않음 (Firebase Hosting을 거치지 않기 때문).
- SSL 인증서 발급/갱신 주체가 Firebase → GCP로 이동.

### 다운타임
- 컷오버 시점에 **DNS 전파 시간 + Google-managed SSL 발급 검증 시간** 동안 일부 사용자에게 영향 가능.
- TTL 사전 단축 + 사전 검증으로 보통 수 분 이내로 줄일 수 있음.

---

## 3. 사전 준비 체크리스트

전환 작업 전에 반드시 확인:

- [ ] GCP 프로젝트 ID 확인: `license-491102` (또는 실제 사용 프로젝트)
- [ ] Cloud Run 서비스명/리전 확인: `axis-license` / `asia-northeast3`
- [ ] 이전할 커스텀 도메인 확정 (예: `license-api.starplayer.net`)
  > 도메인은 나중에 추가/변경 가능하지만, 변경 시 **SSL 인증서 재발급(15분~24시간 검증 대기)** + DNS 재작업 + Phase 2 사전 검증 재수행이 필요하므로 가급적 사전에 확정 권장.
- [ ] DNS 관리 권한 확보 (도메인 등록기관 또는 Cloud DNS)
- [ ] `gcloud` CLI 로그인 및 프로젝트 설정
  ```bash
  gcloud auth login
  gcloud config set project license-491102
  ```
- [ ] 필요한 API 활성화 확인
  ```bash
  gcloud services enable compute.googleapis.com
  gcloud services enable run.googleapis.com
  ```
- [ ] Firebase Hosting에 도메인 연결되어 있음을 확인 (Firebase Console > Hosting)
- [ ] **백업 가능한 시점인지 확인** (예: 트래픽 낮은 시간대)
- [ ] 모바일 클라이언트(Android Retrofit2 등) baseUrl이 변경된 도메인을 가리키도록 이미 배포되어 있는지 확인 (도메인을 그대로 쓰면 클라이언트 변경 불필요)

---

## 4. 전환 절차 (전체 흐름)

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: LB 리소스 생성  ──── 운영 영향 없음 (병렬 구성)        │
├─────────────────────────────────────────────────────────────┤
│ Phase 2: LB 사전 동작 검증 ── curl --resolve 로 IP 직접 검증  │
├─────────────────────────────────────────────────────────────┤
│ Phase 3: DNS TTL 단축       ── 컷오버 24h 전 미리 적용         │
├─────────────────────────────────────────────────────────────┤
│ Phase 4: 컷오버             ── Firebase 분리 + DNS 변경      │
├─────────────────────────────────────────────────────────────┤
│ Phase 5: 전환 후 검증       ── 응답/로그/SSL 상태 확인        │
├─────────────────────────────────────────────────────────────┤
│ (필요 시) 롤백              ── DNS만 되돌리면 됨             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Phase 1 — LB 리소스 생성 (운영 영향 없음)

이 단계의 모든 명령은 운영 중인 Firebase Hosting과 무관하게 진행됨. 도메인은 아직 Firebase를 가리키고 있어 사용자 영향 없음.

### 5-1. 변수 설정

```bash
export PROJECT_ID=license-491102
export REGION=asia-northeast3
export DOMAIN=license-api.starplayer.net
export CLOUD_RUN_SVC=axis-license

gcloud config set project $PROJECT_ID
```

### 5-2. 고정 외부 IP 예약

```bash
gcloud compute addresses create license-lb-ip --global

# 발급된 IP 확인 (DNS A 레코드에 사용)
gcloud compute addresses describe license-lb-ip --global \
  --format="get(address)"
```
> 출력된 IP를 메모. 예: `34.120.XX.XX`

### 5-3. Serverless NEG 생성

```bash
gcloud compute network-endpoint-groups create license-neg \
  --region=$REGION \
  --network-endpoint-type=serverless \
  --cloud-run-service=$CLOUD_RUN_SVC
```

### 5-4. Backend Service 및 NEG 연결

```bash
gcloud compute backend-services create license-backend \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED

gcloud compute backend-services add-backend license-backend \
  --global \
  --network-endpoint-group=license-neg \
  --network-endpoint-group-region=$REGION
```

### 5-5. URL Map (라우팅 규칙)

```bash
gcloud compute url-maps create license-url-map \
  --default-service license-backend
```

### 5-6. SSL 인증서 (Google-managed)

```bash
gcloud compute ssl-certificates create license-cert \
  --domains=$DOMAIN \
  --global
```
> 이 시점에는 도메인이 Firebase IP를 가리키므로 인증서 상태는 `PROVISIONING`에서 멈춤. 정상.

### 5-7. HTTP(80) 프록시 & 포워딩 규칙

```bash
gcloud compute target-http-proxies create license-http-proxy \
  --url-map license-url-map

gcloud compute forwarding-rules create license-http-rule \
  --global \
  --target-http-proxy license-http-proxy \
  --ports 80 \
  --address license-lb-ip \
  --load-balancing-scheme=EXTERNAL_MANAGED
```

### 5-8. HTTPS(443) 프록시 & 포워딩 규칙

```bash
gcloud compute target-https-proxies create license-https-proxy \
  --url-map license-url-map \
  --ssl-certificates license-cert

gcloud compute forwarding-rules create license-https-rule \
  --global \
  --target-https-proxy license-https-proxy \
  --ports 443 \
  --address license-lb-ip \
  --load-balancing-scheme=EXTERNAL_MANAGED
```

### 5-9. Cloud Run 인그레스 설정

```bash
gcloud run services update $CLOUD_RUN_SVC \
  --region=$REGION \
  --ingress=internal-and-cloud-load-balancing
```
> ⚠️ 이 설정 적용 시점부터 **Cloud Run의 `*.run.app` 직접 호출과 Firebase Hosting을 통한 호출이 차단됨**. 운영 영향 발생. 컷오버 직전(Phase 4)에 적용하는 것을 권장.
>
> Phase 1 단계에서는 `--ingress=all`로 유지하고, Phase 4 컷오버 시점에 적용해도 됨.

---

## 6. Phase 2 — LB 사전 동작 검증

DNS를 바꾸기 전에 LB가 정상 동작하는지 IP를 직접 지정해서 검증.

### 6-1. HTTP 검증

```bash
LB_IP=$(gcloud compute addresses describe license-lb-ip --global --format="get(address)")

curl -v --resolve $DOMAIN:80:$LB_IP \
  "http://$DOMAIN/spauth?license_code=TEST-CODE"
```
> 200 응답과 함께 XML이 반환되면 성공. (license_code가 유효하지 않으면 `<error>1</error><message>no data.</message>` 응답이지만, HTTP 200으로 LB→Cloud Run까지 라우팅이 정상임을 확인 가능.)

### 6-2. HTTPS 검증 (SSL 발급 후)

SSL 인증서 상태 확인:
```bash
gcloud compute ssl-certificates describe license-cert --global \
  --format="get(managed.status,managed.domainStatus)"
```
> `PROVISIONING` 상태면 아직 발급 대기. DNS를 바꾸기 전이므로 정상.

자체 발급 인증서를 임시 적용해 HTTPS도 미리 검증하고 싶다면:
```bash
gcloud compute ssl-certificates create license-cert-self \
  --certificate=/path/to/cert.crt \
  --private-key=/path/to/cert.key \
  --global

gcloud compute target-https-proxies update license-https-proxy \
  --ssl-certificates license-cert-self
```

### 6-3. POST + body 검증

```bash
curl -v --resolve $DOMAIN:80:$LB_IP \
  -X POST "http://$DOMAIN/spauth.php" \
  -d "license_code=TEST-CODE"
```
> Body가 정상적으로 Cloud Run에 전달되는지 확인. 이때 Cloud Run 로그에서 `[spauth] method=POST | ...` 로그를 확인 가능.

---

## 7. Phase 3 — DNS TTL 사전 단축

컷오버 24시간 전 (또는 그 이상)에 DNS TTL을 미리 줄여놓아 컷오버 시점의 전파 지연을 최소화.

```
도메인 등록기관 또는 Cloud DNS에서
A 레코드의 TTL을 86400(24h) → 60~300초로 변경
```

> Cloud DNS 사용 시:
> ```bash
> gcloud dns record-sets update $DOMAIN. \
>   --zone=YOUR_ZONE_NAME \
>   --type=A \
>   --ttl=60 \
>   --rrdatas=<현재 Firebase IP>
> ```
> TTL 변경 자체가 기존 TTL(예: 24h)만큼 캐시될 수 있어 **반드시 컷오버 하루 전에는 적용**해야 효과 있음.

---

## 8. Phase 4 — 컷오버 (실제 전환)

### 8-1. Cloud Run 인그레스 확정 (Phase 1에서 미적용한 경우)

```bash
gcloud run services update $CLOUD_RUN_SVC \
  --region=$REGION \
  --ingress=internal-and-cloud-load-balancing
```

### 8-2. Firebase Hosting에서 커스텀 도메인 연결 해제

> ⚠️ **이 단계가 필수.** Firebase가 도메인 소유권을 잡고 있으면 GCP의 Google-managed SSL이 도메인 검증에 실패해서 영원히 `PROVISIONING`에 머무름.

- Firebase Console > Hosting > 사이트 선택 > 커스텀 도메인 옆 **⋮ > 도메인 삭제**
- 또는 Firebase Hosting 자체를 비활성화

### 8-3. DNS A 레코드를 LB IP로 변경

```
A 레코드 값을 Firebase IP → LB IP (5-2단계 출력값)으로 변경
```

> Cloud DNS 사용 시:
> ```bash
> gcloud dns record-sets update $DOMAIN. \
>   --zone=YOUR_ZONE_NAME \
>   --type=A \
>   --ttl=60 \
>   --rrdatas=$LB_IP
> ```

### 8-4. Google-managed SSL 인증서 발급 대기

```bash
gcloud compute ssl-certificates describe license-cert --global \
  --format="get(managed.status,managed.domainStatus)"
```
> `ACTIVE`로 바뀔 때까지 대기. 보통 15분~30분, 최대 24시간. 발급 중에는 HTTPS 요청이 SSL 핸드셰이크 실패할 수 있음.

> **다운타임 회피 팁**: 자체 인증서가 있다면 5-6단계 대신 `--certificate, --private-key` 옵션으로 임시 적용해 SSL 발급 대기 시간을 회피할 수 있음. 발급 완료 후 Google-managed로 교체.

---

## 9. Phase 5 — 전환 후 검증

### 9-1. DNS 전파 확인

```bash
dig $DOMAIN +short
# 또는
nslookup $DOMAIN
```
> 결과가 LB IP와 일치하는지 확인.

### 9-2. HTTPS 정상 호출 확인

```bash
curl -v "https://$DOMAIN/spauth?license_code=실제유효한코드"
```

### 9-3. HTTP 정상 호출 확인 (HTTP 수신 옵션을 켠 경우)

```bash
curl -v "http://$DOMAIN/spauth?license_code=실제유효한코드"
```
> HTTP 그대로 200이 와야 함. 308 리다이렉트 옵션을 적용했다면 `-L` 없이 308 응답을 직접 확인.

### 9-4. POST + body 확인

```bash
curl -v -X POST "https://$DOMAIN/spauth.php" \
  -d "license_code=실제유효한코드"
```

### 9-5. Cloud Run 로그 확인

```bash
gcloud run services logs read $CLOUD_RUN_SVC --region=$REGION --limit=50
```
> `[spauth] method=... | content-type=... | license=...` 로그가 정상적으로 출력되는지 확인.

### 9-6. 안드로이드/iOS/PC 클라이언트 실제 호출 확인

각 플랫폼에서 라이센스 인증 시나리오를 실제로 수행해 정상 동작 확인.

---

## 10. 롤백 절차

전환 직후 문제가 발견되면 DNS만 되돌리면 즉시 원복 가능.

### 10-1. DNS A 레코드를 Firebase IP로 되돌림

```
A 레코드 값을 LB IP → 원래 Firebase IP로 복원
```

### 10-2. Firebase Hosting 커스텀 도메인 재연결 (해제했었다면)

Firebase Console > Hosting > 커스텀 도메인 다시 추가 후 도메인 검증 진행.

### 10-3. Cloud Run 인그레스 복원

```bash
gcloud run services update $CLOUD_RUN_SVC \
  --region=$REGION \
  --ingress=all
```

### 10-4. (선택) LB 리소스 정리

문제 해결 후 다시 시도할 거면 LB 리소스는 그대로 두고 재시도. 영구히 롤백하려면 [12장](#12-정리-firebase-hosting-해제--비용) 참고.

---

## 11. 선택: 308 method-preserving 리다이렉트

"HTTP 요청을 받아도 처리는 HTTPS로 강제하고 싶다, 하지만 POST body는 보존하고 싶다"는 경우. (Firebase의 301은 POST→GET 변환으로 body 손실됨)

### 11-1. URL Map에 308 리다이렉트 규칙 적용

`http-redirect.yaml` 파일 작성:

```yaml
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: PERMANENT_REDIRECT   # 308
  stripQuery: false
```

별도 URL Map 생성 및 HTTP 프록시 교체:

```bash
# HTTP 전용 URL Map (308 리다이렉트만 수행)
gcloud compute url-maps import license-http-redirect-map \
  --source=http-redirect.yaml \
  --global

# HTTP 프록시가 이 새 URL Map을 사용하도록 변경
gcloud compute target-http-proxies update license-http-proxy \
  --url-map license-http-redirect-map
```

### 11-2. 동작

- `http://license-api.starplayer.net/spauth.php` POST + body
  ↓
- LB가 308 응답 (`Location: https://license-api.starplayer.net/spauth.php`)
  ↓
- Retrofit2/OkHttp가 method+body 보존한 채 HTTPS로 자동 재요청
  ↓
- Cloud Run에서 정상 처리

> ⚠️ 308이라도 첫 HTTP 요청의 body는 네트워크 구간에 평문으로 한 번 흐름. 보안상 클라이언트가 처음부터 HTTPS로 보내는 게 최선.

---

## 12. 정리 (Firebase Hosting 해제 / 비용)

### 12-1. Firebase Hosting 완전 비활성화

LB 전환이 안정화되면 Firebase Hosting을 정리.

```bash
firebase hosting:disable
# 또는 Firebase Console > Hosting > 사이트 비활성화
```

- `firebase.json`은 그대로 두어도 무방하지만, 더 이상 의미 없으므로 `hosting` 섹션을 제거하거나 파일을 삭제 가능.
- `next.config.js`의 rewrites는 Cloud Run 내부에서 동작하므로 영향 없음. 그대로 유지.

### 12-2. 비용 구조

```
월 비용 = [고정 forwarding rule] + [데이터 처리] + [egress]
            ↑ 트래픽 0이어도 발생          ↑ 트래픽 비례
```

| 항목 | 단가 | 비고 |
|---|---|---|
| Forwarding rule (HTTP) | $0.025/h × 730h ≈ **$18/월** | 고정 (트래픽 무관) |
| Forwarding rule (HTTPS) | $0.025/h × 730h ≈ **$18/월** | 고정 (트래픽 무관) |
| 데이터 처리 | **$0.008/GB** | LB 통과 트래픽 |
| Egress (인터넷) | $0.12/GB ~ | Cloud Run 응답이 외부로 나갈 때 |
| 고정 IP (사용 중) | 무료 | 미사용 시 약 $7.3/월 |
| Google-managed SSL | 무료 | 자동 갱신 |
| Cloud Run | 기존과 동일 | 변동 없음 |

> ⚠️ **트래픽이 0이어도 HTTP+HTTPS forwarding rule 두 개를 띄우면 월 $36이 무조건 발생.**
> HTTPS만 필요하다면 forwarding rule 1개만 두어 비용을 **월 $18로 절반 절감** 가능.

---

### 12-3. 트래픽별 LB 총 비용 분석

라이센스 인증 API 응답 평균 크기를 **5KB**로 가정한 시뮬레이션:

| 일일 요청 | 월 요청 수 | 월 데이터량 | 데이터 비용 | LB 총 비용 (HTTP+HTTPS) | 데이터 비중 |
|---|---|---|---|---|---|
| 1,000 | 30,000 | 0.15 GB | $0.001 | **$36.5** | 0% |
| 10,000 | 300,000 | 1.5 GB | $0.012 | **$36.5** | 0% |
| 100,000 | 3,000,000 | 15 GB | $0.12 | **$36.6** | 0.3% |
| 500,000 | 15,000,000 | 75 GB | $0.60 | **$37.1** | 1.6% |
| 1,000,000 | 30,000,000 | 150 GB | $1.20 | **$37.7** | 3.2% |
| 5,000,000 | 150,000,000 | 750 GB | $6.00 | **$42.5** | 14% |
| 10,000,000 | 300,000,000 | 1,500 GB | $12.00 | **$48.5** | 25% |
| 50,000,000 | 1,500,000,000 | 7,500 GB | $60.00 | **$96.5** | 62% |

---

### 12-4. "저트래픽" 정의 (LB 비용 효율성 관점)

LB는 트래픽이 폭증해도 자동 확장하므로 **"성능적 저트래픽"이라는 개념 자체가 거의 없음**. 따라서 "저트래픽"은 순전히 **비용 효율성 관점**의 정의:

| 정의 | 기준 | 의미 |
|---|---|---|
| **고정 비용 지배 구간** | 일일 100만 건 이하 | LB 총 비용의 95%+ 가 고정 forwarding rule. 트래픽이 사실상 무료. |
| **비용 효율적 변곡점** | 일일 500만 건 이상 | 데이터 비용이 의미를 갖기 시작. 그래도 요청당 단가는 매우 저렴. |
| **LB가 "오버페이"되는 구간** | 일일 10만 건 이하 | $36으로 거의 사용 안 함. 같은 돈으로 VM/Firebase 대안 검토 가능. |

> **결론: GCP LB 기준 저트래픽 = 일일 100만 건 이하**
>
> 이 구간에서 LB 총 비용 ≈ $37/월로 거의 고정. 트래픽이 10배 늘어도 비용은 $1~2만 추가됨.
> 따라서 일일 100만 건까지는 비용 걱정 없이 LB 사용 가능.

---

### 12-5. 대규모 트래픽 시 비용 절감 (참고)

| 일일 요청 | 월 LB 비용 | 절감 방안 |
|---|---|---|
| 100만 | $37.7 | 별도 조치 불필요 |
| 1,000만 | $48.5 | Cloud CDN 검토 (응답 캐싱) |
| 1억 | $156 | **Cloud CDN 강력 권장**. 캐시된 응답은 데이터 처리 비용 절감 가능 |
| 10억 | $1,236 | Cloud CDN + 응답 압축(gzip/br) + 캐시 헤더 최적화 |

라이센스 인증 API는 이미 Redis 캐시를 사용하지만, LB 앞에 **Cloud CDN**을 추가하면 동일 라이센스 코드에 대한 반복 요청을 LB 단에서 응답할 수 있어 Cloud Run 호출과 데이터 처리 비용을 동시에 줄일 수 있음.

---

### 12-6. 모니터링 권장

```bash
# LB 트래픽 모니터링
gcloud compute backend-services get-health license-backend --global

# Cloud Monitoring에서 LB 메트릭 대시보드 구성 권장
```

---

## 13. 트러블슈팅

### 13-1. SSL 인증서가 `PROVISIONING`에서 안 넘어감
- DNS A 레코드가 LB IP를 가리키고 있는지 확인 (`dig $DOMAIN +short`)
- Firebase Hosting에서 도메인 분리가 안 됐을 수 있음 → 재확인
- Google-managed cert는 도메인 검증에 최대 24시간 소요됨
- DNS 전파가 충분히 됐는지 확인 (여러 DNS 서버에서 조회)

### 13-2. LB 응답이 502/503
- Cloud Run 인그레스가 `internal-and-cloud-load-balancing`인지 확인
- Serverless NEG가 정확한 리전(`asia-northeast3`)과 서비스(`axis-license`)를 가리키는지 확인
  ```bash
  gcloud compute network-endpoint-groups describe license-neg --region=$REGION
  ```
- Cloud Run 서비스가 실제로 실행 중인지 확인 (`gcloud run services describe axis-license --region=$REGION`)

### 13-3. HTTP 요청은 잘 가는데 HTTPS만 실패
- SSL 인증서 상태 `ACTIVE`인지 확인
- target-https-proxy에 인증서가 정확히 바인딩됐는지 확인
  ```bash
  gcloud compute target-https-proxies describe license-https-proxy
  ```

### 13-4. 캐시된 응답이 계속 반환됨
- Firebase Hosting CDN에 캐시된 응답이 DNS 전파 전에 일부 사용자에게 노출될 수 있음.
- TTL 만료까지 대기 또는 클라이언트에서 강제 새로고침.

### 13-5. Android에서 여전히 "no parameter"
- baseUrl이 `http://`로 남아있을 가능성. HTTPS 강제 옵션이 켜진 상태로 잘못된 도메인을 가리킬 수 있음.
- OkHttp 로깅 인터셉터를 켜서 실제 요청 URL 확인 권장. (자세한 진단은 [HTTP_PROTOCOL_GUIDE.md](./HTTP_PROTOCOL_GUIDE.md) 참고)

### 13-6. 비용이 예상보다 많이 나옴
- Forwarding rule 개수 확인 (`gcloud compute forwarding-rules list`)
- HTTP가 필요 없다면 HTTP forwarding rule(`license-http-rule`)을 삭제해 비용 절감
  ```bash
  gcloud compute forwarding-rules delete license-http-rule --global
  ```

---

## 부록: 리소스 일괄 삭제 (롤백 완료 후 정리)

전환을 영구히 취소하고 모든 LB 리소스를 삭제하려면:

```bash
gcloud compute forwarding-rules delete license-http-rule --global -q
gcloud compute forwarding-rules delete license-https-rule --global -q
gcloud compute target-http-proxies delete license-http-proxy -q
gcloud compute target-https-proxies delete license-https-proxy -q
gcloud compute url-maps delete license-url-map -q
gcloud compute ssl-certificates delete license-cert --global -q
gcloud compute backend-services delete license-backend --global -q
gcloud compute network-endpoint-groups delete license-neg --region=$REGION -q
gcloud compute addresses delete license-lb-ip --global -q
```

Cloud Run 인그레스 복원:
```bash
gcloud run services update $CLOUD_RUN_SVC --region=$REGION --ingress=all
```
