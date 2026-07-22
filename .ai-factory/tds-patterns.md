# TDS Layer 1 Pattern Library

실제 출시 토스 미니앱(`with-contacts-viral`)에서 추출한 재사용 가능한 UI/UX 패턴 + 팩토리 Pre-built 컴포넌트 사용 패턴.

이 파일은 AI 코딩 에이전트가 새 페이지를 설계할 때 **레퍼런스로 우선 참조**해야 합니다. 패턴이 맞지 않으면 새로 만들지 말고 가장 가까운 패턴을 변형하세요. tds-essential.txt와 충돌 시 tds-essential.txt가 우선 (검증된 d.ts 기반).

> **먼저 — 골든 조합 (베끼지 말고 import)**: 새 페이지는 `src/components/`의 Pre-built 컴포넌트로 시작하라.
> `ScreenScaffold`(= PageShell + 헤더 슬롯 + 본문 + 하단 CTA 슬롯) 안에 `<Top/>`(top) + 본문을 `Card`로 묶고, 1차 액션은 `SubmitFooter`(단일) 또는 `ButtonStack`(1·2차) — 둘 다 `display="block"`(전체폭) 내장.
> 아래 Pattern들은 그 컴포넌트의 내부 구현 레퍼런스다. **단독/1차 Button은 반드시 `display="block"`** — TDS Button 기본 display는 `inline`(글자폭·좌측정렬)이라 안 주면 깨진다.

---

## Pattern 1 — 페이지 SafeArea 래퍼

**언제**: 모든 페이지의 최상위 컨테이너로. TDSMobileAITProvider가 자동으로 `--toss-safe-area-*` CSS 변수를 주입하지만, 페이지마다 일관된 outer padding을 원할 때 한 번 더 감싸는 패턴.

```tsx
import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        paddingTop: 'calc(var(--toss-safe-area-top) + 16px)',
        paddingBottom: 'calc(var(--toss-safe-area-bottom) + 16px)',
        backgroundColor: 'var(--adaptiveBackground)',
      }}
    >
      {children}
    </div>
  );
}
```

**핵심**: `100dvh` (NOT `100vh`), `calc(var(--toss-safe-area-*) + N)` 패턴.

---

## Pattern 2 — Top + 우측 액션 (BottomSheet 트리거)

**언제**: 페이지 헤더 우측에 설정/필터/메뉴 같은 보조 액션이 필요할 때. AlertDialog가 아닌 BottomSheet 권장 (모바일 UX).

```tsx
import { Top, IconButton, BottomSheet } from '@toss/tds-mobile';
import { useState } from 'react';

export function HeaderWithSettings() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Top
        title={<Top.TitleParagraph>PAGE_TITLE</Top.TitleParagraph>}
        right={
          <IconButton
            aria-label="설정"
            name="iconSettingRegular"
            onClick={() => setOpen(true)}
          />
        }
      />
      <BottomSheet open={open} onClose={() => setOpen(false)} title="설정">
        {/* content */}
      </BottomSheet>
    </>
  );
}
```

**핵심**: Top의 `right` prop, IconButton의 `aria-label` 필수 (접근성), BottomSheet의 `open + onClose` 직접 관리.

---

## Pattern 3 — 상태 요약 패널 (아이콘 + 값)

**언제**: 페이지 상단에 핵심 지표 2~3개를 가로로 나열할 때 (스코어, 잔여 횟수, 진행률 등).

```tsx
import { Asset, Paragraph } from '@toss/tds-mobile';

interface StatusPanelProps {
  items: Array<{ icon: string; label: string; value: string | number }>;
}

export function StatusPanel({ items }: StatusPanelProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        padding: '12px 16px',
        backgroundColor: 'var(--adaptiveLayeredBackground)',
        borderRadius: 12,
      }}
    >
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Asset.ContentIcon name={item.icon} alt={item.label} style={{ width: 24, height: 24 }} />
          <Paragraph.Text typography="t5">{item.value}</Paragraph.Text>
        </div>
      ))}
    </div>
  );
}
```

**핵심**: `Asset.ContentIcon` (CDN 아이콘), 24px 표준, `var(--adaptiveLayeredBackground)` 카드 색상.

---

## Pattern 4 — 라디오 선택 다이얼로그

**언제**: 사용자가 옵션 N개 중 하나를 골라야 할 때. AlertDialog 대신 useDialog 사용 (declarative).

```tsx
import { useDialog, Checkbox, Paragraph, Spacing } from '@toss/tds-mobile';
import { useState } from 'react';

interface Option { value: string; label: string }

export function useOptionPicker(options: Option[], initial: string) {
  const dialog = useDialog();
  const [selected, setSelected] = useState(initial);

  const open = async () => {
    const ok = await dialog.openConfirm({
      title: '옵션을 선택해주세요',
      description: (
        <div>
          {options.map((opt) => (
            <Checkbox.Circle
              key={opt.value}
              inputType="radio"
              checked={selected === opt.value}
              onChange={() => setSelected(opt.value)}
            >
              {opt.label}
            </Checkbox.Circle>
          ))}
        </div>
      ),
      confirmButton: '확인',
      cancelButton: '취소',
    });
    return ok ? selected : null;
  };

  return { open, selected };
}
```

**핵심**: `Checkbox.Circle` + `inputType="radio"` (실제 검증됨), `useDialog().openConfirm()` boolean 반환.

---

## Pattern 5 — 인터랙티브 그리드 (햅틱 피드백)

**언제**: 셀/타일 그리드에서 각 탭마다 햅틱 피드백을 주고 싶을 때 (게임, 선택 UI 등).

```tsx
import { generateHapticFeedback } from '@apps-in-toss/web-framework';

interface GridItem { id: string; content: React.ReactNode }

interface InteractiveGridProps {
  items: GridItem[];
  cols: number;
  onTap: (id: string) => void;
}

export function InteractiveGrid({ items, cols, onTap }: InteractiveGridProps) {
  const handleTap = (id: string) => {
    generateHapticFeedback({ type: 'tickWeak' });
    onTap(id);
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 8,
        padding: '0 16px',
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => handleTap(item.id)}
          style={{
            aspectRatio: '1',
            border: 'none',
            borderRadius: 12,
            backgroundColor: 'var(--adaptiveLayeredBackground)',
            cursor: 'pointer',
          }}
        >
          {item.content}
        </button>
      ))}
    </div>
  );
}
```

**핵심**: `generateHapticFeedback({ type: 'tickWeak' })` 셀 탭 / `'success'` 주요 CTA. CSS Grid + aspect-ratio. raw `<button>` 사용 OK (TDS Button은 텍스트 중심이라 그리드 셀에 부적합).

---

## Pattern 6 — 하단 고정 CTA (FixedBottomCTA)

**언제**: 페이지 1차 액션을 화면 하단에 고정 노출. 폼 제출, 결제, 다음 단계 진행 등.

```tsx
import { FixedBottomCTA } from '@toss/tds-mobile';

interface SubmitFooterProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function SubmitFooter({ label, onClick, disabled }: SubmitFooterProps) {
  // FixedBottomCTA는 그 자체가 <button> — 안에 Button을 또 넣으면 button>button(무효 HTML).
  return (
    <FixedBottomCTA onClick={onClick} disabled={disabled}>
      {label}
    </FixedBottomCTA>
  );
}
```

**핵심**: `FixedBottomCTA`는 **그 자체가 `<button>`**(.d.ts: `HTMLButtonElement` ref, safe-area+그라데이션 자동) — 안에 `<Button>`을 또 넣으면 `<button><button>`(무효 HTML). children에 라벨을 직접. 2개 버튼은 `FixedBottomCTA.Double` 또는 Pattern 8.

---

## Pattern 7 — 일시 오버레이 애니메이션 (Portal)

**언제**: 액션 성공 시 화면 중앙에 잠깐 보였다 사라지는 피드백 (하트, 별, 체크 등).

**준비**: `index.html`에 `<div id="overlay" />` 추가 필요.

```tsx
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface OverlayProps {
  src: string;
  durationMs?: number;
}

export function useOverlayPulse({ src, durationMs = 900 }: OverlayProps) {
  const [tick, setTick] = useState(0);
  const [visible, setVisible] = useState(false);

  const pulse = useCallback(() => {
    setTick((t) => t + 1);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(id);
  }, [visible, tick, durationMs]);

  const portal = (() => {
    if (!visible) return null;
    const target = document.getElementById('overlay');
    if (!target) return null;
    return createPortal(
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      >
        <img src={`${src}?v=${tick}`} alt="" style={{ width: 120, height: 120 }} />
      </div>,
      target,
    );
  })();

  return { pulse, portal };
}
```

**핵심**: APNG/GIF는 종료 이벤트 없음 → 타이머로 자동 숨김. `?v=${tick}` URL 캐시 우회로 같은 이미지 재재생 가능. `pointer-events: none`로 클릭 통과.

---

## Pattern 8 — 하단 버튼 컨테이너 (2개 이상 CTA)

**언제**: 1차/2차 CTA가 함께 있을 때 (예: "다시 시도" + "처음으로"). FixedBottomCTA는 단일 버튼용.

```tsx
import { Button, Spacing } from '@toss/tds-mobile';

interface ButtonStackProps {
  primary: { label: string; onClick: () => void; disabled?: boolean };
  secondary?: { label: string; onClick: () => void };
}

export function ButtonStack({ primary, secondary }: ButtonStackProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 16px calc(var(--toss-safe-area-bottom) + 12px)',
        backgroundColor: 'var(--adaptiveBackground)',
      }}
    >
      <Button variant="fill" onClick={primary.onClick} disabled={primary.disabled} display="block">
        {primary.label}
      </Button>
      {secondary && (
        <Button variant="weak" onClick={secondary.onClick} display="block">
          {secondary.label}
        </Button>
      )}
    </div>
  );
}
```

**핵심**: `display="block"` (전체 너비), safe-area 하단 패딩, primary는 `fill` / secondary는 `weak`. Spacing 컴포넌트 대신 flex `gap` (TDS는 플렉스 gap 권장).

---

## Pattern 9 — 버튼 중첩 금지 (FixedBottomCTA 함정) + 행 액션

⚠️ **진짜 함정 — `<button>` 안에 `<button>`(무효 HTML + validateDOMNesting)**:
TDS `FixedBottomCTA`/`BottomCTA`/`CTAButton`은 **그 자체가 `<button>`**이다(.d.ts: `HTMLButtonElement` ref). 안에 또 `<Button>`을 넣으면 `<button><button>` — 무효 HTML(검수/접근성 문제). 실제 출시앱에서 이 조합이 validateDOMNesting 경고를 냈다.

```tsx
// ❌ button > button (무효)
<FixedBottomCTA><Button variant="fill">저장</Button></FixedBottomCTA>
// ✅ FixedBottomCTA가 버튼이다 — children에 라벨 직접 (= SubmitFooter)
<FixedBottomCTA onClick={onSave} disabled={!valid}>저장</FixedBottomCTA>
// ✅ 2개 버튼 → FixedBottomCTA.Double 또는 커스텀 div+Button (Pattern 8 = ButtonStack)
```

**행 액션(삭제 등)**: `ListRow`에 `onClick`을 주면 `<li role="button">`로 렌더된다 — 내부 `<button>`(IconButton/TextButton)은 `<li><button>`이라 **무효 HTML이 아니다**(validateDOMNesting 안 남). 다만 '클릭 가능한 행 + 내부 클릭 버튼'은 접근성·탭타겟이 모호하니, 보조 액션은 행 onClick 없이 `right` 슬롯 IconButton으로 두길 권장.

```tsx
// 권장: 행은 비클릭 + 보조 액션은 right 슬롯 IconButton
<ListRow
  contents={<ListRow.Texts type="2RowTypeA" top={item.title} bottom={item.subtitle} />}
  right={<IconButton aria-label="삭제" name="iconTrashRegular" onClick={() => remove(item.id)} />}
/>
```

**핵심**: `<button>`을 렌더하는 컴포넌트(FixedBottomCTA/CTA류)를 다른 button 안에 넣지 마라(진짜 무효 HTML). 행 내부 액션은 right 슬롯 IconButton(a11y).

---

## Pattern 10 — 빈 상태 / 로딩 상태 (StateView)

**언제**: 목록/결과가 비었거나 로딩 중일 때. 맨텍스트("불러오는 중", "데이터 없음") 금지 — 휑하고 미완성처럼 보인다.

```tsx
import { EmptyState, LoadingState } from "../components/StateView";

{loading && <LoadingState rows={4} />}
{!loading && items.length === 0 && (
  <EmptyState
    title="아직 항목이 없어요"
    description="첫 항목을 추가해 보세요"
    action={<Button variant="weak" display="block" onClick={start}>시작하기</Button>}
  />
)}
```

**핵심**: 로딩은 `LoadingState`(TDS Skeleton n줄), 빈 상태는 `EmptyState`(아이콘+설명+보조 CTA). EmptyState의 action은 **보조 액션(weak)** — 하단 고정 1차 CTA(SubmitFooter)와 같은 라벨·액션을 중복 노출하지 마라(비활성 버튼 중복 = 군더더기).

---

## Pattern 11 — 데이터/결과 화면 풍부함 (조건부 — 단순 유틸리티엔 생략)

**언제**: 결과/대시보드처럼 *숫자가 핵심 가치*인 화면. "정렬은 맞지만 휑한" 느낌을 없앤다.
⚠️ 단순 유틸리티/설정 화면엔 쓰지 마라 — 장식을 위한 장식은 오히려 조악해 보인다(데이터에 의미가 있을 때만).

```tsx
import { SummaryHero } from "../components/SummaryHero";
import { CountUp } from "../components/CountUp";
import { Sparkline } from "../components/Sparkline";
import { MiniBar } from "../components/MiniBar";
import { Card } from "../components/Card";
import { Paragraph, Spacing } from "@toss/tds-mobile";

// 핵심 숫자 = CountUp 히어로(0→값 카운트업, reduced-motion 자동)
<SummaryHero label="절감액" value={<CountUp value={415268} unit="원" typography="t1" />} caption="이 전략으로 덜 내요" testId="result-hero" />
<Spacing size={16} />
// 추이 데이터 = Sparkline(인라인 SVG — 차트 라이브러리 없이)
<Card testId="balance-trend">
  <Paragraph.Text typography="st11">잔액 추이</Paragraph.Text>
  <Spacing size={8} />
  <Sparkline data={[10000000, 8200000, 6100000, 3500000, 0]} />
</Card>
<Spacing size={12} />
// 비율 = MiniBar(상환 진행률 등)
<Card testId="progress">
  <Paragraph.Text typography="st11">상환 진행률 65%</Paragraph.Text>
  <Spacing size={8} />
  <MiniBar ratio={0.65} />
</Card>
```

**핵심**: 숫자 앵커=CountUp, 추이=Sparkline, 비율=MiniBar — 전부 의존성 0(에셋·차트 라이브러리 불필요). 일러스트/캐릭터는 파이프라인이 생성 못 하므로 빈 상태 아이콘은 Asset.ContentIcon으로 대체.

---

## 패턴 적용 가이드

1. **새 페이지 생성 시**: Pattern 1(PageShell) + Pattern 2(Top) + Pattern 6/8(하단 CTA) 조합이 골든.
2. **모달이 필요할 때**: Pattern 4(라디오) 또는 Pattern 2(BottomSheet)
3. **상호작용 강화**: Pattern 5(햅틱) + Pattern 7(오버레이 펄스)
4. **상태 표시**: Pattern 3(StatusPanel) / 핵심 숫자 앵커는 `SummaryHero`(`src/components`), 금액은 `Amount`(줄바꿈 방지)
5. **버튼 중첩 / 행 액션**: Pattern 9 (FixedBottomCTA는 자체가 button — 안에 Button 넣지 마라. 행 액션은 right 슬롯)
6. **빈/로딩 상태**: Pattern 10 (StateView — 맨텍스트 금지)
7. **하단 탭 네비**: `FloatingTabBar`(`src/components`) — 'TDS TabBar'는 없음, 활성탭=컬러 틴트
8. **데이터/결과 풍부함(조건부)**: Pattern 11 (CountUp 히어로 / Sparkline 추이 / MiniBar 비율 — 단순 유틸리티엔 생략)

## 다루지 않은 영역

- 결제 흐름 (`createOneTimePurchaseOrder` 패턴)
- 리워드 광고 게이트 (`loadFullScreenAd`/`showFullScreenAd`)
- 실시간/소켓 통신
- 딥링크 / Storage 공유
- AI 결과 노출 (생성형 AI 고지 의무 — 기존 `toss-mini-app.md` 참조)

이 영역들은 별도 레퍼런스/룰 파일에서 다룹니다.

---

## 레퍼런스 페이지 (골든 조합 — 새 페이지 복제 시작점)

아래는 Pre-built 컴포넌트(`ScreenScaffold`/`Card`/`SubmitFooter`)를 조합한 완성 페이지 골격이다. 새 페이지는 이 구조를 복제하라(맨 div 골격 금지).

```tsx
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing } from "@toss/tds-mobile";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { Card } from "../components/Card";
import { Amount } from "../components/Amount";
import { SummaryHero } from "../components/SummaryHero";
import { SubmitFooter } from "../components/BottomCTA";

export default function Result() {
  const navigate = useNavigate();
  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>결과</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="다시 시뮬레이션" onClick={() => navigate("/simulate")} />}
    >
      {/* 시각 앵커: 핵심 숫자를 SummaryHero로 크게(t1). 금액은 Amount(nowrap — 좁은 폭 줄바꿈 방지) */}
      <SummaryHero
        label="절감액"
        value={<Amount value={260000} unit="원" typography="t1" />}
        caption="이 전략으로 덜 내요"
        testId="result-hero"
      />
      <Spacing size={16} />
      {/* 핵심 정보는 raw div가 아니라 Card로 묶어 위계를 만든다 */}
      <Card style={{ marginBottom: 12 }} testId="strategy-card">
        <Paragraph.Text typography="st11">눈덩이 전략</Paragraph.Text>
        <Amount value={1480861} unit="원" typography="t3" />
      </Card>
      <Card testId="strategy-card">
        <Paragraph.Text typography="st11">원리금 전략</Paragraph.Text>
        <Amount value={1740861} unit="원" typography="t3" />
      </Card>
    </ScreenScaffold>
  );
}
```

핵심: 골격=ScreenScaffold, 1차 액션=SubmitFooter(전체폭 자동), 핵심 숫자=SummaryHero(앵커)+Amount(줄바꿈 방지), 핵심 정보=Card(위계). raw div + 맨 Paragraph 나열 금지.
