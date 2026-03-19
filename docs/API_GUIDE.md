# API 사용 방법

## 목차

1. [라이선스 인증 API 비교](#라이선스-인증-api-비교)
2. [요청 예시](#요청-예시)
3. [license_code 유효성 규칙](#license_code-유효성-규칙)
4. [응답 XML 구조](#응답-xml-구조)
5. [/api/spauth 응답 필드 (전체 22개)](#apispauth-응답-필드-전체-22개)
6. [/api/spauth/spauth 응답 필드 (기본 12개)](#apispauthspauth-응답-필드-기본-12개)

---

## 라이선스 인증 API 비교

| 항목 | `spauth.php` | `spauth/spauth.php` |
|---|---|---|
| 요청 URL | `/spauth.php?license_code=` | `/spauth/spauth.php?license_code=` |
| 내부 핸들러 | `api/spauth/index.js` | `api/spauth/spauth.js` |
| Method | `GET` | `GET` |
| Query Param | `license_code` | `license_code` |
| 응답 형식 | `application/xml` | `application/xml` |
| 캐시 | `max-age=7200` (2시간) | `max-age=7200` (2시간) |
| 타임존 | Geo-IP (특정 4개 코드, IPv4/IPv6 지원), 나머지 Asia/Seoul | Asia/Seoul 고정 |
| CDN | `axissoft1.cdn3.cafe24.com/web/images/` | `license.starplayer.net/license/files/` |
| XML 필드 수 | 전체 (22개) | 기본 (12개) |

> URL 매핑은 `next.config.js`의 `rewrites`로 처리합니다.

---

## 요청 예시

```
GET /spauth.php?license_code=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
GET /spauth/spauth.php?license_code=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

---

## `license_code` 유효성 규칙

| 조건 | `error` | `message` |
|---|---|---|
| 파라미터 없음 | `1` | `no parameter.` |
| 대문자·숫자·`-` 외 문자 포함 | `1` | `wrong license_code.` |
| 36자가 아님 | `1` | `wrong license_code length.` |
| DB에 없거나 `enable='N'` | `1` | `no data.` |
| 정상 | `0` | `success` |

---

## 응답 XML 구조

**공통 래퍼**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<response>
  <error>0</error>          <!-- 0: 성공 / 1: 오류 -->
  <message>success</message>
  <!-- 성공 시 아래 데이터 필드 포함 -->
</response>
```

---

## `/api/spauth` 응답 필드 (전체 22개)

| 필드 | 설명 |
|---|---|
| `updated_date` | 최종 수정일시 (YmdHis) |
| `company_name` | 회사명 |
| `service_name` | 서비스명 |
| `service_domain` | 서비스 도메인 URL |
| `service_icon` | 서비스 아이콘 이미지 URL |
| `launcher_image` | 런처 이미지 URL |
| `app_event` | 앱 이벤트 URL |
| `scms_url` | SCMS URL |
| `mp3_enable` | 음원서비스 사용 여부 (Y/N) |
| `enable` | 라이선스 활성 여부 (Y/N) |
| `ptype` | 파싱 타입 (json/xml) |
| `server_time` | 서버 현재 시각 (YmdHis, Geo-IP 타임존 적용) |
| `spkid` | SPKID |
| `pc_download_yn` | PC 다운로더 사용 여부 (Y/N) |
| `pc_config_url` | PC config URL |
| `pc_history_url` | PC 수강이력 URL |
| `pc_only_online` | PC 온라인 전용 여부 (Y/N) |
| `pc_watermark_yn` | PC 워터마크 사용 여부 (Y/N) |
| `pc_watermark_interval` | PC 워터마크 노출 간격 (초) |
| `pc_watermark_duration` | PC 워터마크 노출 시간 (초) |
| `color` | PC 사이트 컬러값 |
| `event_required` | 이벤트 응답 필수 여부 (Y/N) |

---

## `/api/spauth/spauth` 응답 필드 (기본 12개)

| 필드 | 설명 |
|---|---|
| `updated_date` | 최종 수정일시 (YmdHis) |
| `company_name` | 회사명 |
| `service_name` | 서비스명 |
| `service_domain` | 서비스 도메인 URL |
| `service_icon` | 서비스 아이콘 이미지 URL |
| `launcher_image` | 런처 이미지 URL |
| `app_event` | 앱 이벤트 URL |
| `scms_url` | SCMS URL |
| `mp3_enable` | 음원서비스 사용 여부 (Y/N) |
| `enable` | 라이선스 활성 여부 (Y/N) |
| `ptype` | 파싱 타입 (json/xml) |
| `server_time` | 서버 현재 시각 (YmdHis, Asia/Seoul 고정) |


> 테이블 스키마는 [postgreSQL.md](./postgreSQL.md)를 참고하세요.
