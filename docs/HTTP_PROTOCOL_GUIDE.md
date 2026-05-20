# HTTP 프로토콜 관련 가이드

라이센스 인증 API(`/spauth.php`, `/spauth/spauth.php`)에서 HTTP/HTTPS 프로토콜 및 요청 메소드/Body 처리와 관련된 트러블슈팅 및 인프라 옵션 정리.

> 📘 **용어 안내**: 본 문서의 "**GCP LB**" 또는 "**Load Balancer**"는 GCP Console에서 **"부하 분산"** 으로 표시됩니다. Console UI 경로 및 리소스 한글 명칭 매핑은 [GCP_LB_MIGRATION_GUIDE.md - 용어 안내](./GCP_LB_MIGRATION_GUIDE.md#-용어-안내-gcp-console-명칭-매핑) 참고.

---

## 1. 사건 요약

### 증상
- Android(Retrofit2)에서 `@FormUrlEncoded + @POST("/spauth.php")` 요청 시 응답으로 `<message>no parameter.</message>`만 반환됨.
- GCP Cloud Run 로그에는 해당 요청이 찍히지 않음.
- 동일한 요청을 Postman으로 보내면 정상 동작하고 서버 로그도 정상 출력됨.

### 원인
**Android Retrofit2의 baseUrl이 `http://`로 설정**되어 있었음.

```
Android (http://license.starplayer.net/spauth.php POST + body)
   ↓
Firebase Hosting (HTTP → HTTPS 강제 301 리다이렉트)
   ↓
OkHttp가 301을 따라가면서 RFC 7231 규약에 의해 POST → GET 변환 + body 폐기
   ↓
Cloud Run으로는 빈 GET 요청만 도달 (또는 캐시된 응답으로 처리)
   ↓
"no parameter" 응답
```

### 해결
Android Retrofit2 baseUrl을 `https://`로 변경.

---

## 2. 배포 아키텍처

```
[Client]
   ↓ HTTPS
[Firebase Hosting] (CDN + 캐시 + HTTPS 강제)
   ↓ rewrite (firebase.json)
[Cloud Run: axis-license, asia-northeast3]
   ↓
[Next.js /api/spauth 핸들러]
```

- 모든 HTTP 요청은 Firebase Hosting 엣지에서 **자동 301 리다이렉트**로 HTTPS 강제됨 (비활성화 불가).
- Firebase Hosting은 응답의 `Cache-Control` 헤더에 따라 CDN 캐시 수행.

---

## 3. 왜 Postman은 되고 Retrofit2는 안 됐는가

| 항목 | Postman | Retrofit2 (`http://` baseUrl) |
|---|---|---|
| 사용 프로토콜 | 사용자가 `https://`로 입력 | `http://` |
| Firebase 301 리다이렉트 발생? | ❌ | ✅ |
| POST → GET 변환 | 없음 | 발생 (body 손실) |
| body가 Cloud Run에 도달 | ✅ | ❌ |
| 서버 로그 | 정상 출력 | 출력 안 됨 |

### 핵심: 301/302 vs 307/308
- **301/302**: method 변환 허용 → POST → GET, body 폐기 (HTTP 표준)
- **307/308**: method 보존 → POST 그대로 + body 유지

Firebase Hosting은 301만 사용하며 변경 불가.

---

## 4. Body 파싱 처리 (`src/lib/parseLicenseCode.js`)

여러 Content-Type을 지원하기 위해 공통 헬퍼로 분리.

### 지원 Content-Type
| Content-Type | 처리 방식 |
|---|---|
| `application/json` | raw body 읽고 `JSON.parse` |
| `application/x-www-form-urlencoded` | raw body 읽고 `URLSearchParams` |
| `multipart/form-data` | `formidable`로 파싱 |
| `text/plain` / 헤더 누락 | JSON → key=value 순으로 시도 |
| Query string (`?license_code=`) | 항상 최우선 |

### Next.js 기본 bodyParser 비활성화
multipart/form-data 처리를 위해 두 API 라우트에서 기본 bodyParser를 비활성화함:

```js
// src/pages/api/spauth/index.js
// src/pages/api/spauth/spauth.js
export const config = {
  api: {
    bodyParser: false,
  },
};
```

이유: Next.js 기본 bodyParser는 multipart/form-data를 처리하지 못하며, 활성화된 상태에서는 formidable이 사용할 raw stream이 소비되어 있을 수 있음.

---

## 5. HTTP 프로토콜 허용 옵션 비교

`http://`로 들어와도 정상 처리하려는 경우의 옵션별 비교.

| 옵션 | 방법 | HTTP 수신 | method/body 보존 | 추가 인프라 | 권장도 |
|---|---|---|---|---|---|
| **A. 클라이언트를 `https://`로** | Android baseUrl 수정 | — | — | 없음 | ⭐⭐⭐ |
| **B. OkHttp Interceptor로 자동 변환** | Android에 scheme 변환 인터셉터 추가 | — | — | 없음 | ⭐⭐ |
| **C. GCP LB로 308 method-preserving 리다이렉트** | Firebase 우회, LB에서 308 응답 | ❌ (308만 응답) | ✅ | LB 필요 | ⭐ |
| **D. GCP LB로 HTTP 직접 수신** | Firebase 우회, LB가 HTTP→Cloud Run 포워딩 | ✅ | ✅ | LB 필요 | △ |
| **Firebase 설정만으로 308** | 불가능 | — | — | — | ❌ |

### Firebase Hosting으로는 308 불가
- 자동 HTTP→HTTPS 리다이렉트는 엣지에서 하드코딩된 **301**.
- `firebase.json`의 `redirects.type`은 **301/302만 지원**.
- 어떤 설정으로도 308을 내려보낼 수 없음.

---

## 6. GCP External HTTP(S) Load Balancer 전환 가이드

`http://` 수신이 정말 필요하거나 308 method-preserving 리다이렉트가 필요한 경우.

### 구성도

```
[Client] ── HTTP(80) 또는 HTTPS(443) ──▶ [GCP LB (관리형)]
                                            │
                                            ▼ Serverless NEG
                                       [Cloud Run: axis-license (기존)]
```

- **별도 서버/VM 불필요.** 모두 GCP 관리형 리소스.
- 기존 Cloud Run 서비스 그대로 재사용.
- Firebase Hosting은 같은 도메인에서 분리해야 함.

### 6.1 LB 구성 (gcloud CLI)

도메인 예시: `license.starplayer.net`

```bash
# 1. 고정 외부 IP
gcloud compute addresses create license-lb-ip --global
gcloud compute addresses describe license-lb-ip --global --format="get(address)"

# 2. Serverless NEG (Cloud Run 연결)
gcloud compute network-endpoint-groups create license-neg \
  --region=asia-northeast3 \
  --network-endpoint-type=serverless \
  --cloud-run-service=axis-license

# 3. Backend Service & URL Map
gcloud compute backend-services create license-backend \
  --global --load-balancing-scheme=EXTERNAL_MANAGED

gcloud compute backend-services add-backend license-backend \
  --global \
  --network-endpoint-group=license-neg \
  --network-endpoint-group-region=asia-northeast3

gcloud compute url-maps create license-url-map \
  --default-service license-backend

# 4. HTTP(80) 프록시 — HTTP 요청을 직접 받음
gcloud compute target-http-proxies create license-http-proxy \
  --url-map license-url-map

gcloud compute forwarding-rules create license-http-rule \
  --global \
  --target-http-proxy license-http-proxy \
  --ports 80 \
  --address license-lb-ip \
  --load-balancing-scheme=EXTERNAL_MANAGED

# 5. HTTPS(443) 프록시
gcloud compute ssl-certificates create license-cert \
  --domains=license.starplayer.net \
  --global

gcloud compute target-https-proxies create license-https-proxy \
  --url-map license-url-map \
  --ssl-certificates license-cert

gcloud compute forwarding-rules create license-https-rule \
  --global \
  --target-https-proxy license-https-proxy \
  --ports 443 \
  --address license-lb-ip \
  --load-balancing-scheme=EXTERNAL_MANAGED

# 6. Cloud Run 인그레스 변경
gcloud run services update axis-license \
  --region=asia-northeast3 \
  --ingress=internal-and-cloud-load-balancing
```

### 6.2 308 method-preserving 리다이렉트만 원하는 경우

위 4번(HTTP 프록시)에서 직접 포워딩 대신 URL Map에 308 리다이렉트 규칙을 적용:

```yaml
# url-map yaml
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: PERMANENT_REDIRECT   # 308
  stripQuery: false
```

이 경우 HTTP 요청은 Cloud Run에 도달하지 않고 308만 응답하며, 클라이언트(OkHttp/Retrofit2)가 method+body 보존한 채 HTTPS로 자동 재요청함.

> ⚠️ 308 방식이라도 **첫 HTTP 요청의 body는 네트워크 구간에 평문으로 한 번 흐른다.** 보안 측면에서는 클라이언트가 처음부터 HTTPS로 보내는 게 최선.

### 6.3 도메인 이전 절차

Firebase Hosting에 연결된 커스텀 도메인을 LB로 이전하려면:

#### 사전 준비 (운영 영향 없음)
1. GCP LB 리소스 전부 생성
2. Google-managed SSL 인증서 발급 시도 (도메인이 아직 Firebase IP를 가리키므로 상태는 `PROVISIONING`에서 멈춤)
3. `curl --resolve license.starplayer.net:443:<LB_IP> https://license.starplayer.net/...` 로 LB 동작 사전 검증

#### 컷오버 (다운타임 발생 구간)
4. **Firebase Console > Hosting > 커스텀 도메인 연결 해제** (필수: 안 하면 SSL 발급 충돌)
5. **DNS A 레코드를 LB IP로 변경**
6. DNS TTL 만료 + Google-managed SSL 검증 성공 대기 (보통 15분~30분, 최대 24시간)
7. 인증서 `ACTIVE` 확인 후 정상 서비스 재개

#### 다운타임 최소화 팁
- DNS TTL을 컷오버 전 미리 60~300초로 낮춰두기
- 자체 SSL 인증서를 미리 LB에 적용해 Google-managed cert 발급 대기 회피
- 서브도메인(`api.starplayer.net` 등)으로 먼저 LB 띄워 검증 후 본 도메인 이전

### 6.4 주의사항

| 항목 | 내용 |
|---|---|
| Firebase 동시 연결 | 같은 도메인에 Firebase Hosting과 GCP LB를 **동시에 연결 불가**. SSL 발급 충돌. 컷오버 전 Firebase에서 분리 필요. |
| 비용 | LB는 forwarding rule당 시간 단위 과금(월 약 $18~) + 트래픽 GB당 요금. Firebase Hosting의 무료 티어보다 비쌈. |
| Firebase rewrites | LB로 이전 후 `firebase.json`의 rewrites는 무효. Next.js `next.config.js`의 rewrites는 Cloud Run 내부에서 동작하므로 영향 없음. |
| 보안 | HTTP로 라이센스 코드 전송은 평문 노출 위험. 가능하면 HTTPS만 사용 권장. |

---

## 7. 의사결정 가이드

```
┌──────────────────────────────────────────────────┐
│ HTTP로 들어오는 요청을 처리해야 하는가?           │
└────────────────┬─────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │ 아니요          │ 예
        ▼                 ▼
┌─────────────────┐  ┌──────────────────────────────────┐
│ Firebase 유지   │  │ 클라이언트를 고칠 수 있는가?        │
│ (현 상태 유지)  │  └────────────────┬─────────────────┘
└─────────────────┘                   │
                            ┌─────────┴──────────┐
                            │ 예                 │ 아니요
                            ▼                    ▼
                   ┌─────────────────┐  ┌──────────────────────┐
                   │ baseUrl을       │  │ GCP LB로 전환         │
                   │ https://로 수정 │  │ (308 또는 HTTP 직접)  │
                   └─────────────────┘  └──────────────────────┘
```

---

## 8. 참고: 디버깅 로그

`src/pages/api/spauth/index.js`, `src/pages/api/spauth/spauth.js`에 다음 로그가 추가되어 있음:

```js
const licenseCode = await getLicenseCode(req);
console.info(`[spauth] method=${req.method} | content-type=${req.headers['content-type'] || ''} | license=${licenseCode}`);
```

### 로그로 진단할 수 있는 시나리오

| 증상 | 의미 |
|---|---|
| 로그 자체가 안 찍힘 | 요청이 Cloud Run에 도달하지 못함 (Firebase 캐시 적중 / 리다이렉트로 body 손실 / 다른 서버 타격) |
| `license=null` | body 파싱 실패 또는 license_code 누락 |
| `license=XXXX-...` 정상 출력 + 응답 이상 | 검증/DB 단계 문제 (이어지는 `cache HIT/MISS`, `DB result` 로그로 추적) |
