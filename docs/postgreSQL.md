# PostgreSQL 데이터베이스 가이드

## 목차

1. [개요](#1-개요)
2. [데이터베이스 생성](#2-데이터베이스-생성)
3. [Collation 설정 (utf8_ci)](#3-collation-설정-utf8_ci)
4. [테이블 생성](#4-테이블-생성)
5. [코멘트 추가](#5-코멘트-추가)
6. [관리용 명령어](#6-관리용-명령어)
7. [컬럼 구조 요약](#7-컬럼-구조-요약)

---

## 1. 개요

기존 MySQL(utf8mb3_general_ci) 환경에서 PostgreSQL로 마이그레이션한 `spauth` 테이블 구성 가이드입니다.
대소문자 무시(case-insensitive) 비교를 위해 ICU 기반 `utf8_ci` collation을 사용합니다.

---

## 2. 데이터베이스 생성

```sql
CREATE DATABASE spauth
```

---

## 3. Collation 설정 (utf8_ci)

MySQL의 `utf8mb3_general_ci`에 대응하는 ICU collation을 생성합니다.

```sql
CREATE COLLATION utf8_ci (
   provider = icu,
   locale = 'und-u-ks-level2',
   deterministic = false
);
```

---

## 4. 테이블 생성

```sql
CREATE TABLE spauth (
	license_code CHAR(36) NOT NULL DEFAULT '' COLLATE utf8_ci,
	company_name VARCHAR(60) NOT NULL COLLATE utf8_ci,
	service_name VARCHAR(60) NOT NULL COLLATE utf8_ci,
	service_domain VARCHAR(60) NOT NULL COLLATE utf8_ci,
	app_event VARCHAR(120) NOT NULL COLLATE utf8_ci,
	scms_url VARCHAR(120) NULL DEFAULT NULL COLLATE utf8_ci,
	scms_url_v2 VARCHAR(120) NULL DEFAULT NULL COLLATE utf8_ci,
	enable CHAR(1) NOT NULL DEFAULT 'Y' COLLATE utf8_ci,
	mp3_enable CHAR(1) NOT NULL DEFAULT 'N' COLLATE utf8_ci,
	service_icon VARCHAR(100) NULL DEFAULT NULL COLLATE utf8_ci,
	launcher_image VARCHAR(100) NULL DEFAULT NULL COLLATE utf8_ci,
	ptype VARCHAR(12) NOT NULL DEFAULT 'xml',
	regdate VARCHAR(14) NULL DEFAULT NULL COLLATE utf8_ci,
	updated_date VARCHAR(14) NULL DEFAULT NULL COLLATE utf8_ci,
	comment VARCHAR(255) NULL DEFAULT NULL COLLATE utf8_ci,
	spkid VARCHAR(12) NULL DEFAULT NULL,
	spkid_v2 VARCHAR(12) NULL DEFAULT NULL,
	event_required CHAR(1) NULL DEFAULT 'N',
	pc_download_yn CHAR(1) NULL DEFAULT 'N',
	pc_config_url VARCHAR(120) NULL DEFAULT NULL,
	pc_history_url VARCHAR(120) NULL DEFAULT NULL,
	pc_only_online CHAR(1) NULL DEFAULT 'Y',
	pc_watermark_yn CHAR(1) NULL DEFAULT 'Y',
	pc_watermark_interval VARCHAR(9) NULL DEFAULT '60',
	pc_watermark_duration VARCHAR(9) NULL DEFAULT '5',
	pc_site_color VARCHAR(7) NULL DEFAULT '#ff1556',
	PRIMARY KEY (license_code)
);
```

---

## 5. 코멘트 추가

### 5-1. 테이블 코멘트

```sql
COMMENT ON TABLE spauth IS '라이선스 인증 정보';
```

### 5-2. 컬럼 코멘트

```sql
COMMENT ON COLUMN spauth.ptype                 IS '리턴값 파싱방식';
COMMENT ON COLUMN spauth.scms_url_v2           IS 'scms_url v2 url';
COMMENT ON COLUMN spauth.spkid                 IS 'spkid';
COMMENT ON COLUMN spauth.spkid_v2              IS 'multidrm 키';
COMMENT ON COLUMN spauth.event_required        IS 'beginContent 필수 체크 용도(세종사이버대학교, seek-lock, rate-lock 리얼타임 체크를 위해)';
COMMENT ON COLUMN spauth.pc_download_yn        IS 'PC 다운로드 사용여부 Y/N';
COMMENT ON COLUMN spauth.pc_config_url         IS 'starplayer.txt url';
COMMENT ON COLUMN spauth.pc_history_url        IS '수강이력 콜백 url';
COMMENT ON COLUMN spauth.pc_only_online        IS '온라인일때만 사용가능 Y/N';
COMMENT ON COLUMN spauth.pc_watermark_yn       IS '워터마크사용여부';
COMMENT ON COLUMN spauth.pc_watermark_interval IS '워터마크 시간간격';
COMMENT ON COLUMN spauth.pc_watermark_duration IS '워터마크 노출시간';
COMMENT ON COLUMN spauth.pc_site_color         IS '사이트배경값';
```

---

## 6. 관리용 명령어

> 아래 명령어는 데이터가 삭제되므로 주의해서 사용하세요.

```sql
-- 서버 인코딩 확인
SHOW server_encoding;

-- 테이블 삭제
DROP TABLE spauth;

-- 데이터베이스 삭제
DROP DATABASE spauth
```

---

## 7. 컬럼 구조 요약

| 컬럼명 | 타입 | 기본값 | 설명 |
|--------|------|--------|------|
| `license_code` | CHAR(36) | `''` | 라이선스 코드 (PK) |
| `company_name` | VARCHAR(60) | - | 회사명 |
| `service_name` | VARCHAR(60) | - | 서비스명 |
| `service_domain` | VARCHAR(60) | - | 서비스 도메인 |
| `app_event` | VARCHAR(120) | - | 앱 이벤트 |
| `scms_url` | VARCHAR(120) | NULL | SCMS URL |
| `scms_url_v2` | VARCHAR(120) | NULL | scms_url v2 키 |
| `enable` | CHAR(1) | `'Y'` | 사용 여부 |
| `mp3_enable` | CHAR(1) | `'N'` | MP3 사용 여부 |
| `service_icon` | VARCHAR(100) | NULL | 서비스 아이콘 경로 |
| `launcher_image` | VARCHAR(100) | NULL | 런처 이미지 경로 |
| `ptype` | VARCHAR(12) | `'xml'` | 리턴값 파싱방식 |
| `regdate` | VARCHAR(14) | NULL | 등록일시 |
| `updated_date` | VARCHAR(14) | NULL | 수정일시 |
| `comment` | VARCHAR(255) | NULL | 비고 |
| `spkid` | VARCHAR(12) | NULL | spkid |
| `spkid_v2` | VARCHAR(12) | NULL | multidrm 키 |
| `event_required` | CHAR(1) | `'N'` | beginContent 필수 체크 여부 |
| `pc_download_yn` | CHAR(1) | `'N'` | PC 다운로드 사용 여부 |
| `pc_config_url` | VARCHAR(120) | NULL | starplayer.txt URL |
| `pc_history_url` | VARCHAR(120) | NULL | 수강이력 콜백 URL |
| `pc_only_online` | CHAR(1) | `'Y'` | 온라인 전용 여부 |
| `pc_watermark_yn` | CHAR(1) | `'Y'` | 워터마크 사용 여부 |
| `pc_watermark_interval` | VARCHAR(9) | `'60'` | 워터마크 시간간격 (초) |
| `pc_watermark_duration` | VARCHAR(9) | `'5'` | 워터마크 노출시간 (초) |
| `pc_site_color` | VARCHAR(7) | `'#ff1556'` | 사이트 배경색 |
