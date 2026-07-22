import { Top, Button } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { EmptyState } from '../components/StateView';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>페이지를 찾을 수 없어요</Top.TitleParagraph>} />}>
      <EmptyState
        title="페이지를 찾을 수 없어요"
        description="주소가 변경되었거나 존재하지 않는 페이지예요"
        action={
          <Button variant="weak" onClick={() => navigate('/')}>
            홈으로 가기
          </Button>
        }
        testId="not-found"
      />
    </ScreenScaffold>
  );
}
