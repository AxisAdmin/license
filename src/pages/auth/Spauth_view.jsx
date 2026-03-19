import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Layout from '@/components/Layout';
import { useAppRouter, PATHS } from '@/hooks/useAppRouter';
import { requireAuth } from '@/config/auth';
import { getLicenseDetail } from '@/models/license_pg';

function generateGUID() {
  const hex = () =>
    Math.floor(Math.random() * 65536)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}

const labelCellSx = {
  width: 180,
  backgroundColor: '#f5f5f5',
  fontWeight: 'bold',
  fontSize: 13,
  border: '1px solid #e0e0e0',
  py: 1,
  px: 2,
  verticalAlign: 'middle',
};
const valueCellSx = {
  border: '1px solid #e0e0e0',
  py: 0.8,
  px: 2,
};

function FieldRow({ label, children }) {
  return (
    <TableRow>
      <TableCell component="th" sx={labelCellSx}>{label}</TableCell>
      <TableCell sx={valueCellSx}>{children}</TableCell>
    </TableRow>
  );
}

function YNSelect({ name, defaultValue, options }) {
  return (
    <Select native name={name} defaultValue={defaultValue} size="small" sx={{ fontSize: 13, minWidth: 100 }}>
      {options.map(({ value, label }) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </Select>
  );
}

export default function Register({
  licenseCode,
  mode,
  formData,
  curpage,
  searchid,
  searchtxt,
  showLogout,
  cdnBaseUrl,
  renderTime,
  serverAddr,
  nextVersion,
}) {
  // ── Next.js 훅 ──────────────────────────────────────────────────
  const { toList, deleteItem } = useAppRouter();

  // ── React 훅 ────────────────────────────────────────────────────
  const formRef = useRef(null);
  const [saving, setSaving] = useState(false);

  // ── async 함수 ──────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();

    // 1. 유효성 검사
    if (!formRef.current.reportValidity()) return;
    setSaving(true);

    try {
      // 2. FormData 생성 및 빈 파일 제거
      const fd = new FormData(formRef.current);
      for (const key of ['service_icon', 'launcher_image']) {
        const file = fd.get(key);
        if (file && file.size === 0) {
          fd.delete(key);
        }
      }

      // 3. API 호출 (파일 업로드 + DB 저장)
      const res = await fetch('/api/auth/license', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      const json = await res.json();

      // 4. 결과 처리
      if (json.ok) {
        toList({ page: json.curpage, searchid: json.searchid, searchtxt: json.searchtxt, msg: 'saved' });
      } else {
        alert(json.message || '에러가 발생 했습니다.');
      }
    } finally {
      setSaving(false);
    }
  }

  // ── 일반 함수 ───────────────────────────────────────────────────
  function handleDelete() {
    if (confirm('정말 삭제 하시겠습니까?')) {
      deleteItem({ licenseCode, page: curpage, searchid, searchtxt });
    }
  }

  function handleCancel() {
    toList({ page: curpage, searchid, searchtxt });
  }

  const submitTxt = mode === 'update' ? '수정' : '등록';

  // ── UI ───────────────────────────────────────────────────────────

  return (
    <Layout showLogout={showLogout} renderTime={renderTime} serverAddr={serverAddr} nextVersion={nextVersion}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          라이선스 {submitTxt}
        </Typography>
      </Box>

      <Paper elevation={1} sx={{ overflow: 'hidden' }}>
        <form ref={formRef} onSubmit={handleSubmit} encType="multipart/form-data">
          <input type="hidden" name="curpage" value={curpage} />
          <input type="hidden" name="searchid" value={searchid} />
          <input type="hidden" name="searchtxt" value={searchtxt} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="old_service_icon" value={formData?.service_icon || ''} />
          <input type="hidden" name="old_launcher_image" value={formData?.launcher_image || ''} />

          <Table size="small" sx={{ borderCollapse: 'collapse' }}>
            <TableBody>
              <FieldRow label="라이선스">
                <TextField
                  name="license_code"
                  defaultValue={licenseCode}
                  size="small"
                  fullWidth
                  inputProps={{ maxLength: 36, readOnly: true }}
                  sx={{ '& .MuiInputBase-input': { backgroundColor: '#f5f5f5', fontSize: 13 } }}
                />
              </FieldRow>

              <FieldRow label="회사명">
                <TextField name="company_name" defaultValue={formData?.company_name || ''} size="small" fullWidth required inputProps={{ style: { fontSize: 13 } }} />
              </FieldRow>

              <FieldRow label="서비스명">
                <TextField name="service_name" defaultValue={formData?.service_name || ''} size="small" fullWidth required inputProps={{ style: { fontSize: 13 } }} />
              </FieldRow>

              <FieldRow label="서비스도메인">
                <TextField name="service_domain" defaultValue={formData?.service_domain || ''} size="small" fullWidth required inputProps={{ style: { fontSize: 13 } }} />
              </FieldRow>

              <FieldRow label="APP 이벤트">
                <TextField name="app_event" defaultValue={formData?.app_event || ''} size="small" fullWidth required inputProps={{ style: { fontSize: 13 } }} />
              </FieldRow>

              <FieldRow label="SCMS URL">
                <TextField name="scms_url" defaultValue={formData?.scms_url || ''} size="small" fullWidth inputProps={{ style: { fontSize: 13 } }} />
              </FieldRow>

              <FieldRow label="SCMS URL (V2)">
                <TextField name="scms_url_v2" defaultValue={formData?.scms_url_v2 || ''} size="small" fullWidth inputProps={{ style: { fontSize: 13 } }} />
              </FieldRow>

              <FieldRow label="음원서비스">
                <YNSelect name="mp3_enable" defaultValue={formData?.mp3_enable || 'N'}
                  options={[{ value: 'N', label: '미사용' }, { value: 'Y', label: '사용' }]} />
              </FieldRow>

              <FieldRow label="파싱타입">
                <YNSelect name="ptype" defaultValue={formData?.ptype || 'json'}
                  options={[{ value: 'json', label: 'json' }, { value: 'xml', label: 'xml' }]} />
              </FieldRow>

              <FieldRow label="서비스아이콘">
                <Box>
                  {formData?.service_icon && (
                    <Box sx={{ mb: 1 }}>
                      <a href={`${cdnBaseUrl}${formData.service_icon}`} target="_blank" rel="noopener noreferrer">
                        <img src={`${cdnBaseUrl}${formData.service_icon}`} width={57} height={57} alt="icon"
                          style={{ border: '1px solid #e0e0e0', borderRadius: 4 }} />
                      </a>
                    </Box>
                  )}
                  <input type="file" name="service_icon" accept=".jpg,.jpeg,.png,.gif" />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    gif, jpg, png (1Mb)
                  </Typography>
                </Box>
              </FieldRow>

              <FieldRow label="런처이미지">
                <Box>
                  {formData?.launcher_image && (
                    <Box sx={{ mb: 1 }}>
                      <a href={`${cdnBaseUrl}${formData.launcher_image}`} target="_blank" rel="noopener noreferrer">
                        <img src={`${cdnBaseUrl}${formData.launcher_image}`} width={200} height={73} alt="launcher"
                          style={{ border: '1px solid #e0e0e0', borderRadius: 4 }} />
                      </a>
                    </Box>
                  )}
                  <input type="file" name="launcher_image" accept=".jpg,.jpeg,.png,.gif" />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    gif, jpg, png (1Mb)
                  </Typography>
                </Box>
              </FieldRow>

              <FieldRow label="상태">
                <YNSelect name="enable" defaultValue={formData?.enable || 'Y'}
                  options={[{ value: 'Y', label: '등록' }, { value: 'N', label: '정지' }]} />
              </FieldRow>

              <FieldRow label="코멘트">
                <TextField name="comment" defaultValue={formData?.comment || ''} size="small" fullWidth inputProps={{ style: { fontSize: 13 } }} />
              </FieldRow>

              <FieldRow label="spkid">
                <TextField name="spkid" defaultValue={formData?.spkid || ''} size="small" fullWidth inputProps={{ style: { fontSize: 13 } }} />
              </FieldRow>

              <FieldRow label="spkid (V2)">
                <TextField name="spkid_v2" defaultValue={formData?.spkid_v2 || ''} size="small" fullWidth inputProps={{ style: { fontSize: 13 } }} />
              </FieldRow>

              <FieldRow label="PC다운로더 사용여부">
                <YNSelect name="pc_download_yn" defaultValue={formData?.pc_download_yn || 'N'}
                  options={[{ value: 'N', label: '미사용' }, { value: 'Y', label: '사용' }]} />
              </FieldRow>

              <FieldRow label="PC config url">
                <TextField name="pc_config_url" defaultValue={formData?.pc_config_url || ''} size="small" fullWidth inputProps={{ style: { fontSize: 13 } }} />
              </FieldRow>

              <FieldRow label="PC 수강이력 url">
                <TextField name="pc_history_url" defaultValue={formData?.pc_history_url || ''} size="small" fullWidth inputProps={{ style: { fontSize: 13 } }} />
              </FieldRow>

              <FieldRow label="PC 워터마크 사용여부">
                <YNSelect name="pc_watermark_yn" defaultValue={formData?.pc_watermark_yn || 'Y'}
                  options={[{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }]} />
              </FieldRow>

              <FieldRow label="PC 워터마크 노출간격(초)">
                <TextField name="pc_watermark_interval" type="number" defaultValue={formData?.pc_watermark_interval || ''} size="small" sx={{ width: 120 }} inputProps={{ style: { fontSize: 13 } }} />
              </FieldRow>

              <FieldRow label="PC 워터마크 노출시간(초)">
                <TextField name="pc_watermark_duration" type="number" defaultValue={formData?.pc_watermark_duration || ''} size="small" sx={{ width: 120 }} inputProps={{ style: { fontSize: 13 } }} />
              </FieldRow>

              <FieldRow label="PC 사이트 컬러값">
                <TextField name="pc_site_color" defaultValue={formData?.pc_site_color || ''} size="small" sx={{ width: 120 }} inputProps={{ maxLength: 7, style: { fontSize: 13 } }} />
              </FieldRow>

              <FieldRow label="PC 온라인전용여부">
                <YNSelect name="pc_only_online" defaultValue={formData?.pc_only_online || 'N'}
                  options={[{ value: 'N', label: '미사용' }, { value: 'Y', label: '사용' }]} />
              </FieldRow>

              <FieldRow label="이벤트 응답 필수 여부">
                <YNSelect name="event_required" defaultValue={formData?.event_required || 'N'}
                  options={[{ value: 'N', label: '미사용' }, { value: 'Y', label: '사용' }]} />
              </FieldRow>
            </TableBody>
          </Table>

          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1.5 }}>
            <Box>
              {mode === 'update' && (
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={handleDelete}
                  sx={{ color: '#d32f2f', borderColor: '#d32f2f', '&:hover': { borderColor: '#b71c1c', color: '#b71c1c' } }}
                >
                  삭제
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={handleCancel}
                sx={{ color: '#555', borderColor: '#ccc' }}
              >
                취소
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="small"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
              >
                {saving ? '저장 중...' : submitTxt}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Layout>
  );
}

// ── getServerSideProps (GET 전용 — 페이지 데이터 조회) ─────────────

export async function getServerSideProps({ req, res, query }) {
  const session = await requireAuth(req, res);
  if (!session.isLoggedIn) {
    return { redirect: { destination: '/auth/Spauth_login', permanent: false } };
  }

  const startTime   = Date.now();
  const licenseCode = query.license_code || generateGUID();
  const mode        = query.license_code ? 'update' : 'insert';
  const formData    = mode === 'update' ? (await getLicenseDetail(licenseCode) || {}) : {};

  const renderTime  = ((Date.now() - startTime) / 1000).toFixed(4);
  const serverAddr  = req.socket?.localAddress || '';
  const nextVersion = require('next/package.json').version;

  return {
    props: {
      licenseCode,
      mode,
      formData,
      curpage:    query.page      || '0',
      searchid:   query.searchid  || '',
      searchtxt:  query.searchtxt || '',
      showLogout: session.type === 'manual',
      cdnBaseUrl: process.env.CDN_BASE_URL || 'http://axissoft1.cdn3.cafe24.com/web/images/',
      renderTime,
      serverAddr,
      nextVersion,
    },
  };
}
