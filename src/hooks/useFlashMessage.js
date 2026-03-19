import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

/**
 * alert를 띄운 뒤 URL을 정리하는 커스텀 훅
 *
 * @param {string|null} message      - 표시할 메시지. falsy면 아무것도 하지 않음
 * @param {object}      options
 * @param {string}      options.queryKey     - 현재 URL에서 제거할 query 파라미터 키 (기본값: 'msg')
 * @param {string|null} options.redirectPath - 제공 시 해당 경로로 replace, 없으면 현재 경로에서 queryKey만 제거
 */
export function useFlashMessage(message, { queryKey = 'msg', redirectPath = null } = {}) {
  const router = useRouter();
  const shownRef = useRef(false);

  useEffect(() => {
    if (!message || shownRef.current) return;
    shownRef.current = true;

    alert(message);

    if (redirectPath) {
      router.replace(redirectPath, undefined, { shallow: true });
    } else {
      const { [queryKey]: _, ...rest } = router.query;
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    }
  }, [message]);
}
