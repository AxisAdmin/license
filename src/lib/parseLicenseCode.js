// 요청에서 license_code 값을 추출
// Content-Type 헤더를 기준으로 body 파싱 방식을 결정한다.
//
// 지원하는 Content-Type:
//   - application/json
//   - application/x-www-form-urlencoded
//   - multipart/form-data
//   - text/plain (JSON 문자열 또는 key=value 문자열 모두 시도)
//   - 헤더 누락 (text/plain과 동일하게 동작)
//
// multipart/form-data 처리를 위해 호출 측에서 Next.js 기본 bodyParser를
// 비활성화해야 한다:
//   export const config = { api: { bodyParser: false } };
import formidable from 'formidable';

// 요청 본문 스트림을 문자열로 읽어들인다.
// req는 Node.js IncomingMessage(EventEmitter)이므로 Promise로 래핑한다.
function readRequestBodyAsString(request) {
  return new Promise((resolve, reject) => {
    const bodyChunks = [];
    request.on('data', (chunk) => bodyChunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(bodyChunks).toString('utf-8')));
    request.on('error', reject);
  });
}

// multipart/form-data 요청에서 필드값(객체)을 추출한다.
// formidable이 콜백 기반이므로 Promise로 래핑한다.
function parseMultipartFields(request) {
  return new Promise((resolve, reject) => {
    const multipartForm = formidable({ multiples: false });
    multipartForm.parse(request, (err, formFields) => {
      if (err) return reject(err);
      resolve(formFields);
    });
  });
}

// formidable v3는 필드값을 항상 배열로 반환하므로 첫 값만 꺼낸다.
function pickFirstFieldValue(fieldValue) {
  if (Array.isArray(fieldValue)) return fieldValue[0] || null;
  return fieldValue || null;
}

// 문자열 본문에서 license_code를 추출한다.
// JSON → key=value 순으로 시도 (text/plain, 헤더 누락 케이스 대응)
function extractLicenseCodeFromString(bodyString) {
  try {
    const parsedJson = JSON.parse(bodyString);
    if (parsedJson?.license_code) return parsedJson.license_code;
  } catch {
    // JSON이 아니면 무시하고 다음 시도로 넘어감
  }
  return new URLSearchParams(bodyString).get('license_code') || null;
}

export async function getLicenseCode(request) {
  // 1. Query string 우선
  if (request.query?.license_code) {
    return request.query.license_code;
  }

  const contentType = (request.headers['content-type'] || '').toLowerCase();

  // 2. multipart/form-data
  if (contentType.includes('multipart/form-data')) {
    try {
      const formFields = await parseMultipartFields(request);
      return pickFirstFieldValue(formFields.license_code);
    } catch {
      return null;
    }
  }

  // 3. 그 외 Content-Type은 raw body를 직접 읽어 파싱
  let bodyString;
  try {
    bodyString = await readRequestBodyAsString(request);
  } catch {
    return null;
  }
  if (!bodyString) return null;

  // 4. application/json
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(bodyString)?.license_code || null;
    } catch {
      return null;
    }
  }

  // 5. application/x-www-form-urlencoded
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return new URLSearchParams(bodyString).get('license_code') || null;
  }

  // 6. text/plain 또는 Content-Type 누락
  return extractLicenseCodeFromString(bodyString);
}
