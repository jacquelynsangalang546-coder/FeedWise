// Custom request logger: prints method, URL, status code and response time.
// Example: [2026-10-09 15:04:12] POST /api/sales 201 - 42ms
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function statusColor(status) {
  if (status >= 500) return colors.red;
  if (status >= 400) return colors.yellow;
  return colors.green;
}

export default function logger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  // "finish" fires after the response has been sent, so the status code is final.
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const time = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' });
    const color = statusColor(res.statusCode);
    console.log(
      `[${time}] ${colors.cyan}${req.method}${colors.reset} ${req.originalUrl} ` +
        `${color}${res.statusCode}${colors.reset} - ${ms.toFixed(0)}ms`
    );
  });

  next();
}
