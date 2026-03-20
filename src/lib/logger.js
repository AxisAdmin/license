import fs from 'fs';
import path from 'path';

/**
 * 로그 파일 작성 유틸리티
 * @param {string} logDir - 로그 파일이 저장될 디렉터리 절대 경로
 * @param {Array<{key: string, value: string}>} entries - 로그에 기록할 키/값 배열
 */
export function writeLog(logDir, entries) {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const now = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const day = String(now.getDate()).padStart(2, '0');
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;

    const ymd = `${year}${String(now.getMonth() + 1).padStart(2, '0')}${day}`;
    const logFile = path.join(logDir, `custom_${ymd}.log`);

    let logText = `[${timestamp} Asia/Seoul] \r\n`;
    for (const entry of entries) {
      if (entry.key) {
        logText += `${entry.key} : ${entry.value}\r\n`;
      } else {
        logText += `${entry.value}\r\n`;
      }
    }
    logText += `\r\n`;

    fs.appendFileSync(logFile, logText, 'utf8');
  } catch (err) {
    console.error('[logger] Failed to write log:', err.message);
  }
}
