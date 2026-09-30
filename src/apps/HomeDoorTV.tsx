import { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import doorDeliveryImage from '../assets/home-door-delivery.png';
import { XPButton } from '../components/XPButton';
import { XPStatusBar, XPStatusBarField } from '../components/XPStatusBar';
import { resolveOSTheme } from '../themes/useOSTheme';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px;
  gap: 7px;
  background: ${({ theme }) => resolveOSTheme(theme).tokens.BUTTON_FACE};
  color: ${({ theme }) => resolveOSTheme(theme).tokens.BLACK};
  font-family: ${({ theme }) => resolveOSTheme(theme).fonts.UI};
  font-size: 11px;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CameraLabel = styled.strong`
  margin-right: auto;
  font-weight: normal;
`;

const FeedFrame = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  padding: 5px;
  overflow: hidden;
  background: ${({ theme }) => resolveOSTheme(theme).tokens.BLACK};
  border-top: 2px solid ${({ theme }) => resolveOSTheme(theme).tokens.BUTTON_SHADOW};
  border-left: 2px solid ${({ theme }) => resolveOSTheme(theme).tokens.BUTTON_SHADOW};
  border-right: 2px solid ${({ theme }) => resolveOSTheme(theme).tokens.WHITE};
  border-bottom: 2px solid ${({ theme }) => resolveOSTheme(theme).tokens.WHITE};
`;

const FeedImage = styled.img`
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
`;

const FeedOverlay = styled.div`
  position: absolute;
  top: 13px;
  left: 13px;
  padding: 3px 6px;
  color: ${({ theme }) => resolveOSTheme(theme).tokens.WHITE};
  background: ${({ theme }) => resolveOSTheme(theme).tokens.BLACK};
  font-family: monospace;
  font-size: 12px;
`;

const Notice = styled.div`
  padding: 6px 8px;
  background: ${({ theme }) => resolveOSTheme(theme).tokens.PHOTO_BG};
  border: 1px solid ${({ theme }) => resolveOSTheme(theme).tokens.PHOTO_BORDER};
`;

const HomeDoorTV = () => {
  const { t } = useTranslation();
  const [refreshCount, setRefreshCount] = useState(0);
  const seconds = 18 + refreshCount;

  return (
    <Container>
      <Toolbar>
        <CameraLabel>{t('homeDoorTV.camera')}</CameraLabel>
        <XPButton onClick={() => setRefreshCount(value => value + 1)}>
          {t('homeDoorTV.refresh')}
        </XPButton>
      </Toolbar>

      <FeedFrame>
        <FeedImage src={doorDeliveryImage} alt={t('homeDoorTV.feedAlt')} draggable={false} />
        <FeedOverlay>CAM 01&nbsp;&nbsp;2006-08-12 16:42:{seconds}</FeedOverlay>
      </FeedFrame>

      <Notice>{t('homeDoorTV.deliveryNotice')}</Notice>

      <XPStatusBar>
        <XPStatusBarField>{t('homeDoorTV.online')}</XPStatusBarField>
        <XPStatusBarField>{t('homeDoorTV.recording')}</XPStatusBarField>
      </XPStatusBar>
    </Container>
  );
};

export default HomeDoorTV;
