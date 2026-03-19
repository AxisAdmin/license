import { useRouter } from 'next/router';

// ─── 경로 상수 ────────────────────────────────────────────────
export const PATHS = {
  LOGIN: '/auth/Spauth_login',
  LIST:  '/auth',
  VIEW:  '/auth/Spauth_view',
};

// ─── URL 빌더 (컴포넌트 내 href 등에서 직접 import 가능) ────────
export function buildListUrl({ page = 0, searchid = '', searchtxt = '', msg = '' } = {}) {
  const params = new URLSearchParams({ page, searchid, searchtxt });
  if (msg) params.set('msg', msg);
  return `${PATHS.LIST}?${params.toString()}`;
}

export function buildViewUrl({ licenseCode = '', page = 0, searchid = '', searchtxt = '' } = {}) {
  const params = new URLSearchParams({ page, searchid, searchtxt });
  if (licenseCode) params.set('license_code', licenseCode);
  return `${PATHS.VIEW}?${params.toString()}`;
}

// ─── 라우터 훅 ────────────────────────────────────────────────
export function useAppRouter() {
  const router = useRouter();

  return {
    /** 
     * 로그인 페이지로 이동 
     */
    toLogin: () => router.push(PATHS.LOGIN),

    /** 
     * 목록 페이지로 이동 (page / searchid / searchtxt / msg 옵션) 
     */
    toList: (params) => router.push(buildListUrl(params)),

    /** 
     * 등록/수정 페이지로 이동 (licenseCode / page / searchid / searchtxt 옵션) 
     */
    toView: (params) => router.push(buildViewUrl(params)),

    /** 
     * 로그아웃 처리 후 로그인 페이지로 이동 
     */
    logout: async () => {
      try {
        await fetch('/api/auth/logout');
      } catch (err) {
        console.error('[logout] fetch failed:', err.message);
      }
      router.push(PATHS.LOGIN);
    },

    /**
     * 라이선스 삭제 후 목록으로 이동
     */
    deleteItem: async ({ licenseCode, page = 0, searchid = '', searchtxt = '' } = {}) => {
      try {
        const res = await fetch('/api/auth/license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', license_code: licenseCode }),
        });
        const json = await res.json();
        router.push(buildListUrl({ page, searchid, searchtxt, msg: json.ok ? 'deleted' : 'error' }));
      } catch (err) {
        console.error('[deleteItem] fetch failed:', err.message);
        alert('삭제 요청에 실패했습니다. 네트워크 상태를 확인해주세요.');
      }
    },
  };
}
