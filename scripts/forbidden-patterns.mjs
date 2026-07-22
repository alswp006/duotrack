// 금지 패턴 단일 소스. precheck(high만)·finish-gate(전체)가 공유. 의존성 0(순수 node ESM).
// 각 패턴: { id, confidence, severity, appliesTo(file), message, scan(content)=>[{line,text}] }

function hasAllowMarker(line) {
  return /\/\/\s*gate-allow:/.test(line);
}

function eachLine(content, fn) {
  const out = [];
  content.split("\n").forEach((line, i) => {
    const hit = fn(line, i + 1);
    if (hit) out.push({ line: i + 1, text: line.trim().slice(0, 100) });
  });
  return out;
}

export const PATTERNS = [
  {
    id: "hardcoded-hex",
    confidence: "high",
    severity: "error",
    appliesTo: (f) => /\.(tsx|jsx|css)$/.test(f) && !/granite\.config\./.test(f),
    message: "하드코딩 hex 색상 — var(--adaptive*)/var(--tds-color-*) 사용(다크모드 깨짐). .claude/rules/ui-design.md",
    scan: (c) => eachLine(c, (l) => /#[0-9a-fA-F]{3,8}\b/.test(l) && /(color|background|fill|stroke|border)/i.test(l)),
  },
  {
    id: "viewport-100vh",
    confidence: "high",
    severity: "error",
    appliesTo: (f) => /\.(tsx|jsx|css)$/.test(f),
    message: "100vh — 100dvh 사용(모바일 주소창 보정). .claude/rules/ui-design.md",
    scan: (c) => eachLine(c, (l) => /\b100vh\b/.test(l)),
  },
  {
    id: "external-nav",
    confidence: "high",
    severity: "error",
    appliesTo: (f) => /\.(tsx|jsx|ts)$/.test(f),
    message: "외부 이탈(window.open/location) — openURL SDK 사용(검수 반려). .claude/rules/toss-mini-app.md",
    scan: (c) =>
      eachLine(c, (l) => /window\s*\.\s*open\s*\(|(?:^|[^\w$.])(?:(?:window|self|top|parent|globalThis|document)\s*\.\s*)?location\s*\.\s*(?:href\s*=|assign\s*\(|replace\s*\()/.test(l)),
  },
  {
    id: "fixedbottomcta-nested-button",
    confidence: "high",
    severity: "error",
    appliesTo: (f) => /\.(tsx|jsx)$/.test(f),
    message:
      "FixedBottomCTA/BottomCTA/CTAButton 안에 <Button> 중첩(button>button 무효 HTML) — children에 라벨 직접 또는 SubmitFooter. .ai-factory/tds-patterns.md Pattern 9",
    scan: (c) => {
      const out = [];
      const re = /<(FixedBottomCTA|BottomCTA|CTAButton)\b(?:(?!<\/\1>)[\s\S])*?<Button\b(?:(?!<\/\1>)[\s\S])*?<\/\1>/g;
      let m;
      while ((m = re.exec(c)) !== null) {
        out.push({ line: c.slice(0, m.index).split("\n").length, text: m[0].split("\n")[0].trim().slice(0, 80) });
      }
      return out;
    },
  },
  {
    id: "textfield-no-placeholder",
    confidence: "medium",
    severity: "warn",
    appliesTo: (f) => /\.(tsx|jsx)$/.test(f),
    message: "TextField placeholder 없음 — box/line variant는 빈 칸에서 라벨이 숨어 빈 박스가 됨.",
    scan: (c) => {
      const out = [];
      const re = /<TextField\b([\s\S]*?)\/?>/g;
      let m;
      while ((m = re.exec(c)) !== null) {
        if (!/placeholder\s*=/.test(m[1])) {
          out.push({ line: c.slice(0, m.index).split("\n").length, text: m[0].split("\n")[0].trim().slice(0, 80) });
        }
      }
      return out;
    },
  },
  {
    id: "raw-loading-text",
    confidence: "medium",
    severity: "warn",
    appliesTo: (f) => /\.(tsx|jsx)$/.test(f),
    message: "맨텍스트 로딩/빈상태 — LoadingState/EmptyState(StateView) 사용.",
    scan: (c) =>
      eachLine(c, (l) => /(불러오는\s*중|데이터가?\s*없|로딩\s*중)/.test(l) && !/EmptyState|LoadingState|Skeleton/.test(l)),
  },
];

/**
 * @param {string} content
 * @param {string} filePath  레포 기준 또는 임의 식별자(확장자로 appliesTo 판정)
 * @param {{minConfidence?: "high"}} [opts]  "high"면 high 패턴만
 * @returns {Array<{patternId,line,text,message,confidence,severity}>}
 */
export function scanContent(content, filePath, opts = {}) {
  const onlyHigh = opts.minConfidence === "high";
  const lines = content.split("\n");
  const out = [];
  for (const p of PATTERNS) {
    if (onlyHigh && p.confidence !== "high") continue;
    if (!p.appliesTo(filePath)) continue;
    for (const v of p.scan(content)) {
      if (hasAllowMarker(lines[v.line - 1] ?? "")) continue;
      out.push({ patternId: p.id, line: v.line, text: v.text, message: p.message, confidence: p.confidence, severity: p.severity });
    }
  }
  return out;
}
