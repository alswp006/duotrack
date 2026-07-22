import { Top, Paragraph, Spacing, ListRow, Button } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { Card } from '../components/Card';

/**
 * Golden Home page — 대시보드/탭-루트 골든 레퍼런스.
 *
 * 다른 페이지를 쓸 때 이 패턴을 모방하라:
 * - ScreenScaffold로 감싼다(raw fragment 골격 금지) — safe-area + 100dvh 자동 처리.
 * - 화면 최상단에 SummaryHero로 시각 앵커를 만든다('휑함'의 가장 큰 원인은 앵커 부재).
 *   데이터가 있으면 value에 <Amount value={n} unit="원" typography="t1" />로 핵심 숫자를 크게 박아라.
 * - 1차 진입 액션은 SummaryHero 카드 내부 버튼(display="block", 전체폭)에 둔다.
 *   → 화면 중앙 부유/좌측 글자폭 버튼 금지. 하단 TabBar가 있으면 SubmitFooter와 겹치므로 카드 안에.
 * - 핵심 정보는 raw <div>가 아니라 Card로 묶어 위계를 만든다.
 * - 하단 탭이 필요하면(2~5탭): bottom={<FloatingTabBar items={[{label,path}...]} />}.
 *   ('TDS TabBar'는 존재하지 않는다 — 직접 만들지 말고 FloatingTabBar를 써라.)
 * - 카피는 CLAUDE.md "카피 규칙 — AI 냄새 금지"를 따른다: 기능 나열식 홍보 문구·상투구·
 *   generic 버튼("시작하기") 금지. 이 파일의 예시 문구도 앱 맥락에 맞게 교체 대상이다.
 *
 * Scaffold tokens (replaced by scaffold-toss.ts at project creation):
 *   DuoTrack -> the app's display name
 *   국내 어학 앱 사용자의 최대 불만인 '광고 중단 + 학습 흐름 파괴' 문제와 Duolingo식 게임화의 낮은 실력 향상 효과에 지친 학습자들을 위해, 광고 없는 집중 학습 + 실제 시험(토익·오픽) 점수 연동 트래킹으로 '학습 ROI'를 증명해주는 영어 학습 성과 관리 앱    -> the one-line description
 */

// 사용자가 이 화면에서 실제로 확인할 정보 — 데이터가 사는 행으로 표현.
const HIGHLIGHTS = [
  { title: '오늘', description: '아직 기록이 없어요' },
  { title: '이번 주', description: '기록 3건 · 평균 12분' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>DuoTrack</Top.TitleParagraph>} />}
    >
      {/* 시각 앵커: 짧은 헤드라인(1~2줄) + 서브텍스트(작은 폰트) + 카드 내 진입 버튼.
          Top에 이미 브랜드명이 있으므로 카드 label은 브랜드명과 중복되지 않는 기능 라벨로. */}
      <SummaryHero
        label="토익·오픽 점수 트래킹"
        value={<Paragraph.Text typography="t2">광고 없이 집중 학습, 실제 점수로 확인해요</Paragraph.Text>}
        caption="토익·오픽 점수와 학습 기록을 연결해 성장을 추적해요"
        action={
          <Button variant="fill" display="block" onClick={() => navigate('/')}>
            첫 결과 보기
          </Button>
        }
        testId="home-hero"
      />

      <Spacing size={24} />

      {/* 핵심 정보는 Card로 묶기(raw div 금지) — 위계 생성 */}
      <Card testId="home-highlights">
        {HIGHLIGHTS.map((h, idx) => (
          <ListRow
            key={idx}
            contents={<ListRow.Texts type="2RowTypeA" top={h.title} bottom={h.description} />}
          />
        ))}
      </Card>

      <Spacing size={24} />

      {/* 무료 이용 안내 — 하단 여백 채우는 실질 정보(스펙: 무료 주간 세션 3회 한도) */}
      <Card testId="home-plan-info">
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="무료 플랜"
              bottom="주간 학습 세션 3회까지 무료로 이용할 수 있어요"
            />
          }
        />
      </Card>

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
