import { getLicenseDetail, saveLicense, deleteLicense } from '@/models/license_pg';
import { getNowStr } from '@/utils/date';
import { processUploads, ftpDelete } from '@/pages/api/auth/ftp';
import { delCache } from '@/lib/cache';

/**
 * 라이선스 등록/수정
 * @param {string} mode - 'insert' | 'update'
 * @param {string} licenseCode
 * @param {object} formFields - getField로 추출된 폼 데이터 객체
 * @param {object} files - formidable이 파싱한 파일 객체
 */
export async function saveLicenseInfo(mode, licenseCode, formFields, files) {
  // INSERT 시 중복 체크
  if (mode === 'insert') {
    const existing = await getLicenseDetail(licenseCode);
    if (existing) {
      return { ok: false, message: '이미 등록된 라이선스 코드입니다.' };
    }
  }

  // FTP 업로드
  const uploadData = await processUploads(formFields, files);

  // DB 저장
  const now = getNowStr();
  const setData = {
    company_name:           formFields.company_name           || '',
    service_name:           formFields.service_name           || '',
    service_domain:         formFields.service_domain         || '',
    app_event:              formFields.app_event              || '',
    scms_url:               formFields.scms_url               || '',
    scms_v2_apikey:         formFields.scms_v2_apikey         || '',
    mp3_enable:             formFields.mp3_enable             || 'N',
    enable:                 formFields.enable                 || 'Y',
    ptype:                  formFields.ptype                  || 'json',
    updated_date:           now,
    comment:                formFields.comment                || '',
    spkid:                  formFields.spkid                  || '',
    spkid_v2:               formFields.spkid_v2               || '',
    pc_download_yn:         formFields.pc_download_yn         || 'N',
    pc_config_url:          formFields.pc_config_url          || '',
    pc_history_url:         formFields.pc_history_url         || '',
    pc_only_online:         formFields.pc_only_online         || 'N',
    pc_watermark_yn:        formFields.pc_watermark_yn        || 'Y',
    pc_watermark_interval:  formFields.pc_watermark_interval  || '',
    pc_watermark_duration:  formFields.pc_watermark_duration  || '',
    pc_site_color:          formFields.pc_site_color          || '',
    event_required:         formFields.event_required         || 'N',
    ...uploadData,
  };
  if (mode === 'insert') setData.regdate = now;

  await saveLicense(mode, licenseCode, setData);
  await delCache(licenseCode);

  return { ok: true };
}

/**
 * 라이선스 삭제 (FTP 파일 포함)
 * @param {string} licenseCode
 */
export async function deleteLicenseInfo(licenseCode) {
  const detail = await getLicenseDetail(licenseCode);
  if (detail) {
    if (detail.service_icon) await ftpDelete(detail.service_icon);
    if (detail.launcher_image) await ftpDelete(detail.launcher_image);
  }
  await deleteLicense(licenseCode);
  await delCache(licenseCode);

  return { ok: true };
}
