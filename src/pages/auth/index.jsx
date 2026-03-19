import { useRef } from 'react';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import Pagination from '@mui/material/Pagination';
import Link from '@mui/material/Link';
import Layout from '@/components/Layout';
import { useFlashMessage } from '@/hooks/useFlashMessage';
import { useAppRouter, buildViewUrl } from '@/hooks/useAppRouter';
import { requireAuth } from '@/config/auth';
import { getLicenseList } from '@/models/license_pg';

const PER_PAGE = 20;

function formatDate(str) {
  if (!str) return '';
  const s = String(str);
  if (s.length === 14) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}`;
  }
  return s;
}

export default function AuthList({
  rows,
  totalRows,
  curpage,
  searchid,
  searchtxt,
  message,
  showLogout,
  renderTime,
  serverAddr,
  nextVersion,
}) {
  useFlashMessage(message);
  const { toList, toView } = useAppRouter();
  const searchidRef = useRef(null);
  const searchtxtRef = useRef(null);

  const totalPages = Math.ceil(totalRows / PER_PAGE);
  const currentPageNum = Math.floor(curpage / PER_PAGE);

  function handleSearch() {
    const txt = searchtxtRef.current?.value || '';
    if (!txt) {
      alert('검색어를 입력하세요.');
      return;
    }
    const id = searchidRef.current?.value || 'license_code';
    toList({ page: 0, searchid: id, searchtxt: txt });
  }

  function handlePageChange(_, page) {
    toList({ page: (page - 1) * PER_PAGE, searchid, searchtxt });
  }

  return (
    <Layout showLogout={showLogout} renderTime={renderTime} serverAddr={serverAddr} nextVersion={nextVersion}>
      {/* 헤더 영역 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          등록된 라이선스
        </Typography>
        <Typography variant="body2" color="text.secondary">
          등록 신청을 한 자료들의 목록 중 상태가 &quot;등록&quot; 인것이 신청 완료가 된 것입니다.
          <br />
          등록 완료가 된 라이선스는 스타플레이어 모바일을 통해 배포를 하실 수 있습니다.
        </Typography>
      </Box>

      {/* 테이블 */}
      <TableContainer component={Paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" width={70}>상태</TableCell>
              <TableCell width={150}>회사명</TableCell>
              <TableCell>서비스명</TableCell>
              <TableCell width={290}>라이선스</TableCell>
              <TableCell width={155}>등록일</TableCell>
              <TableCell width={155}>수정일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.license_code} hover>
                <TableCell align="center">
                  {item.enable === 'Y' ? (
                    <Chip label="등록" size="small" color="primary" variant="outlined" />
                  ) : (
                    <Chip label="정지" size="small" color="default" variant="outlined" />
                  )}
                </TableCell>
                <TableCell>{item.company_name}</TableCell>
                <TableCell>{item.service_name}</TableCell>
                <TableCell>
                  <Link
                    component={NextLink}
                    href={buildViewUrl({ licenseCode: item.license_code, page: curpage, searchid, searchtxt })}
                    underline="hover"
                    color="primary"
                    sx={{ fontSize: 12 }}
                  >
                    {item.license_code}
                  </Link>
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{formatDate(item.regdate)}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{formatDate(item.updated_date)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 검색 + 신규 버튼 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Select
            native
            inputRef={searchidRef}
            name="searchid"
            defaultValue={searchid}
            size="small"
            sx={{ height: 32, fontSize: 13 }}
          >
            <option value="license_code">라이선스</option>
            <option value="service_name">서비스명</option>
            <option value="company_name">회사명</option>
            <option value="service_domain">도메인</option>
            <option value="comment">코멘트</option>
          </Select>
          <TextField
            inputRef={searchtxtRef}
            name="searchtxt"
            defaultValue={searchtxt}
            size="small"
            sx={{ width: 180, '& .MuiInputBase-root': { height: 32 } }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={handleSearch}
            sx={{ height: 32, color: '#555', borderColor: '#ccc' }}
          >
            검색
          </Button>
        </Box>
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={() => toView({ page: curpage })}
          sx={{ height: 32 }}
        >
          신규
        </Button>
      </Box>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={totalPages}
            page={currentPageNum + 1}
            onChange={handlePageChange}
            color="primary"
            size="small"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Layout>
  );
}

export async function getServerSideProps({ req, res, query }) {
  const startTime = Date.now();
  const session = await requireAuth(req, res);
  if (!session.isLoggedIn) {
    return { redirect: { destination: '/auth/Spauth_login', permanent: false } };
  }

  const curpage   = parseInt(query.page || '0');
  const searchid  = query.searchid  || 'license_code';
  const searchtxt = query.searchtxt || '';

  const { data, totalRows } = await getLicenseList({ page: curpage, searchid, searchtxt });

  const msgMap = {
    saved:   '정상 등록 되었습니다.',
    deleted: '삭제 완료 하였습니다.',
    error:   '에러가 발생 했습니다.',
  };

  const renderTime  = ((Date.now() - startTime) / 1000).toFixed(4);
  const serverAddr  = req.socket?.localAddress || '';
  const nextVersion = require('next/package.json').version;

  return {
    props: {
      rows:      data,
      totalRows,
      curpage,
      searchid,
      searchtxt,
      message:     msgMap[query.msg] || null,
      showLogout:  session.type === 'manual',
      renderTime,
      serverAddr,
      nextVersion,
    },
  };
}
