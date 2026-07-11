export const INVALID_METHODS = new Set([
  "CONNECT", "TRACE", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS",
]);

export const SQL_INJECTION_PATTERNS = [
  /(\b(union\s+all\s+)?select\b.+?\bfrom\b)/i,
  /(\binsert\s+into\b.*?\bvalues\b)/i,
  /(\bupdate\s+\w+\s+set\b)/i,
  /(\bdelete\s+from\b)/i,
  /(\bdrop\s+table\b)/i,
  /(\bdrop\s+database\b)/i,
  /(\balter\s+table\b)/i,
  /(\bcreate\s+table\b)/i,
  /(\btruncate\s+table\b)/i,
  /(\bexec\b.*?\()/i,
  /(\bexecute\b.*?\()/i,
  /(\bxp_cmdshell\b)/i,
  /(\bsp_executesql\b)/i,
  /(\bpg_sleep\b)/i,
  /(\bwaitfor\s+delay\b)/i,
  /(\bbenchmark\s*\()/i,
  /(\b(select|insert|update|delete)\s+.*?--)/i,
  /('?\s*(or|and)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?\s*(--|#|$))/i,
  /(\bunion\s+.*?select\b)/i,
  /(information_schema)/i,
  /(pg_catalog)/i,
  /(sys\.objects)/i,
  /(\b(load_file|into\s+outfile|into\s+dumpfile)\b)/i,
  /(\b(0x[0-9a-f]{4,})\b)/i,
];

export const XSS_PATTERNS = [
  /<script\b[^>]*>.*?<\/script\b[^>]*>/is,
  /<script\b[^>]*\/?>/i,
  /javascript\s*:/i,
  /\bon\w+\s*=\s*['"]?[^'"]*['"]?/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /onclick\s*=/i,
  /onmouseover\s*=/i,
  /onfocus\s*=/i,
  /onblur\s*=/i,
  /onchange\s*=/i,
  /onsubmit\s*=/i,
  /onreset\s*=/i,
  /onselect\s*=/i,
  /onabort\s*=/i,
  /expression\s*\(/i,
  /<iframe\b/i,
  /<embed\b/i,
  /<object\b/i,
  /<svg\b/i,
  /<img\b[^>]*onerror/i,
  /<link\b[^>]*href\s*=\s*['"]?javascript/i,
  /<style\b[^>]*>.*?<[!/]?style[^>]*>/is,
  /document\.(write|cookie|domain|location)/i,
  /window\.(location|name|status)/i,
  /eval\s*\(/i,
  /String\.fromCharCode/i,
  /<marquee\b/i,
  /vbscript\s*:/i,
  /data\s*:\s*text\/html/i,
  /base64\s*,[^\s]+[A-Za-z0-9+/]{40,}/i,
];

export const COMMAND_INJECTION_PATTERNS = [
  /[;&|]\s*(rm|del|rd|mdkir|mkdir|chmod|chown|wget|curl|bash|sh|cmd|powershell|python|perl|php|node)\s/i,
  /[`$][({]/,
  /\$\(.*?\)/,
  /`.*?`/,
  /\|\s*(cat|less|more|head|tail|grep|find|sort|uniq|wc|diff|tar|gzip|gunzip|zip|unzip)\s/i,
  /;\s*(rm|del|rd|shutdown|reboot|format|mkfs|dd)\s/i,
  /\|\s*(shutdown|reboot|halt|poweroff|init)\s/i,
  /(sudo|su)\s+/,
  /(nslookup|ping|traceroute|tracert)\s+-[a-z]/i,
  />\s*\/dev\/(null|stdin|stdout|stderr|tcp|udp)/i,
  /\/etc\/(passwd|shadow|hosts|sudoers|crontab)/i,
  /(cmd|c powershell|pwsh|bash|sh)\s*\/[cce]/i,
];

export const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\/\.\.\//,
  /\.\.\\\.\.\\/,
  /\.\.%2f\.\./i,
  /\.\.%5c\.\./i,
  /%2e%2e%2f/i,
  /%2e%2e%5c/i,
  /\.\.[/\\]/,
  /~\.\.\//,
  /\.\.\//,
  /\.\.\\/,
  /\.[\\/]\.\s/,
];

export const RCE_PATTERNS = [
  /(require|import)\s*\(/i,
  /process\s*\.\s*(env|argv|exit|kill|chdir|cwd|umask|exec|binding|dlopen)/i,
  /globalThis\s*\./,
  /global\s*\./,
  /Function\s*\(/i,
  /setTimeout\s*\(/i,
  /setInterval\s*\(/i,
  /new\s+Function\s*\(/i,
  /child_process/i,
  /fs\.(readFile|writeFile|unlink|exec|spawn)/i,
  /os\.(exec|spawn)/i,
  /net\.(connect|createConnection)/i,
  /prototype\s*\.\s*pollution/i,
  /__proto__\s*[.=]/i,
  /constructor\s*\.\s*constructor/i,
];

export const MALICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nmap/i,
  /nikto/i,
  /acunetix/i,
  /nessus/i,
  /openvas/i,
  /netsparker/i,
  /burpsuite/i,
  /wpscan/i,
  /dirbuster/i,
  /gobuster/i,
  /wfuzz/i,
  /zap\s*proxy/i,
  /python-requests/i,
  /python-urllib/i,
  /python-httpx/i,
  /go-http-client/i,
  /curl\//i,
  /wget\//i,
  /java\/[\d.]+/i,
  /ruby\/[\d.]+/i,
  /scrapy/i,
  /masscan/i,
  /hydra/i,
  /medusa/i,
  /thc/i,
  /Arachni/i,
  /Mozilla\/4\.0\s*\(compatible;\s*MSIE\s*6\.0/i,
  /Mozilla\/5\.0\s*\(compatible;\s*(Googlebot|Bingbot|Yandex|DuckDuckBot)/i,
];

export const SUSPICIOUS_BOT_PATTERNS = [
  /bot\s*crawler/i,
  /semrush/i,
  /ahrefs/i,
  /majestic/i,
  /rogerbot/i,
  /dotbot/i,
  /mj12bot/i,
  /screaming\s*frog/i,
  /site\s*auditor/i,
  /spider/i,
  /scanner/i,
  /crawler/i,
  /backlink/i,
  /link\s*check/i,
  /html\s*validator/i,
  /css\s*validator/i,
  /feedfetcher/i,
  /feedburner/i,
  /slurp/i,
  /twiceler/i,
  /yandex/i,
  /baidu/i,
  /sogou/i,
  /exabot/i,
  /facebot/i,
  /flipboard/i,
  /pinterest/i,
  /mail\.ru/i,
];

export const PROTO_POLLUTION_PATTERNS = [
  /__proto__/,
  /prototype\s*\[/,
  /constructor\s*\[/,
  /\.__proto__\s*=/,
  /\[['"]__proto__['"]\]/,
];

export function detectMaliciousPayload(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = typeof value === "string" ? value : JSON.stringify(value);
  if (!str) return null;
  const checks: Array<{ patterns: RegExp[]; type: string }> = [
    { patterns: SQL_INJECTION_PATTERNS, type: "sql_injection" },
    { patterns: XSS_PATTERNS, type: "xss" },
    { patterns: COMMAND_INJECTION_PATTERNS, type: "command_injection" },
    { patterns: PATH_TRAVERSAL_PATTERNS, type: "path_traversal" },
    { patterns: RCE_PATTERNS, type: "rce" },
    { patterns: PROTO_POLLUTION_PATTERNS, type: "prototype_pollution" },
  ];

  for (const check of checks) {
    for (const pattern of check.patterns) {
      if (pattern.test(str)) {
        return check.type;
      }
    }
  }
  return null;
}

export function detectMaliciousHeaders(headers: Record<string, string | null>): string | null {
  const ua = headers["user-agent"] || headers["User-Agent"] || "";
  if (ua) {
    for (const pattern of MALICIOUS_USER_AGENTS) {
      if (pattern.test(ua)) {
        return "malicious_user_agent";
      }
    }
  }

  if (ua) {
    for (const pattern of SUSPICIOUS_BOT_PATTERNS) {
      if (pattern.test(ua)) {
        return "suspicious_bot";
      }
    }
  }

  if (headers["x-forwarded-for"]) {
    if (typeof headers["x-forwarded-for"] === "string") {
      const result = detectMaliciousPayload(headers["x-forwarded-for"]);
      if (result) return result;
    }
  }

  const referer = headers["referer"] || headers["Referer"] || "";
  const result = detectMaliciousPayload(referer);
  if (result) return result;

  return null;
}
