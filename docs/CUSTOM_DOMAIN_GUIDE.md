# 커스텀 도메인 연결 가이드 (Firebase Hosting + Cloud Run)

## 목차

1. [개요](#1-개요)
2. [Firebase 플랜 선택](#2-firebase-플랜-선택)
3. [사전 준비](#3-사전-준비)
4. [Firebase 초기 설정](#4-firebase-초기-설정)
5. [Firebase Hosting 구성](#5-firebase-hosting-구성)
6. [배포 및 동작 확인](#6-배포-및-동작-확인)
7. [커스텀 도메인 연결](#7-커스텀-도메인-연결)
8. [DNS 설정](#8-dns-설정)
9. [SSL 인증서 발급 및 검증](#9-ssl-인증서-발급-및-검증)
10. [모바일 앱 마이그레이션](#10-모바일-앱-마이그레이션)
11. [운영 팁](#11-운영-팁)
12. [트러블슈팅](#12-트러블슈팅)

---

## 1. 개요

`asia-northeast3` 리전에 배포된 Cloud Run 서비스(`axis-license`)의 도메인을 커스텀 도메인으로 변경하기 위한 가이드입니다.

### 현재 상황

Cloud Run이 자동 발급하는 두 가지 URL 형식이 동시에 존재합니다(같은 서비스).

| 유형 | URL 예시 |
|------|----------|
| 신규 형식 (프로젝트 번호 기반) | `https://axis-license-1045880349863.asia-northeast3.run.app` |
| 구 형식 (리전 코드 `du` 기반) | `https://axis-license-5f3ubbbrdq-du.a.run.app` |

이 두 URL을 단일 커스텀 도메인(예: `license-api.starplayer.net`)으로 통합합니다.

### 선택 방식: Firebase Hosting + Cloud Run Rewrite

| 항목 | 내용 |
|------|------|
| 비용 | 트래픽에 따라 Spark(무료) 또는 Blaze (종량제) — [2장 참고](#2-firebase-플랜-선택) |
| SSL | 자동 발급/갱신 |
| CDN | 글로벌 자동 적용 |
| 리전 제한 | 없음 (`asia-northeast3` 정상 지원) |
| 설정 난이도 | 낮음 |

### 핵심 설계

- 모든 요청(`/`, `/auth`, `/api/spauth/...`, `/spauth?license_code=...`)은 Firebase Hosting을 통해 Cloud Run의 `axis-license` 서비스로 그대로 전달됩니다.
- Next.js 라우팅과 API 라우트는 변경 없이 그대로 동작합니다.

---

## 2. Firebase 플랜 선택

본격적인 설정 전, 트래픽 규모와 비용 구조를 이해해야 합니다.

> ⚠️ **`license-491102` 프로젝트는 GCP 결제가 이미 활성화되어 있으므로, Firebase 추가 시 Blaze 플랜이 자동 적용됩니다.** Spark 플랜을 선택할 수 없습니다. 자세한 내용은 [4-4](#4-4-기존-gcp-프로젝트에-firebase-추가) 참고.
>
> 이 장의 Spark 플랜 설명은 **신규/별도 Firebase 프로젝트를 만드는 경우**에만 해당합니다. `license-491102`을 사용한다면 [2-6 Blaze 비용](#2-6-blaze-플랜-예상-비용) 부분만 참고해도 충분합니다.

### 2-1. 플랜 비교

| 항목 | Spark (무료) | Blaze (종량제) |
|------|-------------|---------------|
| **데이터 전송량** | **360 MB/일 (하드 리밋)** | 10 GB/월 무료 + $0.15/GB |
| 저장 용량 | 10 GB | 10 GB 무료 + $0.026/GB |
| 커스텀 도메인 | 무제한 | 무제한 |
| SSL 인증서 | 무제한 | 무제한 |
| 동시 요청 수 | 제한 없음 | 제한 없음 |
| 요청당 응답 크기 | 50 MB | 50 MB |
| SLA | 없음 | 99.95% 보장 |
| 한도 초과 시 | **즉시 503 응답** | 종량 과금 (예산 알림 가능) |

### 2-2. 360 MB/일이 의미하는 것

`/spauth` API XML 응답 평균 크기 기준 일일 처리 가능 요청 수:

| 평균 응답 크기 | Spark 플랜 일일 한도 |
|----------------|---------------------|
| 2 KB | 약 180,000 건 |
| 5 KB | 약 72,000 건 |
| 10 KB | 약 36,000 건 |
| 50 KB | 약 7,200 건 |

> 응답 외에 정적 자산(`/_next/static/...`), HTML, 이미지 등도 동일한 360 MB에 합산됩니다.

### 2-3. Spark 플랜 한도 초과 시 동작 (⚠️ 주의)

- **하드 리밋**이므로 한도 도달 시 Hosting이 즉시 503/요청 거부 응답
- 다음 날 UTC 00:00 리셋까지 서비스 중단
- **모바일 앱 라이선스 인증 실패 → 사용자 클레임 발생 위험**

### 2-4. Cloud Run은 별도 과금

Firebase Hosting을 거쳐도 **Cloud Run의 사용량은 독립적으로 과금**됩니다 (현재와 동일 수준 유지).

| 구간 | 과금 주체 |
|------|----------|
| 클라이언트 ↔ Firebase CDN | Firebase Hosting 전송량 |
| Firebase CDN ↔ Cloud Run | Cloud Run 인그레스 (무료) + 컴퓨팅 |

### 2-5. 케이스별 권장 플랜

| 상황 | 권장 |
|------|------|
| 일일 API 호출 1,000건 미만 (관리자 + 소수 앱) | Spark 플랜 OK |
| 일일 API 호출 1만 건 이상 | **Blaze 플랜 권장** |
| 모바일 앱 운영 / 외부 노출 API | **Blaze 플랜 필수** |
| 트래픽 예측 불가 | **Blaze 플랜 + 예산 알림 필수** |

### 2-6. Blaze 플랜 예상 비용

| 월간 전송량 | 무료 한도 초과분 | 예상 청구액 |
|-----------|---------------|------------|
| 10 GB | 0 GB | $0 |
| 50 GB | 40 GB | 약 $6 (8,000원) |
| 100 GB | 90 GB | 약 $13.5 (18,000원) |
| 200 GB | 190 GB | 약 $28.5 (38,000원) |

> Cloud Run 비용은 별도이지만 현재와 동일 수준으로 유지됩니다.

### 2-7. Blaze 업그레이드 시 안전장치

1. [Cloud Billing](https://console.cloud.google.com/billing) → **예산 알림** 설정 (예: 월 $50 도달 시 이메일)
2. [Firebase 사용량 대시보드](https://console.firebase.google.com/project/license-491102/usage) 에서 일별 전송량 모니터링
3. `firebase.json`에 캐시 헤더 추가하여 정적 자원 CDN 캐시 적극 활용 ([11-3 참고](#11-3-api-캐시-비활성화-필요-시))
4. 비정상 트래픽 차단을 위해 Cloud Run 측에서 IP 화이트리스트(`ADMIN_IP_WHITELIST`) 또는 Cloud Armor 도입 검토

### 2-8. 다른 옵션이 더 적합한 경우

다음과 같은 요구사항이 있다면 Firebase Hosting 대신 **HTTPS Load Balancer + Serverless NEG** 방식을 검토하세요:

- WAF / Cloud Armor 직접 연동 필요
- 데이터 전송량 한도가 전혀 없어야 함
- 다중 백엔드(Cloud Run + GCS + GKE 등) 라우팅 필요

월 약 $18(약 24,000원)의 LB 고정비가 발생하지만 Firebase Hosting 한도와 무관하게 동작합니다.

---

## 3. 사전 준비

### 3-1. 필수 항목

| 항목 | 비고 |
|------|------|
| 사용할 도메인 | 예: `license-api.starplayer.net` |
| DNS 관리 권한 | cafe24 / Cloudflare / GoDaddy 등 |
| GCP 프로젝트 권한 | `license-491102` |
| Node.js | 18 이상 |
| 선택한 Firebase 플랜 | [2장](#2-firebase-플랜-선택) 참고 |

### 3-2. 현재 배포 정보

| 항목 | 값 |
|------|---|
| GCP 프로젝트 ID | `license-491102` |
| Cloud Run 서비스명 | `axis-license` |
| 리전 | `asia-northeast3` |

---

## 4. Firebase 초기 설정

### 4-1. Firebase CLI 설치

```powershell
npm install -g firebase-tools
firebase --version
```

### 4-2. Firebase 로그인

```powershell
firebase login
```

브라우저가 열리면 GCP 프로젝트 권한이 있는 계정으로 로그인합니다.

### 4-3. 프로젝트 목록 확인

```powershell
firebase projects:list
```

- `license-491102`이 **보이면** → [4-5 결제 플랜 확인](#4-5-결제-플랜-확인-자동-blaze-적용)으로 건너뜁니다.
- `license-491102`이 **보이지 않으면** → 4-4를 진행하세요.

### 4-4. 기존 GCP 프로젝트에 Firebase 추가

[Firebase Console](https://console.firebase.google.com) → **"프로젝트 추가"** → **"기존 Google Cloud 프로젝트 추가"** → `license-491102` 선택.

> ⚠️ **이 작업 전에 반드시 다음 사항을 숙지하세요.** Firebase 추가 화면에서 Google이 명시적으로 안내하는 내용입니다.

#### 추가 시 유의사항 (Google 공식 안내)

| 항목 | 내용 |
|------|------|
| **되돌릴 수 없음** | Firebase 추가 작업 자체는 실행취소 불가. 단, 대부분의 Firebase 서비스는 추가 후 수동으로 중지/제거 가능 |
| **결제 공유** | Google Cloud와 Firebase 간 결제가 공유됨. 별도 결제 계정 분리 불가 |
| **Blaze 자동 적용** | GCP 프로젝트에 결제가 활성화되어 있으면 **Firebase Blaze (종량제) 플랜이 자동 적용**됨. Spark 플랜 선택지 없음 |
| **IAM 공유** | GCP 프로젝트의 모든 IAM 역할/권한이 Firebase에도 자동 적용. 즉 GCP 편집자 → Firebase 편집자가 자동 부여됨 |
| **삭제 영향** | Firebase 프로젝트 삭제 = **GCP 프로젝트와 모든 리소스 삭제** (Cloud Run, Cloud SQL, VPC 커넥터 등 전부 삭제됨) |
| **데이터 영향** | Firebase 콘솔에서 리소스/데이터 삭제·수정 시 **GCP 측 동일 리소스에도 즉시 반영** |

#### `license-491102` 특수 상황

이 프로젝트는 이미 다음 GCP 서비스가 운영 중이므로 결제가 활성화된 상태입니다:
- Cloud Run (`axis-license`)
- Cloud SQL (`license-db`)
- VPC 커넥터 / Memorystore (Redis)

따라서 Firebase 추가 시 **Blaze 플랜이 자동 적용**됩니다. 가이드 [2장](#2-firebase-플랜-선택)에서 설명한 Spark 플랜 시작 옵션은 **이 프로젝트에는 해당하지 않습니다**.

#### 권장 사전 작업

1. **Cloud SQL 백업 확인** — 운영 중 라이선스 데이터 보호
   ```powershell
   gcloud sql backups list --instance=license-db
   ```
2. **Cloud Billing 예산 알림 설정** — Firebase 추가 직전 [예산 페이지](https://console.cloud.google.com/billing/budgets)에서 월 한도 설정 (예: $50)
3. **IAM 멤버 정리** — [IAM 페이지](https://console.cloud.google.com/iam-admin/iam?project=license-491102)에서 불필요한 사용자 제거 (Firebase 콘솔도 자동 접근 가능해지므로)
4. **`firebase` 라벨 추가 결제 식별** — Cloud Billing 보고서에서 Firebase 사용량을 별도 추적하려면 라벨 사용

### 4-5. 결제 플랜 확인 (자동 Blaze 적용)

Firebase 추가 직후 [Firebase Console → 사용량 및 결제](https://console.firebase.google.com/project/license-491102/usage/details) 에서 **현재 플랜이 "Blaze"** 로 표시되는지 확인합니다.

| 표시 | 의미 |
|------|------|
| `Blaze (사용한 만큼 지불)` | 정상. 별도 작업 불필요 |
| `Spark` | 비정상. GCP 결제가 일시 중지된 상태일 수 있음 — Cloud Billing 상태 확인 |

> **별도의 플랜 업그레이드 작업은 불필요합니다** — GCP 결제가 활성화된 프로젝트에 Firebase를 추가하면 자동으로 Blaze가 적용된 상태입니다.

### 4-6. 예산 알림 설정 (필수)

Blaze는 종량제이므로 비정상 트래픽 시 청구액이 증가할 수 있습니다. 추가 직후 반드시 설정:

1. [Cloud Billing → 예산 및 알림](https://console.cloud.google.com/billing/budgets) 접속
2. **"예산 만들기"** 클릭
3. 범위: `license-491102` 프로젝트 선택
4. 금액: 월 $50 (또는 적정값)
5. 알림 임계값: 50%, 90%, 100% (이메일 알림)

---

## 5. Firebase Hosting 구성

### 5-1. Hosting 초기화

`license_` 디렉터리(`C:\axis_license1\license_`)에서 실행:

```powershell
firebase init hosting
```

선택 옵션:

| 질문 | 선택 |
|------|------|
| Use an existing project | `license-491102` |
| Public directory | `public` (엔터) |
| Single-page app? | `No` |
| GitHub 자동 배포? | `No` |
| `index.html` 덮어쓰기? | `No` |

생성/사용 파일 및 디렉터리:

| 항목 | 설명 |
|------|------|
| `firebase.json` | Hosting 설정 (rewrite 규칙 등) — **신규 생성** |
| `.firebaserc` | GCP 프로젝트 매핑 — **신규 생성** |
| `public/` | Next.js 프로젝트에 이미 존재. 없을 경우 신규 생성됨 |
| `public/404.html` | Firebase 기본 404 페이지 — **신규 생성됨** |
| `public/index.html` | "덮어쓰기? `No`" 선택 시 기존 파일 유지. 없으면 Firebase 환영 페이지가 신규 생성됨 |

> ⚠️ **중요: Next.js 프로젝트의 `public/`에는 보통 `index.html`이 없으므로 Firebase가 기본 환영 페이지(`index.html`)를 새로 만듭니다.** 이 파일이 남아 있으면 `https://<도메인>/` 접속 시 Cloud Run의 Next.js 앱이 아닌 Firebase 환영 페이지가 서빙됩니다 (Firebase Hosting은 **정적 파일 우선 → rewrite** 순서로 동작).
>
> **다음 파일들을 반드시 삭제 후 진행하세요:**
> ```powershell
> # Firebase가 자동 생성한 파일이 있으면 삭제
> Remove-Item -Path public\index.html -ErrorAction SilentlyContinue
> Remove-Item -Path public\404.html -ErrorAction SilentlyContinue
> ```
>
> Next.js 프로젝트에 원래부터 `public/index.html`, `public/404.html`이 있는 경우에는 삭제하지 마세요. (일반적인 Next.js 프로젝트에는 없음)

> **참고**: 위 정리 후에도 `public/` 안의 다른 정적 자산(예: `favicon.ico`)은 Firebase Hosting에 함께 배포되어 **엣지에서 직접 서빙**됩니다 (Cloud Run 거치지 않음). 정적 자원 응답 속도가 빨라지는 부수적 이점이 있습니다.

### 5-2. `firebase.json` 수정

생성된 기본 내용을 모두 지우고 아래로 교체:

```json
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "run": {
          "serviceId": "axis-license",
          "region": "asia-northeast3"
        }
      }
    ]
  }
}
```

### 5-3. `.firebaserc` 확인

```json
{
  "projects": {
    "default": "license-491102"
  }
}
```

---

## 6. 배포 및 동작 확인

### 6-1. Hosting 배포

```powershell
firebase deploy --only hosting
```

배포 완료 후 콘솔에 출력되는 임시 URL:
- `https://license-491102.web.app`
- `https://license-491102.firebaseapp.com`

### 6-2. 동작 검증

브라우저에서 임시 URL로 접속해 다음을 확인:

- [ ] 로그인 페이지 정상 표시
- [ ] 로그인 후 라이선스 목록 로딩
- [ ] `/spauth?license_code=<테스트값>` 호출 시 정상 응답
- [ ] 정적 파일(`/_next/static/...`) 정상 로딩

이 단계에서 문제가 있으면 [트러블슈팅](#12-트러블슈팅) 참고.

---

## 7. 커스텀 도메인 연결

### 7-1. Firebase Console 접속

[Firebase Hosting Console](https://console.firebase.google.com/project/license-491102/hosting) 접속.

### 7-2. 도메인 추가

1. **"커스텀 도메인 추가"** 클릭
2. 사용할 도메인 입력 (예: `license-api.starplayer.net`)
3. **"계속"** 클릭
4. Firebase가 **TXT 소유권 확인 레코드**를 표시 — 이 값을 메모

---

## 8. DNS 설정

### 8-1. 기존 운영 도메인 이전 시 주의사항

> 이 절차는 **이미 다른 호스트에서 운영 중인 도메인**을 이 프로젝트로 옮기는 경우에만 해당합니다 (예: 기존 PHP 서버, 다른 Cloud Run, 이전 Firebase 프로젝트에 붙어 있던 도메인). 신규 도메인을 처음 연결하는 경우라면 [8-2](#8-2-1단계-txt-레코드-소유권-확인)로 바로 진행해도 됩니다.

운영 중인 도메인을 옮길 때는 단순 "DNS만 바꾸면 끝"이 아닙니다. **다운타임·SSL·이메일·세션** 네 가지를 미리 점검해야 합니다.

#### 1) 도메인 추가 시점과 DNS 전환 시점을 분리

Firebase 콘솔에서 도메인을 추가한다고 즉시 기존 서비스가 끊기진 않습니다. **A 레코드를 교체하는 그 순간**부터 트래픽이 Firebase로 넘어갑니다. 권장 순서:

1. Firebase에 도메인 추가 + 소유권 TXT만 먼저 등록 ([8-2](#8-2-1단계-txt-레코드-소유권-확인))
2. A 레코드는 아직 기존 서버 그대로 둠
3. Firebase 콘솔의 도메인 상태가 `CONNECTED`로 바뀔 때까지 대기 (최대 24h, [9장](#9-ssl-인증서-발급-및-검증) 참고)
4. DNS TTL을 미리 짧게(300초) 낮춰두기
5. A 레코드 교체 → 트래픽 이전
6. 안정 확인 후 TTL 원복

특히 ③번 SSL 발급이 끝나기 전에 A 레코드를 바꾸면 그 시간 동안 사용자에게 "보안 경고" 화면이 노출됩니다.

#### 2) DNS TTL을 미리 낮춰두기 (전환 1~2일 전)

기존 A 레코드 TTL이 `3600`(1시간) 또는 `86400`(24시간)이면, 교체해도 전 세계 DNS 캐시 만료 전까지 일부 사용자가 옛 서버로 갑니다.

- **전환 1~2일 전** TTL을 `300`(5분)으로 낮춰두기
- 전환 완료 24시간 후 다시 `3600`으로 복원

#### 3) CAA 레코드 확인

도메인에 **CAA 레코드**가 설정되어 있으면, Firebase가 사용하는 인증기관(Let's Encrypt 또는 Google Trust Services)이 차단되어 SSL 발급이 영원히 실패합니다.

```powershell
nslookup -type=CAA starplayer.net
```

레코드가 있다면 다음을 추가합니다:

```
0 issue "letsencrypt.org"
0 issue "pki.goog"
```

또는 CAA 레코드 자체를 제거해도 됩니다.

#### 4) MX·SPF·DKIM·DMARC 레코드 보존

`license-api.starplayer.net` 같은 서브도메인은 메일과 무관하지만, **루트 도메인(`starplayer.net`)에 MX 레코드가 있다면 절대 건드리지 마세요.**

- A / AAAA / CNAME 레코드만 교체
- MX, TXT(SPF/DKIM/DMARC)는 그대로 유지
- 잘못 지우면 회사 이메일이 즉시 끊깁니다

#### 5) 기존 A 레코드는 "교체"이지 "추가"가 아님

흔한 실수: 새 A 레코드 2개를 추가만 하고 기존 A 레코드를 안 지움 → DNS 라운드로빈이 발동해 절반은 옛 서버, 절반은 Firebase로 가는 **랜덤 장애** 발생.

```
기존: license-api.starplayer.net  A  <옛 서버 IP>      ← 반드시 삭제
신규: license-api.starplayer.net  A  <Firebase IP 1>   ← Firebase 안내값
신규: license-api.starplayer.net  A  <Firebase IP 2>   ← Firebase 안내값
```

CNAME과 A 레코드는 동일 호스트에 동시에 둘 수 없습니다 (DNS 표준 위반).

#### 6) HSTS / 브라우저 HTTPS 강제 설정 확인

기존 사이트가 응답 헤더에 `Strict-Transport-Security`를 보내고 있었다면, 사용자 브라우저는 **HTTPS만 고집**합니다. SSL 발급이 끝나기 전에 전환하면 사용자는 우회 불가능한 보안 오류 화면을 봅니다.

→ Firebase Console에서 `CONNECTED` 상태 확인 후에만 DNS 전환.

#### 7) 세션·쿠키 무효화 가능성

도메인은 같지만 백엔드(Cloud Run)가 새 인스턴스라면 기존 세션 토큰이 새 서버에서 무효일 수 있습니다.

- 로그인 사용자가 많다면 **공지 후 점검 시간**에 전환
- 또는 세션 저장소(Firestore, Redis 등)를 신/구가 공유하도록 미리 구성

#### 8) 검색엔진 / 외부 링크 영향

도메인 자체는 동일하므로 SEO 영향은 거의 없지만:

- `robots.txt`, `sitemap.xml`이 새 호스팅에서도 정상 응답하는지 확인
- Google Search Console에 등록된 도메인이면 **소유권 재확인** 필요할 수 있음
- 외부 deep link가 새 라우팅에 매칭되는지 점검

#### 9) 양쪽 서비스 일정 기간 공존

A 레코드를 교체해도 DNS 캐시 때문에 24~48시간은 옛 서버에도 트래픽이 옵니다.

- 옛 Cloud Run / PHP 서버를 **즉시 끄지 말고 최소 48시간** 살려두기
- 가능하면 옛 서버에서 새 도메인으로 임시 리디렉션을 걸어두면 더 안전

#### 10) 비용 구조 변화

기존에 Cloud Run 직결로 운영했다면, Firebase Hosting을 한 번 거치는 순간부터 Firebase Hosting 전송량 과금이 추가됩니다 ([2장](#2-firebase-플랜-선택) 참고).

- Cloud Run 비용은 동일 수준 유지 (Firebase ↔ Cloud Run 인그레스는 무료)
- Firebase Hosting 전송량 과금 신규 발생 → [4-6 예산 알림](#4-6-예산-알림-설정-필수) 필수
- 모바일 앱이 신/구 URL 양쪽으로 흩어진 기간에는 비용 추적도 분리해서 모니터링

#### 11) 이전 도메인 점유 해제

이전에 도메인을 다른 GCP/Firebase 리소스에 붙였던 경우, 점유 해제를 먼저 해야 새 프로젝트에 추가됩니다.

```powershell
# Cloud Run 도메인 매핑 제거 (있는 경우)
gcloud run domain-mappings list --region=asia-northeast3
gcloud run domain-mappings delete --domain=license-api.starplayer.net --region=asia-northeast3
```

이전 Firebase 프로젝트(예: 삭제된 `sp-license`)에 등록되어 있던 도메인이라면, 새 프로젝트에서 도메인 추가 시 충돌 메시지가 뜨고 **"소유권 다시 확인 / Take ownership"** 흐름으로 새 프로젝트로 이전할 수 있습니다.

#### 전환 직전 체크리스트

- [ ] Firebase 도메인 추가 후 SSL 상태가 `CONNECTED`인가
- [ ] DNS TTL을 300초로 낮춰 24시간 이상 지났는가
- [ ] CAA 레코드 충돌이 없는가
- [ ] MX / SPF / DKIM / DMARC는 그대로 보존했는가
- [ ] 기존 A / CNAME 레코드를 **모두 제거**하고 새 IP 2개로만 교체할 준비가 되었는가
- [ ] 옛 Cloud Run / PHP 서버를 48시간 켜둘 수 있는가
- [ ] Cloud Run(`axis-license`)에 `allUsers` invoker 권한이 있는가
- [ ] `firebase.json`의 rewrite `serviceId` / `region`(`asia-northeast3`)이 정확한가
- [ ] `https://license-491102.web.app/`에서 정상 응답이 확인되는가
- [ ] 사용자 공지 / 점검 시간 안내가 필요하면 완료되었는가

이 10개 항목을 통과하면 도메인 전환은 사실상 무중단으로 끝납니다.

### 8-2. 1단계: TXT 레코드 2종 (소유권 + SSL 인증서 발급)

Firebase의 **고급 설정(Advanced Setup)** 흐름에서는 단계 1에서 TXT 레코드를 **두 개** 등록해야 합니다. 하나는 도메인 소유권 확인용이고, 다른 하나는 Let's Encrypt SSL 인증서 발급(ACME DNS-01 challenge)용입니다. **둘 중 하나만 등록하면 검증은 통과돼도 SSL이 발급되지 않아 단계 2 진행 후 사용자에게 보안 경고가 노출됩니다.**

| 구분 | TXT ① 소유권 확인 | TXT ② SSL 인증서 발급 |
|------|-------------------|----------------------|
| 검증 주체 | Firebase Hosting | Let's Encrypt CA |
| 호스트 | `<추가한 도메인>` (예: `license-api.starplayer.net`) | `_acme-challenge.<추가한 도메인>` |
| 값 | `hosting-site=license-491102` | Firebase가 제공하는 임의의 토큰 (영문+숫자 43자 정도) |
| 역할 | "이 도메인은 license-491102 프로젝트의 것" | "ACME challenge 통과 → SSL 발급 진행" |
| 필수 여부 | 필수 | 필수 |
| 등록 후 처리 | 유지 권장 | `CONNECTED` 안정화 후 제거 가능 (권장은 유지) |

#### TXT ① 소유권 확인 등록

Firebase Console 표시:

| 레코드 유형 | 도메인 이름 | 값 |
|-------------|------------|---|
| `TXT` | `license-api.starplayer.net` | `hosting-site=license-491102` |

DNS 등록기관 입력:

| DNS 입력란 | 입력값 |
|------------|--------|
| 타입(Type) | `TXT` |
| 호스트(Host/Name) | 등록기관 방식에 따라 **서브도메인만** (`license-api`) 또는 **풀 네임** (`license-api.starplayer.net`). 루트 도메인은 `@` |
| 값(Value/Content) | `hosting-site=license-491102` (따옴표 없이 그대로) |

#### TXT ② SSL 인증서 발급(ACME) 등록

Firebase Console 표시:

| 레코드 유형 | 도메인 이름 | 값 |
|-------------|------------|---|
| `TXT` | `_acme-challenge.license-api.starplayer.net` | `<Firebase가 제공한 토큰>` |

DNS 등록기관 입력:

| DNS 입력란 | 입력값 |
|------------|--------|
| 타입(Type) | `TXT` |
| 호스트(Host/Name) | **서브도메인 표기** (`_acme-challenge.license-api`) 또는 **풀 네임** (`_acme-challenge.license-api.starplayer.net`) |
| 값(Value/Content) | Console 표시값 그대로 (따옴표 없이) |

> ACME(Automatic Certificate Management Environment)는 Let's Encrypt가 SSL 인증서를 자동 발급할 때 사용하는 표준 프로토콜입니다. DNS-01 challenge는 사용자가 도메인 DNS를 제어할 수 있다는 사실을 `_acme-challenge.<도메인>` TXT 값으로 증명하는 방식입니다. A 레코드를 아직 안 바꾼 상태에서도 SSL을 미리 발급받기 위해 Firebase 고급 설정이 채택하는 방법입니다 — 가이드 [8-1 ⑥](#8-1-기존-운영-도메인-이전-시-주의사항)의 HSTS 우회 불가 보안 경고를 피하는 핵심 수단입니다.

#### 공통 주의사항

> ⚠️ **한국 등록기관(가비아·카페24 등) 흔한 실수**: 풀 네임 `license-api.starplayer.net`을 입력하면 도메인이 자동으로 한 번 더 붙어서 `license-api.starplayer.net.starplayer.net`이 됩니다. 화면 안내에 "도메인 자동 추가됨" 표시가 있으면 **서브도메인 부분만** 입력하세요(`license-api`, `_acme-challenge.license-api`).

> ⚠️ **CAA 레코드 충돌**: 도메인에 CAA 레코드가 있고 Let's Encrypt / Google Trust Services가 허용되어 있지 않으면 ACME 챌린지는 통과해도 **인증서 발급 자체가 실패**합니다. 가이드 [8-1 ③](#8-1-기존-운영-도메인-이전-시-주의사항)을 참고해 사전에 점검하세요.

#### DNS 전파 대기 시간

레코드 추가 후 Firebase가 검증할 수 있을 때까지 일정 시간이 필요합니다.

| 등록기관 / 상황 | 일반적인 전파 시간 | 권장 최소 대기 |
|----------------|------------------|----------------|
| Cloudflare | 1~5분 | **5분** |
| AWS Route53 / Google Domains | 5~15분 | **15분** |
| 가비아 / 카페24 / 후이즈 | 10~30분 | **30분** |
| 네임서버 변경 / 이전 직후 | 1~24시간 | **1~2시간** |

**실무 권장: 두 TXT를 모두 등록한 뒤 최소 30분 ~ 1시간 대기 후 Firebase Console "확인" 클릭.** 너무 일찍 누르면 검증 실패 카운트만 쌓이고 일부 콘솔에서는 잠시 재시도가 제한될 수 있습니다.

#### 직접 확인 (두 TXT 모두 점검)

명령어로 두 TXT 레코드 모두 전파되었는지 확인합니다.

```powershell
# TXT ① 소유권
nslookup -type=TXT license-api.starplayer.net 8.8.8.8

# TXT ② ACME 챌린지 (SSL)
nslookup -type=TXT _acme-challenge.license-api.starplayer.net 8.8.8.8
```

각각 다음과 같이 토큰이 보이면 정상:

```
license-api.starplayer.net  text =
        "hosting-site=license-491102"

_acme-challenge.license-api.starplayer.net  text =
        "<Firebase가 제공한 토큰>"
```

**두 응답 모두 정상**일 때 Firebase Console **"확인"** 클릭. 통과되면 자동으로 SSL 인증서 발급이 진행되고, 완료 후 다음 단계로 넘어갑니다.

> 한 쪽만 응답되고 다른 쪽이 비어 있으면 누락된 TXT를 다시 등록 후 5~10분 더 대기하세요. `nslookup` 응답이 "권한 없는 응답(Non-authoritative answer)"으로 나와도 정상입니다 — 캐시 DNS(8.8.8.8)가 권한 서버에서 받아온 결과를 전달하는 표준 동작입니다.

### 8-3. 2단계: A 레코드 (트래픽 라우팅)

Firebase가 두 개의 IP 주소를 표시합니다(Google Hosting Anycast IP).

| 호스트 | 타입 | 값 | TTL |
|--------|------|---|-----|
| `license-api` | A | Firebase 안내 IP 1 | 기본값 |
| `license-api` | A | Firebase 안내 IP 2 | 기본값 |

> 두 IP 모두 등록해야 고가용성이 확보됩니다.

### 8-4. DNS 전파 확인

```powershell
nslookup license-api.starplayer.net
```

A 레코드가 Firebase가 알려준 IP로 응답하면 정상.

---

## 9. SSL 인증서 발급 및 검증

### 9-1. 발급 대기

- 일반적으로 **15분 ~ 24시간** 소요
- Firebase Console의 도메인 상태가 **"연결됨 (Connected)"** 으로 변경되면 완료

### 9-2. HTTPS 접속 확인

브라우저에서 다음 URL로 접속:

- `https://license-api.starplayer.net`
- `https://license-api.starplayer.net/spauth?license_code=<테스트값>`

자물쇠 아이콘과 함께 정상 응답하면 완료.

---

## 10. 모바일 앱 마이그레이션

### 10-1. 호환성

도메인 변경 후에도 **기존 `*.run.app` URL은 자동으로 유지됩니다.** 구버전 모바일 앱은 별도 작업 없이 계속 동작합니다.

### 10-2. 마이그레이션 정책

| 단계 | 작업 |
|------|------|
| 신규 빌드 | `https://license-api.starplayer.net/spauth?license_code=...` 사용 |
| 기존 빌드 | 기존 `*.run.app` URL 유지 (자동 동작) |
| 충분한 사용자 전환 후 | (선택) 기존 URL 차단 검토 |

> `/api/spauth/`는 모바일 앱이 직접 호출하는 엔드포인트이므로 경로(`/spauth`, `/api/spauth/...`)는 그대로 유지해야 합니다.

### 10-3. 트래픽 분산 효과

마이그레이션 기간 동안 트래픽이 두 경로(`*.run.app` 직접 호출 + Firebase Hosting 경유)로 분산됩니다.

- 기존 모바일 앱 빌드 → `*.run.app` 직접 호출 (Firebase Hosting 사용량에 카운트되지 않음)
- 신규 앱 빌드 → 커스텀 도메인 경유 (Firebase Hosting 사용량에 카운트)

이 프로젝트는 [4-4](#4-4-기존-gcp-프로젝트에-firebase-추가) 설명대로 **Blaze 플랜이 자동 적용**되므로 Spark 한도(360 MB/일) 도달로 인한 서비스 중단 위험은 없습니다. 다만 트래픽이 Firebase Hosting을 경유하기 시작한 시점부터 [2-6 비용표](#2-6-blaze-플랜-예상-비용) 의 종량 과금이 발생하므로 [4-6 예산 알림](#4-6-예산-알림-설정-필수)을 반드시 설정해 두세요.

---

## 11. 운영 팁

### 11-1. Next.js 코드 변경 시

기존과 동일하게 Cloud Run에 배포하면 됩니다. Firebase는 라우팅만 담당하므로 별도 작업 불필요.

```powershell
gcloud run deploy axis-license `
  --source . `
  --region=asia-northeast3 `
  --env-vars-file=.env.production.yaml
```

### 11-2. `firebase.json` 변경 시에만 재배포

라우팅 규칙·헤더·리다이렉트 등을 수정한 경우에만:

```powershell
firebase deploy --only hosting
```

### 11-3. API 캐시 비활성화 (필요 시)

Firebase Hosting의 기본 CDN 캐시가 API 응답에 영향을 주는 경우, `firebase.json`에 헤더 추가:

```json
{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "run": { "serviceId": "axis-license", "region": "asia-northeast3" }
      }
    ],
    "headers": [
      {
        "source": "/api/**",
        "headers": [{ "key": "Cache-Control", "value": "no-store" }]
      },
      {
        "source": "/spauth**",
        "headers": [{ "key": "Cache-Control", "value": "no-store" }]
      }
    ]
  }
}
```

### 11-4. 배포 채널 (스테이징)

운영에 영향 없이 미리 보기용 URL을 발급받을 수 있습니다:

```powershell
firebase hosting:channel:deploy staging
```

### 11-5. 사용량 모니터링 (필수)

[Firebase 사용량 대시보드](https://console.firebase.google.com/project/license-491102/hosting/usage) 에서 다음을 주기적으로 확인:

- 일일 데이터 전송량 추이
- 한도 도달 임박 여부 (Spark 플랜)
- 비정상 트래픽 패턴

Spark 플랜 사용 시 일일 전송량이 **270 MB(75%)** 를 초과하기 시작하면 Blaze 업그레이드를 검토하세요.

### 11-6. 성능 측면

| 항목 | 영향 |
|------|------|
| 추가 레이턴시 | 한국에서 1~5ms (Firebase Edge가 서울/도쿄에 위치) |
| Cold start | 변화 없음 (Cloud Run 측 이슈 그대로) |
| 동시 요청 수 | 제한 없음 |
| WebSocket | 지원 안 함 (현재 프로젝트 미사용) |
| 요청 크기 | 32 MB (FTP 업로드는 직접 처리라 무관) |

성능 자체는 Spark/Blaze 차이 없음.

---

## 12. 트러블슈팅

### 12-1. 임시 URL 접속 시 502/503 오류

- Cloud Run 서비스가 정상 실행 중인지 확인:
  ```powershell
  gcloud run services describe axis-license --region=asia-northeast3
  ```
- `firebase.json`의 `serviceId`, `region` 오타 확인.

### 12-2. SSL 인증서가 24시간 넘게 발급되지 않음

- DNS 전파가 완료되었는지 확인 (`nslookup`).
- TXT 레코드와 A 레코드가 모두 정확히 입력되었는지 재확인.
- Firebase Console에서 도메인을 삭제 후 재등록.

### 12-3. 일부 경로만 404

- `firebase.json`의 `rewrites` `source`가 `**`로 설정되어 있는지 확인.
- Cloud Run에서 해당 경로가 실제로 응답하는지 직접 테스트:
  ```
  https://axis-license-<해시>.asia-northeast3.run.app/<경로>
  ```

### 12-4. 모바일 앱에서 SSL 핸드셰이크 실패

- 일부 구형 모바일 OS는 최신 인증서 체인을 인식하지 못할 수 있음 → 기존 `*.run.app` URL 유지 사용.

### 12-5. CORS 오류

- Cloud Run 측 Next.js API 라우트의 CORS 헤더 확인.
- Firebase Hosting은 헤더를 그대로 전달하므로 CORS 정책은 Next.js 코드에서 제어.

### 12-6. Spark 플랜 한도 초과로 503 발생

> 이 프로젝트(`license-491102`)는 Blaze 자동 적용 상태이므로 일반적으로 발생하지 않습니다. 신규 별도 Firebase 프로젝트를 만든 경우에만 해당.

증상: 평소 정상 동작하던 사이트가 갑자기 503 응답, [Firebase Console](https://console.firebase.google.com/project/license-491102/hosting/usage) 사용량 그래프에서 한도 도달 확인됨.

대응 방안:
1. **즉시 복구**: Blaze 플랜으로 업그레이드 (수 분 내 한도 해제)
2. **임시 우회**: 모바일 앱이 `*.run.app` 직접 URL을 호출하도록 안내
3. **재발 방지**: [11-5 사용량 모니터링](#11-5-사용량-모니터링-필수) 절차 도입

### 12-7. 루트 경로에서 Firebase 환영 페이지가 표시됨

증상: `https://<도메인>/` 또는 `https://license-491102.web.app/` 접속 시 Next.js 앱이 아니라 Firebase 기본 환영 페이지(파란색 로켓 이미지)가 보임.

원인: `firebase init hosting` 시 Firebase가 `public/index.html`을 자동 생성. 정적 파일이 rewrite보다 우선 적용되어 환영 페이지가 서빙됨.

해결:

```powershell
Remove-Item -Path public\index.html -ErrorAction SilentlyContinue
Remove-Item -Path public\404.html -ErrorAction SilentlyContinue
firebase deploy --only hosting
```

배포 후 다시 접속하면 Cloud Run의 Next.js 앱으로 정상 라우팅됩니다.

### 12-8. Blaze 플랜에서 예상보다 비용이 많이 청구됨

- 비정상 트래픽(봇/스크래퍼) 가능성 → Cloud Run 로그에서 IP별 요청 수 확인
- 정적 자원 캐시 헤더 미설정 → [11-3](#11-3-api-캐시-비활성화-필요-시) 참고하여 캐시 가능한 자원에 적절한 `Cache-Control` 추가
- 응답 크기 최적화 (XML/JSON 압축 헤더 확인)

---

## 부록: 빠른 명령어 요약

```powershell
# 초기 1회
npm install -g firebase-tools
firebase login
firebase init hosting

# 배포
firebase deploy --only hosting

# 배포 상태 확인
firebase hosting:sites:list

# 채널(스테이징) 배포
firebase hosting:channel:deploy staging

# Cloud Run 코드 변경 후 (Firebase는 손대지 않음)
gcloud run deploy axis-license --source . --region=asia-northeast3 --env-vars-file=.env.production.yaml
```
