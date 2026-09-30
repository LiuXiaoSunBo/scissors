import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { AppProviders } from '../components/AppProviders';
import type { XPHandle } from '../components/XPBridge';
import { XPProgressBar } from '../components/XPProgressBar';
import XPIcon from '../components/XPIcon';
import { useApp } from '../hooks/useApp';
import { defineApp } from '../registry/defineApp';
import type { AppRegistryEntry, FileNode } from '../types';
import type { XPEvent } from '../events';
import type { CulturePackage } from '../data/culture';
import type { QQProfile } from '../data/qq/types';
import type { ContentPack } from '../content/types';
import shoesImage from '../assets/huili-shoes.png';
import familyPhotoBlurred from '../assets/family-photo-blurred.png';
import familyPhotoClear from '../assets/family-photo-clear.png';
import familyPhotoWithoutXiaoyun from '../assets/family-photo-without-xiaoyun.png';
import doorDeliveryImage from '../assets/home-door-delivery.png';
import xiaoyunWebcamFrightened from '../assets/xiaoyun-webcam-frightened.png';
import memoryMotherSonIndoors from '../assets/memory-mother-son-indoors.png';
import memoryMotherSonOutdoors from '../assets/memory-mother-son-outdoors.png';
import memorySchoolRegret from '../assets/memory-school-regret.png';
import memorySonLeaving from '../assets/memory-son-leaving.png';
import memoryMotherLastSmile from '../assets/memory-mother-last-smile.png';
import memoryMotherMemorial from '../assets/memory-mother-memorial.png';
import memoryMotherFinalNote from '../assets/memory-mother-final-note.png';
import memoryThirteenthBirthday from '../assets/memory-13th-birthday.png';
import photoshopIcon from '../assets/photoshop-cs2.png';
import { START_SCREEN_SAVER_EVENT } from '../utils/screenSaver';

// brand-palette:start -- story-only 2006 ad + Taobao content palette.
const P = {
  black: '#000000',
  white: '#ffffff',
  green: '#19bd5c',
  greenDark: '#118c42',
  cream: '#fff2cf',
  creamBorder: '#e4b35c',
  orange: '#ff6a00',
  orangeDark: '#d84d00',
  orangeSoft: '#fff1e8',
  blue: '#075be8',
  blueDark: '#0348b7',
  gray050: '#fafafa',
  gray100: '#f2f2f2',
  gray200: '#dedede',
  gray300: '#c7c7c7',
  gray500: '#888888',
  gray700: '#444444',
  gray900: '#171717',
  red: '#e12424',
  yellow: '#ffd739',
  dialogBlue: '#0b59d0',
  shadow: 'rgba(0, 0, 0, 0.36)',
  veil: 'rgba(0, 0, 0, 0.42)',
};
// brand-palette:end

interface StoryRuntime {
  act: 1 | 2 | 3 | 4;
  installed: boolean;
  balance: number;
  orderPlaced: boolean;
  groupAccepted: boolean;
  groupCut: boolean;
  groupMessages: FamilyMessage[];
  groupWindowOpen: boolean;
  auntUnread: boolean;
  photoSelected: boolean;
  photoCut: boolean;
  photoSaved: boolean;
  deliveryStatus: 'waiting' | 'delivering';
  deliveryTracked: boolean;
  doorAlert: boolean;
  courierAtDoor: boolean;
  webcamOpen: boolean;
  openInstaller: () => void;
  finishInstall: () => void;
  completeOrder: () => void;
  enterActTwo: () => void;
  acceptGroup: () => void;
  openGroup: () => void;
  setGroupWindowOpen: (open: boolean) => void;
  cutGroup: () => void;
  markAuntRead: () => void;
  selectPhoto: () => void;
  cutPhoto: () => void;
  savePhoto: () => void;
  trackDelivery: () => void;
  cutDelivery: () => void;
  openDoorCamera: () => void;
  reachNewsEnd: () => void;
}

interface FamilyMessage {
  id: number;
  sender: string;
  text: string;
  mine?: boolean;
}

const StoryContext = createContext<StoryRuntime | null>(null);

const useStory = () => {
  const value = useContext(StoryContext);
  if (!value) throw new Error('Scissors story app must run inside StoryContext.');
  return value;
};

const StoryShell = styled.main`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: ${P.black};
`;

const StoryGlobalStyle = createGlobalStyle`
  [data-testid='touch-hint'] {
    display: none !important;
  }
`;

const AdPage = styled.div`
  height: 100%;
  color: ${P.gray900};
  background: ${P.white};
  font-family: Tahoma, 'Microsoft YaHei', sans-serif;
  font-size: 12px;
`;

const AdBanner = styled.div`
  padding: 7px 10px;
  color: ${P.white};
  background: ${P.green};
  font-weight: 700;
`;

const AdRank = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 5px 8px;
  background: ${P.cream};
  border-bottom: 1px solid ${P.creamBorder};

  b {
    padding: 1px 5px;
    color: ${P.white};
    background: ${P.red};
  }
`;

const AdBody = styled.div`
  padding: 12px 10px 10px;
`;

const AdProduct = styled.div`
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 10px;
  align-items: start;
  margin-bottom: 10px;
`;

const ScissorsMark = styled.div`
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 9px;
  color: ${P.white};
  background: ${P.blue};
  font-size: 31px;
  font-weight: 700;
`;

const ProductTitle = styled.div`
  color: ${P.blueDark};
  font-size: 16px;
  line-height: 1.4;
`;

const FeatureList = styled.ul`
  margin: 7px 0 11px;
  padding: 0;
  list-style: none;

  li {
    margin: 5px 0;
  }

  li::before {
    content: '✓';
    display: inline-grid;
    place-items: center;
    width: 14px;
    height: 14px;
    margin-right: 7px;
    border-radius: 50%;
    color: ${P.white};
    background: ${P.green};
    font-size: 10px;
    font-weight: 700;
  }
`;

const AdStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 11px;
  border: 1px solid ${P.gray300};
  background: ${P.gray050};

  div {
    padding: 5px 2px;
    text-align: center;
    border-right: 1px solid ${P.gray300};
  }

  div:last-child { border-right: 0; }
  small { display: block; color: ${P.gray500}; }
  em { color: ${P.red}; font-style: normal; }
`;

const OrangeButton = styled.button`
  width: 100%;
  min-height: 34px;
  border: 1px solid ${P.orangeDark};
  color: ${P.white};
  background: ${P.orange};
  font-size: 15px;
  cursor: pointer;

  &:active { transform: translateY(1px); }
`;

const InstallerPage = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  box-sizing: border-box;
  padding: 20px;
  color: ${P.gray900};
  background: ${P.gray100};
  font-family: Tahoma, 'Microsoft YaHei', sans-serif;
  font-size: 12px;
`;

const InstallerHeading = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 17px;

  ${ScissorsMark} {
    width: 46px;
    height: 46px;
    font-size: 27px;
  }
`;

const UnknownAuthor = styled.div`
  padding: 8px;
  border: 1px solid ${P.creamBorder};
  background: ${P.cream};
`;

const InstallerFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
`;

const XPButton = styled.button`
  min-width: 78px;
  min-height: 25px;
  padding: 2px 10px;
  border: 1px solid ${P.gray700};
  border-radius: 3px;
  color: ${P.gray900};
  background: ${P.gray100};
  font-family: Tahoma, 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  cursor: pointer;
  box-shadow: inset 1px 1px ${P.white};

  &:disabled { color: ${P.gray500}; cursor: default; }
`;

const Browser = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  color: ${P.gray900};
  background: ${P.white};
  font-family: Arial, 'Microsoft YaHei', sans-serif;
  font-size: 13px;
`;

const BrowserMenu = styled.div`
  padding: 3px 8px;
  border-bottom: 1px solid ${P.gray300};
  font-family: Tahoma, sans-serif;
  font-size: 12px;
  word-spacing: 13px;
`;

const AddressBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 7px;
  border-bottom: 1px solid ${P.gray300};
  background: ${P.gray100};
  font-family: Tahoma, sans-serif;

  input {
    flex: 1;
    height: 21px;
    border: 1px solid ${P.gray500};
    background: ${P.white};
  }
`;

const TaobaoHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 22px 9px;
  border-bottom: 2px solid ${P.orange};
`;

const TaobaoLogo = styled.div`
  color: ${P.orange};
  font-size: 31px;
  font-weight: 800;
  letter-spacing: -2px;
`;

const SearchForm = styled.form`
  display: flex;
  width: min(520px, 70%);

  input {
    flex: 1;
    min-width: 0;
    height: 34px;
    box-sizing: border-box;
    padding: 0 10px;
    border: 2px solid ${P.orange};
    outline: none;
  }

  button {
    width: 78px;
    border: 0;
    color: ${P.white};
    background: ${P.orange};
    font-weight: 700;
    cursor: pointer;
  }
`;

const WebBody = styled.div`
  flex: 1;
  overflow: auto;
  padding: 18px 24px;
  background: ${P.gray050};
`;

const HomeHero = styled.div`
  display: grid;
  place-items: center;
  min-height: 270px;
  border: 1px solid ${P.gray200};
  background: ${P.orangeSoft};
  text-align: center;

  strong { display: block; color: ${P.orange}; font-size: 27px; }
  p { color: ${P.gray700}; }
`;

const ResultCard = styled.article`
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 24px;
  max-width: 720px;
  margin: 0 auto;
  padding: 18px;
  border: 1px solid ${P.gray200};
  background: ${P.white};

  img {
    width: 210px;
    height: 210px;
    object-fit: cover;
    border: 1px solid ${P.gray200};
  }

  h2 { margin: 8px 0 12px; font-size: 20px; font-weight: 400; }
`;

const Price = styled.div`
  margin: 18px 0;
  color: ${P.red};
  font-size: 27px;
  font-weight: 700;

  del { margin-right: 9px; color: ${P.gray500}; font-size: 14px; font-weight: 400; }
`;

const Balance = styled.div`
  margin-bottom: 14px;
  padding: 9px;
  background: ${P.cream};
  border: 1px solid ${P.creamBorder};
`;

const BuyButton = styled(OrangeButton)`
  width: 150px;
`;

const EmptyResult = styled.div`
  padding: 70px 20px;
  color: ${P.gray500};
  text-align: center;
  font-size: 16px;
`;

const OrderPanel = styled.section`
  max-width: 720px;
  margin: 0 auto;
  padding: 22px;
  border: 1px solid ${P.gray200};
  background: ${P.white};

  h2 { margin: 0 0 8px; color: ${P.orange}; }
`;

const ShippingButton = styled(OrangeButton)`
  margin-top: 12px;
  min-width: 130px;
`;

const RouteMap = styled.div`
  position: relative;
  height: 220px;
  margin-top: 16px;
  overflow: hidden;
  border: 1px solid ${P.gray300};
  background: ${P.gray100};

  &::before {
    content: '';
    position: absolute;
    left: 12%;
    right: 12%;
    top: 50%;
    height: 5px;
    border-radius: 3px;
    background: ${P.orange};
    transform: rotate(-8deg);
  }

`;

const SmartPrompt = styled.div`
  position: fixed;
  right: 0;
  bottom: 30px;
  z-index: 999990;
  width: 300px;
  border: 2px solid ${P.dialogBlue};
  border-radius: 7px 7px 0 0;
  background: ${P.cream};
  box-shadow: 0 5px 18px ${P.shadow};
  font-family: Tahoma, 'Microsoft YaHei', sans-serif;
  font-size: 12px;
`;

const SmartTitle = styled.div`
  padding: 6px 9px;
  color: ${P.white};
  background: ${P.dialogBlue};
  font-weight: 700;
`;

const SmartBody = styled.div`
  display: flex;
  gap: 10px;
  padding: 13px 11px 8px;

  ${ScissorsMark} { width: 38px; height: 38px; font-size: 22px; flex: 0 0 auto; }
`;

const PromptActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  padding: 0 10px 10px;
`;

const ScissorsAd: React.FC = () => {
  const { t } = useTranslation();
  const api = useApp();
  const story = useStory();

  useLayoutEffect(() => {
    const placeAtDesktopCorner = () => {
      const desktop = document.querySelector<HTMLElement>('.windows-xp-root');
      const width = desktop?.clientWidth ?? window.innerWidth;
      const height = desktop?.clientHeight ?? window.innerHeight;
      api.window.move(Math.max(0, width - 300), Math.max(0, height - 30 - 355));
    };

    placeAtDesktopCorner();
    window.addEventListener('resize', placeAtDesktopCorner);
    return () => window.removeEventListener('resize', placeAtDesktopCorner);
  }, [api]);

  const download = () => {
    story.openInstaller();
    window.setTimeout(() => api.window.close(), 0);
  };

  return (
    <AdPage>
      <AdBanner>{t('scissors.ad.banner')}</AdBanner>
      <AdRank><b>{t('scissors.ad.rank')}</b>{t('scissors.ad.rankDetail')}</AdRank>
      <AdBody>
        <AdProduct>
          <ScissorsMark>✂</ScissorsMark>
          <div>
            <ProductTitle>{t('scissors.productName')}</ProductTitle>
            <div>{t('scissors.ad.slogan')}</div>
          </div>
        </AdProduct>
        <FeatureList>
          <li>{t('scissors.ad.feature1')}</li>
          <li>{t('scissors.ad.feature2')}</li>
          <li>{t('scissors.ad.feature3')}</li>
        </FeatureList>
        <AdStats>
          <div><small>{t('scissors.ad.size')}</small>1.2 MB</div>
          <div><small>{t('scissors.ad.fee')}</small><em>{t('scissors.ad.free')}</em></div>
          <div><small>{t('scissors.ad.rating')}</small>{t('scissors.ad.none')}</div>
        </AdStats>
        <OrangeButton onClick={download}>{t('scissors.ad.download')}</OrangeButton>
      </AdBody>
    </AdPage>
  );
};

const ScissorsInstaller: React.FC = () => {
  const { t } = useTranslation();
  const api = useApp();
  const story = useStory();
  const finishInstall = story.finishInstall;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      const next = Math.min(100, ((Date.now() - started) / 6000) * 100);
      setProgress(next);
      if (next >= 100) {
        window.clearInterval(timer);
        finishInstall();
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [finishInstall]);

  return (
    <InstallerPage>
      <InstallerHeading>
        <ScissorsMark>✂</ScissorsMark>
        <div><strong>{t('scissors.installer.title')}</strong><br />{t('scissors.installer.subtitle')}</div>
      </InstallerHeading>
      <UnknownAuthor><strong>{t('scissors.installer.author')}</strong>：{t('scissors.installer.unknown')}</UnknownAuthor>
      <div>{progress < 100 ? t('scissors.installer.installing') : t('scissors.installer.done')}</div>
      <XPProgressBar value={progress} />
      <InstallerFooter>
        <span>{Math.round(progress)}%</span>
        <XPButton disabled={progress < 100} onClick={() => api.window.close()}>{t('scissors.installer.finish')}</XPButton>
      </InstallerFooter>
    </InstallerPage>
  );
};

const TaobaoBrowser: React.FC = () => {
  const { t } = useTranslation();
  const api = useApp();
  const story = useStory();
  const enterActTwo = story.enterActTwo;
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [found, setFound] = useState(false);
  const [discounted, setDiscounted] = useState(false);
  const [prompt, setPrompt] = useState(false);
  const [purchaseAttempted, setPurchaseAttempted] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [deliveryPrompt, setDeliveryPrompt] = useState(false);
  const ordered = story.orderPlaced;

  useEffect(() => {
    if (!ordered || story.act !== 1) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void api.dialog.alert({
        title: t('scissors.system.title'),
        message: `${t('scissors.system.disconnected')}\n\n${t('scissors.system.sleepPrompt')}`,
        type: 'warning',
      }).then(() => {
        if (!cancelled) {
          enterActTwo();
          window.dispatchEvent(new Event(START_SCREEN_SAVER_EVENT));
        }
      });
    }, 1100);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [api.dialog, enterActTwo, ordered, story.act, t]);

  const openShipping = () => {
    setShippingOpen(true);
    story.trackDelivery();
    if (story.installed && story.deliveryStatus === 'waiting') setDeliveryPrompt(true);
  };

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    setSearched(true);
    setFound(query.trim() === t('scissors.taobao.keyword'));
    setPrompt(false);
  };

  const buy = () => {
    setPurchaseAttempted(true);
    if (discounted) {
      story.completeOrder();
      return;
    }
    if (story.installed) setPrompt(true);
  };

  const cutPrice = () => {
    setDiscounted(true);
    setPrompt(false);
    story.completeOrder();
  };

  return (
    <Browser>
      <BrowserMenu>{t('scissors.browser.menu')}</BrowserMenu>
      <AddressBar><span>{t('scissors.browser.address')}</span><input readOnly value="http://www.taobao.com/" /></AddressBar>
      <TaobaoHeader>
        <TaobaoLogo>{t('scissors.taobao.logo')}</TaobaoLogo>
        <SearchForm onSubmit={search}>
          <input value={query} onChange={event => setQuery(event.target.value)} aria-label={t('scissors.taobao.searchAria')} />
          <button type="submit">{t('scissors.taobao.search')}</button>
        </SearchForm>
      </TaobaoHeader>
      <WebBody>
        {story.act === 2 && ordered && !shippingOpen && (
          <OrderPanel>
            <h2>我的淘宝</h2>
            <div>回力鞋 × 1 · 订单已支付</div>
            <ShippingButton onClick={openShipping}>快递中</ShippingButton>
          </OrderPanel>
        )}
        {story.act === 2 && ordered && shippingOpen && (
          <OrderPanel>
            <h2>{story.deliveryStatus === 'delivering' ? '派送中' : '运输中'}</h2>
            <p>{story.deliveryStatus === 'delivering' ? '快递员正在为您派送，请留意门口。' : '物流还有 1 天才能到'}</p>
            <RouteMap aria-label="物流路线图" />
          </OrderPanel>
        )}
        {!(story.act === 2 && ordered) && !searched && <HomeHero><div><strong>{t('scissors.taobao.hero')}</strong><p>{t('scissors.taobao.heroHint')}</p></div></HomeHero>}
        {!(story.act === 2 && ordered) && searched && !found && <EmptyResult>{t('scissors.taobao.empty', { query })}</EmptyResult>}
        {!(story.act === 2 && ordered) && searched && found && (
          <ResultCard>
            <img src={shoesImage} alt={t('scissors.taobao.shoeAlt')} />
            <div>
              <h2>{t('scissors.taobao.product')}</h2>
              <div>{t('scissors.taobao.seller')}</div>
              <Price>{discounted && <del>¥198.00</del>}¥{discounted ? '99.00' : '198.00'}</Price>
              <Balance>{t('scissors.taobao.balance')}：¥{story.balance.toFixed(2)}</Balance>
              {!ordered && <BuyButton onClick={buy}>{t('scissors.taobao.buy')}</BuyButton>}
              {ordered && <strong>{t('scissors.taobao.orderSuccess')}</strong>}
              {purchaseAttempted && !discounted && !ordered && <p>{t('scissors.taobao.insufficient')}</p>}
            </div>
          </ResultCard>
        )}
      </WebBody>
      {prompt && createPortal(
        <SmartPrompt role="dialog" aria-label={t('scissors.smart.title')}>
          <SmartTitle>{t('scissors.smart.title')}</SmartTitle>
          <SmartBody><ScissorsMark>✂</ScissorsMark><div>{t('scissors.smart.question')}</div></SmartBody>
          <PromptActions>
            <XPButton onClick={cutPrice}>{t('scissors.common.yes')}</XPButton>
            <XPButton onClick={() => setPrompt(false)}>{t('scissors.common.no')}</XPButton>
          </PromptActions>
        </SmartPrompt>, document.body
      )}
      {deliveryPrompt && story.deliveryStatus === 'waiting' && createPortal(
        <SmartPrompt role="dialog" aria-label="智能剪刀">
          <SmartTitle>智能剪刀</SmartTitle>
          <SmartBody><ScissorsMark>✂</ScissorsMark><div>检测到可以剪断的事项，是否剪断？</div></SmartBody>
          <PromptActions>
            <XPButton onClick={() => { story.cutDelivery(); setDeliveryPrompt(false); }}>是</XPButton>
            <XPButton onClick={() => setDeliveryPrompt(false)}>否</XPButton>
          </PromptActions>
        </SmartPrompt>, document.body
      )}
    </Browser>
  );
};

const PhotoshopShell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  color: ${P.gray100};
  background: ${P.gray700};
  font: 12px Tahoma, 'Microsoft YaHei', sans-serif;
`;

const PhotoshopMenu = styled.div`
  padding: 5px 9px;
  color: ${P.gray900};
  background: ${P.gray100};
  word-spacing: 14px;
`;

const PhotoshopToolbar = styled.div`
  display: flex;
  gap: 7px;
  padding: 6px;
  border-bottom: 1px solid ${P.black};
  background: ${P.gray700};
`;

const PhotoshopCanvas = styled.div`
  flex: 1;
  display: grid;
  place-items: center;
  min-height: 0;
  overflow: auto;
  padding: 18px;
  background: ${P.gray500};

  img {
    display: block;
    max-width: 92%;
    max-height: 92%;
    border: 1px solid ${P.black};
    box-shadow: 0 4px 14px ${P.shadow};
  }
`;

const PhotoshopEmpty = styled.div`
  color: ${P.gray200};
  text-align: center;
  line-height: 1.8;
`;

const jump = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-9px); }
`;

const QQToast = styled.button`
  position: fixed;
  right: 0;
  bottom: 30px;
  z-index: 999989;
  width: 285px;
  padding: 10px;
  border: 2px solid ${P.dialogBlue};
  color: ${P.gray900};
  background: ${P.cream};
  box-shadow: 0 4px 14px ${P.shadow};
  font: 12px Tahoma, 'Microsoft YaHei', sans-serif;
  text-align: left;
  cursor: pointer;
  animation: ${jump} 0.55s ease-in-out infinite;

  strong { display: block; margin-bottom: 5px; color: ${P.blueDark}; }
`;

const DoorCamera = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  color: ${P.gray900};
  background: ${P.gray100};
  font: 12px Tahoma, 'Microsoft YaHei', sans-serif;
`;

const DoorFeed = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 2px inset ${P.gray300};
  color: ${P.green};
  background: ${P.black};

  img { width: 100%; height: 100%; object-fit: contain; }
  span { position: absolute; top: 9px; left: 9px; padding: 3px 6px; color: ${P.white}; background: ${P.black}; }
`;

const DoorNotice = styled.div<{ $alert?: boolean }>`
  padding: 8px;
  border: 1px solid ${p => p.$alert ? P.red : P.gray300};
  color: ${p => p.$alert ? P.red : P.gray700};
  background: ${p => p.$alert ? P.cream : P.white};
`;

const DoorToast = styled(QQToast)`
  background: ${P.white};
  animation: ${jump} 0.7s ease-in-out infinite;
`;

const WebcamScene = styled.div`
  position: relative;
  height: 100%;
  overflow: hidden;
  color: ${P.gray200};
  background: ${P.black};
  font: 12px Tahoma, sans-serif;

  &::after {
    position: absolute;
    z-index: 1;
    inset: 0;
    content: '';
    pointer-events: none;
    background: repeating-linear-gradient(0deg, transparent 0 3px, ${P.veil} 4px);
  }

  img { width: 100%; height: 100%; object-fit: cover; }
  .label { position: absolute; z-index: 2; top: 8px; left: 8px; }
`;

const NewsPage = styled.div`
  height: 100%;
  overflow-y: auto;
  color: ${P.gray900};
  background: ${P.white};
  font: 14px/1.8 Arial, 'Microsoft YaHei', sans-serif;
`;

const NewsHeader = styled.header`
  padding: 12px 22px;
  color: ${P.white};
  background: ${P.blueDark};
  border-bottom: 4px solid ${P.red};
  font-size: 25px;
  font-weight: 700;

  small {
    margin-left: 12px;
    font-size: 12px;
    font-weight: 400;
  }
`;

const NewsArticle = styled.article`
  max-width: 720px;
  min-height: 1080px;
  margin: 0 auto;
  padding: 28px 42px 90px;
  box-sizing: border-box;

  h1 { margin: 0 0 10px; font-size: 28px; line-height: 1.35; }
  .meta { padding-bottom: 12px; border-bottom: 1px solid ${P.gray200}; color: ${P.gray500}; font-size: 12px; }
  p { margin: 22px 0; text-indent: 2em; }
  blockquote {
    margin: 24px 20px;
    padding: 12px 16px;
    border-left: 4px solid ${P.red};
    color: ${P.gray700};
    background: ${P.gray100};
  }
  footer { margin-top: 70px; color: ${P.gray500}; font-size: 12px; text-align: right; }
`;

const ActFourQQButton = styled.button`
  position: fixed;
  right: 20px;
  bottom: 44px;
  z-index: 999988;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid ${P.dialogBlue};
  color: ${P.gray900};
  background: ${P.cream};
  font: 12px Tahoma, 'Microsoft YaHei', sans-serif;
  cursor: pointer;
  animation: ${jump} 0.55s ease-in-out infinite;
`;

const FinalScissorsAd = styled.button`
  position: fixed;
  z-index: 999995;
  inset: 50% auto auto 50%;
  width: 340px;
  padding: 0;
  border: 3px solid ${P.dialogBlue};
  color: ${P.gray900};
  background: ${P.cream};
  box-shadow: 0 7px 26px ${P.shadow};
  font: 13px Tahoma, 'Microsoft YaHei', sans-serif;
  text-align: left;
  cursor: pointer;
  transform: translate(-50%, -50%);

  strong { display: block; padding: 8px 10px; color: ${P.white}; background: ${P.dialogBlue}; }
  span { display: block; padding: 28px 20px; text-align: center; font-size: 19px; }
  small { display: block; padding: 0 12px 12px; color: ${P.gray500}; text-align: center; }
`;

const FAMILY_MESSAGES: Array<Omit<FamilyMessage, 'id'>> = [
  { sender: '姨妈', text: '@小运 进群啦，昨天合照记得处理一下。' },
  { sender: '二舅', text: '@小运 最近工作顺不顺啊？' },
  { sender: '三姨', text: '小运怎么瘦了，是不是又不好好吃饭。' },
  { sender: '表姐', text: '@二舅 你每次见面都问工作，换一句嘛。' },
  { sender: '二舅', text: '@表姐 那我问对象，哈哈。' },
  { sender: '姨父', text: '@小运 鞋买了吗？别总穿旧的。' },
  { sender: '小姨', text: '早饭吃了没有？早上不能空腹。' },
  { sender: '表弟', text: '@小运 哥，照片发群里记得把我拍帅点。' },
  { sender: '大舅妈', text: '昨天那张合照大家脸怎么都糊了呀。' },
  { sender: '姨妈', text: '@小运 你会修图，帮大家弄清楚一些。' },
  { sender: '三姨夫', text: '年轻人电脑懂得多，这个肯定不难。' },
  { sender: '表姐', text: '@三姨夫 别给人家压力，一大早的。' },
  { sender: '二舅', text: '@小运 有空也来我这边看看电脑。' },
  { sender: '奶奶', text: '小运吃早饭，身体最要紧。' },
  { sender: '小姨', text: '@奶奶 他肯定还没起床呢。' },
  { sender: '表妹', text: '昨天拍照我是不是闭眼了？[偷笑]' },
  { sender: '姨父', text: '@表妹 你一共拍了十几张都在眨眼。' },
  { sender: '大舅妈', text: '@小运 修完先发一张看看效果。' },
  { sender: '表弟', text: '哥在线吗？大家都等你回复呢。' },
  { sender: '三姨', text: '@小运 看到消息回一声，别让长辈担心。' },
  { sender: '姨妈', text: '好了好了，别一起催，小运刚醒。' },
  { sender: '二舅', text: '@姨妈 你不也一直在催嘛，哈哈。' },
  { sender: '表姐', text: '@小运 今天中午来不来家里吃饭？' },
  { sender: '姨妈', text: '@小运 照片处理好以后私发我一份。' },
];

const ACT_THREE_GROUP_MESSAGES: Array<Omit<FamilyMessage, 'id'>> = [
  { sender: '表姐', text: '今天楼下新开了一家早餐店，有人吃过吗？' },
  { sender: '表弟', text: '我吃过，豆浆还行，包子一般。' },
  { sender: '姨妈', text: '奶奶说周末大家回去吃饭。' },
  { sender: '二舅', text: '我带点水果，谁去接奶奶？' },
  { sender: '三姨', text: '我去吧，上午十点到。' },
];

const FORGOTTEN_REPLIES: Record<string, string> = {
  mother: '请问你是哪位？为什么会叫我妈妈？我没有你这个孩子。',
  aunt: '你到底是谁？别再叫我大姨了，我们家没有你这个人。',
  xiaobei: '抱歉，我不认识你。聊天记录里明明有我的回复……可我完全想不起你是谁。',
  'manager-chen': '你是不是找错公司了？我们部门没有你这个人，通讯录里也查不到。',
  'supervisor-chen': '这些项目记录为什么写着你的名字？我对你一点印象都没有。请问你是谁？',
  'new-colleague': '请问你是？我们应该没见过吧，为什么 QQ 显示已经是好友？',
};

const DEFAULT_FORGOTTEN_REPLY = '不好意思，请问你是哪位？我不记得认识你。';

const ACT_ONE_AUNT_MESSAGES = [
  '小运，今晚聚餐吃饱了吗？你妈妈走得早，你也很少跟我们一起家庭聚餐。以后有空就多来坐坐，别总一个人。',
  '还有，你那双鞋都穿那么久了，抓紧买一双新的，别总舍不得。',
] as const;

const PRE_CUT_WORK_REPLIES: Record<string, string[]> = {
  xiaobei: [
    '你先别急着回工作，我主要想确认你身体怎么样。那张图的人物边缘锐化有点重，头发和背景交界处再柔一点。',
    '客户那张主视觉也有同样的问题，人物右肩有一圈白边。你有空把蒙版往里收一两个像素。',
    '颜色先别整体加饱和，肤色会发红。只调背景蓝和衣服就行，脸部保留原来的色阶。',
    '源文件记得保留分层，别合并。我下午帮你再校一遍细节。',
  ],
  'supervisor-chen': [
    '先确认一下工作：客户要的还是“年轻、可靠”，人物脸部不要磨得太平，保留一点皮肤纹理。',
    '标题字距再松一点，右侧留白给文案。导出前检查 CMYK，蓝色别印成紫色。',
    '新同事今天入职，我让他先接你那套延展图。你把图层命名和链接素材整理一下。',
    '你不用逐条解释，按这几个点改完发预览图就行，源文件先别覆盖。',
  ],
};

const storyQQProfile: QQProfile = {
  me: { number: '28061234', nickname: '小运', signature: '在线', avatar: 50, status: 'online' },
  login: { autoLogin: true },
  groups: [{ id: 'friends', name: '我的好友', open: true }],
  buddies: [
    { id: 'mother', number: '10086', nickname: '妈妈', avatar: 12, group: 'friends', status: 'offline' },
    {
      id: 'xiaoyu', number: '470521', nickname: '小雨', avatar: 97, group: 'friends', status: 'online',
      signature: '在忙请留言', blockedByBuddy: true,
      history: [
        { from: 'buddy', time: '21:03:12', text: '你真的想毕业后留在这座城市吗？' },
        { from: 'me', time: '21:04:01', text: '嗯。' },
        { from: 'buddy', time: '21:04:46', text: '可我们之前说好一起去南方的。' },
        { from: 'me', time: '21:05:13', text: '以后再说。' },
        { from: 'buddy', time: '21:06:22', text: '以后是什么时候？我已经在认真准备了。' },
        { from: 'me', time: '21:07:08', text: '不知道。' },
        { from: 'buddy', time: '21:08:41', text: '你最近每次都只回几个字，是不是不想聊了？' },
        { from: 'me', time: '21:09:02', text: '忙。' },
        { from: 'buddy', time: '21:10:28', text: '我们只是对未来的规划有点差异，不至于这样吧。' },
        { from: 'buddy', time: '21:12:03', text: '我发现你有点奇怪' },
      ],
    },
    { id: 'aunt', number: '320808', nickname: '大姨', avatar: 18, group: 'friends', status: 'online' },
    {
      id: 'xiaobei', number: '635122', nickname: '小贝', avatar: 31, group: 'friends', status: 'online', signature: '同事 · 视觉设计',
      history: [
        { from: 'buddy', time: '17:34:10', text: '首页那版KV我看了，蓝色是不是有点沉？' },
        { from: 'me', time: '17:35:02', text: '我再提一点亮度。' },
        { from: 'buddy', time: '17:36:18', text: '人物边缘也补一下，不然印出来会脏。' },
        { from: 'me', time: '17:38:40', text: '好，今晚给你新版。' },
        { from: 'buddy', time: '17:39:05', text: '辛苦啦，我帮你校最后一遍文字。' },
      ],
    },
    {
      id: 'manager-chen', number: '752309', nickname: '陈东经理', avatar: 64, group: 'friends', status: 'online', signature: '设计部经理',
      history: [
        { from: 'buddy', time: '18:06:12', text: '小运，客户把主视觉方向定成“年轻、可靠”。' },
        { from: 'me', time: '18:07:31', text: '收到，我按这个方向收敛方案。' },
        { from: 'buddy', time: '18:08:54', text: '明早十点前给我一版能提案的稿子。' },
        { from: 'me', time: '18:10:03', text: '可以，我今晚把版式做完。' },
        { from: 'buddy', time: '18:11:20', text: '注意品牌字别变形，留白也别太少。' },
      ],
    },
    {
      id: 'supervisor-chen', number: '841106', nickname: '陈遇主管', avatar: 73, group: 'friends', status: 'online', signature: '创意主管',
      history: [
        { from: 'buddy', time: '19:22:08', text: '下午那组三个方案，我更喜欢第二个。' },
        { from: 'me', time: '19:23:44', text: '第二个的信息层级确实更清楚。' },
        { from: 'buddy', time: '19:24:16', text: '对，但标题字距还要松一点。' },
        { from: 'me', time: '19:25:03', text: '我改完连同色彩规范一起发你。' },
        { from: 'buddy', time: '19:26:37', text: '好，源文件记得分层，明天可能还要延展海报。' },
      ],
    },
    {
      id: 'new-colleague', number: '906271', nickname: '新同事', avatar: 42, group: 'friends', status: 'online', signature: '设计部',
    },
  ],
};

const storyContentPack: ContentPack = {
  id: 'scissors-story-content',
  qqArchives: [
    {
      id: 'scissors-family-chat',
      title: '家庭QQ群',
      conversations: [
        {
          id: 'family-group',
          title: '相亲相爱一家人',
          kind: 'group',
          memberIds: [
            '28061234', '姨妈', '二舅', '三姨', '姨父', '小姨', '表姐', '表弟',
            '大舅妈', '奶奶', '三姨夫', '表妹',
          ],
          revealIntervalMs: 1000,
          disconnectEvent: 'scissors:qq-group-disconnect',
          disconnectMemberId: '28061234',
          disconnectMessage: '您已剪断群聊连接....',
          messages: FAMILY_MESSAGES.map((message, index) => ({
            id: `family-${index + 1}`,
            senderId: message.sender,
            senderName: message.sender,
            sentAt: `2006-08-13T08:${String(7 + Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}+08:00`,
            text: message.text,
          })),
        },
      ],
    },
  ],
};

const StoryPhotoshop: React.FC = () => {
  const story = useStory();
  return (
    <PhotoshopShell>
      <PhotoshopMenu>文件 编辑 图像 图层 选择 滤镜 视图 窗口 帮助</PhotoshopMenu>
      <PhotoshopToolbar>
        <XPButton onClick={story.selectPhoto}>打开“待处理图片.jpg”</XPButton>
        {story.photoCut && !story.photoSaved && <XPButton onClick={story.savePhoto}>保存到桌面</XPButton>}
        <span>{story.photoSelected
          ? (story.photoSaved ? '已保存到桌面：家庭合照-已修复.jpg' : story.photoCut ? '面部清晰度：已修复' : '面部清晰度：异常')
          : '未打开文件'}</span>
      </PhotoshopToolbar>
      <PhotoshopCanvas>
        {!story.photoSelected && <PhotoshopEmpty>Adobe Photoshop<br />请选择要处理的图片</PhotoshopEmpty>}
        {story.photoSelected && <img src={story.photoCut ? familyPhotoClear : familyPhotoBlurred} alt="待处理的家庭合照" />}
      </PhotoshopCanvas>
    </PhotoshopShell>
  );
};

const StoryHomeDoorTV: React.FC = () => {
  const story = useStory();
  return (
    <DoorCamera>
      <strong>CAM 01 · 家门口楼道</strong>
      <DoorFeed>
        {story.courierAtDoor
          ? <img src={doorDeliveryImage} alt="快递员正在门口投递快递" />
          : <div>楼道画面正常<br />未检测到异常活动</div>}
        <span>{story.act === 1 ? '2006-08-12 22:08' : '2006-08-13 08:16'}</span>
      </DoorFeed>
      <DoorNotice $alert={story.courierAtDoor}>
        {story.courierAtDoor ? '检测到门口出现陌生人：快递员正在投递快递。' : '门口状态正常。'}
      </DoorNotice>
    </DoorCamera>
  );
};

const StoryWebcam: React.FC = () => (
  <WebcamScene data-testid="story-webcam">
    <div className="label">USB PC Camera · LIVE</div>
    <img src={xiaoyunWebcamFrightened} alt="小运在摄像头前露出恐惧而疑惑的神情" />
  </WebcamScene>
);

const StoryTencentNews: React.FC = () => {
  const story = useStory();
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const page = event.currentTarget;
    if (page.scrollTop + page.clientHeight >= page.scrollHeight - 12) story.reachNewsEnd();
  };

  return (
    <NewsPage data-testid="story-tencent-news" onScroll={handleScroll}>
      <NewsHeader>腾讯新闻<small>新闻中心 · 社会</small></NewsHeader>
      <NewsArticle>
        <h1>本市一男子在路口持剪刀行凶，一名母亲当场身亡</h1>
        <div className="meta">2006年8月13日 15:42 来源：本地晚报</div>
        <p>
          今天中午，一名年轻男子离家后不久，在城区十字路口遇见一对刚从手工培训班出来的母子。
          据目击者称，母亲情绪激动，一直高声斥责身旁的孩子，孩子低着头，没有回应。
        </p>
        <blockquote>
          “为什么偏偏是个自闭症，连个手工培训班都上不好？白生你这个废物了。”
        </blockquote>
        <p>
          多名路人证实，类似的辱骂持续了数分钟。孩子手里提着装有彩纸、剪刀和未完成手工作品的袋子，
          被母亲推搡后仍站在原地。此时，路过的男子突然停下脚步，与母亲发生激烈争执。
        </p>
        <p>
          警方初步调查显示，该男子的母亲多年前因长期绝望自杀身亡。亲属称，母子关系在她去世前已经十分紧张；
          她留下的最后一张字条只有一句“我失望的人生”。嫌疑人供述，听见路口的辱骂后，他想起母亲最后看向自己时
          失望而疲惫的神情，情绪随即彻底失控。
        </p>
        <p>
          在孩子面前，男子从手工袋中取出剪刀刺向那名母亲。路人随即报警并将孩子带离现场，
          伤者经抢救无效死亡。嫌疑人没有逃离，目前已被警方控制。案件仍在进一步调查中。
        </p>
        <p>
          社区工作人员已为目睹事件的孩子安排临时照护与心理援助。警方提醒，任何针对残障儿童的羞辱和暴力都不能
          成为另一场暴力的理由；如发现家庭成员长期处于危险或极端情绪中，应及时向专业机构求助。
        </p>
        <footer>责任编辑：新闻中心编辑部</footer>
      </NewsArticle>
    </NewsPage>
  );
};

const storyApps: AppRegistryEntry[] = [
  defineApp({
    id: 'ScissorsAd',
    name: '软件小助手 · 热门推荐',
    nameKey: 'scissors.ad.windowTitle',
    icon: 'security_center',
    window: { width: 300, height: 355, left: 724, top: 383, singleton: true, resizable: false },
    component: ScissorsAd,
  }) as AppRegistryEntry,
  defineApp({
    id: 'ScissorsInstaller',
    name: '智能剪刀安装程序',
    nameKey: 'scissors.installer.windowTitle',
    icon: 'cut',
    window: { width: 430, height: 280, singleton: true, resizable: false },
    component: ScissorsInstaller,
  }) as AppRegistryEntry,
  defineApp({
    id: 'InternetExplorer',
    name: 'Internet Explorer',
    nameKey: 'internetExplorer.title',
    icon: 'ie',
    window: { width: 850, height: 620, singleton: true, resizable: true },
    component: TaobaoBrowser,
  }) as AppRegistryEntry,
  defineApp({
    id: 'Photoshop',
    name: 'Adobe Photoshop',
    icon: photoshopIcon,
    window: { width: 900, height: 650, singleton: true, resizable: true },
    component: StoryPhotoshop,
  }) as AppRegistryEntry,
  defineApp({
    id: 'HomeDoorTV',
    name: '家门卫视',
    icon: 'security_center',
    window: { width: 720, height: 520, singleton: true, resizable: true },
    component: StoryHomeDoorTV,
  }) as AppRegistryEntry,
  defineApp({
    id: 'StoryWebcam',
    name: 'USB 视频设备',
    icon: 'camera',
    window: { width: 560, height: 430, singleton: true, resizable: false },
    component: StoryWebcam,
  }) as AppRegistryEntry,
  defineApp({
    id: 'StoryTencentNews',
    name: '腾讯新闻',
    icon: 'ie',
    window: { width: 820, height: 620, singleton: true, resizable: true },
    component: StoryTencentNews,
  }) as AppRegistryEntry,
];

const storyCulture: CulturePackage = {
  id: 'zh',
  displayName: '第一幕·简体中文',
  locales: ['zh', 'zh-CN'],
  requiredApps: ['QQ', 'HomeDoorTV', 'PhotoViewer', 'InternetExplorer'],
  browser: { homepage: 'http://www.taobao.com/' },
  qq: storyQQProfile,
  desktopShortcuts: [],
  startMenu: {
    pinned: [
      { id: 'ie', action: 'InternetExplorer', nameKey: 'startMenu.apps.internetExplorer', icon: 'ie' },
      { id: 'qq', action: 'QQ', nameKey: 'startMenu.apps.qq', icon: 'qq' },
    ],
    recent: [],
  },
  i18n: {
    zh: {
      'scissors.standby.title': 'Windows 正在待机',
      'scissors.standby.hint': '单击鼠标或按任意键唤醒',
      'scissors.productName': '智能剪刀 1.0',
      'scissors.ad.windowTitle': '软件小助手 · 热门推荐',
      'scissors.ad.banner': '软件小助手 · 热门推荐',
      'scissors.ad.rank': 'NO.1',
      'scissors.ad.rankDetail': '本周热门下载榜第 1 名',
      'scissors.ad.slogan': '把不需要的部分剪掉，剩下的就会更简单。',
      'scissors.ad.feature1': '剪掉排队与等待，一步到位',
      'scissors.ad.feature2': '剪掉推销与骚扰，耳根清净',
      'scissors.ad.feature3': '剪掉一切你不需要的东西',
      'scissors.ad.size': '大小',
      'scissors.ad.fee': '费用',
      'scissors.ad.free': '完全免费',
      'scissors.ad.rating': '用户评价',
      'scissors.ad.none': '暂无',
      'scissors.ad.download': '立即下载',
      'scissors.installer.windowTitle': '智能剪刀安装程序',
      'scissors.installer.title': '正在安装智能剪刀 1.0',
      'scissors.installer.subtitle': '请稍候，安装程序正在写入系统。',
      'scissors.installer.author': '作者',
      'scissors.installer.unknown': '未知',
      'scissors.installer.installing': '正在安装，预计需要 6 秒…',
      'scissors.installer.done': '安装完成。智能剪刀已在后台运行。',
      'scissors.installer.finish': '完成',
      'scissors.browser.menu': '文件 编辑 查看 收藏 工具 帮助',
      'scissors.browser.address': '地址',
      'scissors.taobao.logo': '淘宝网',
      'scissors.taobao.searchAria': '搜索商品',
      'scissors.taobao.search': '搜索',
      'scissors.taobao.hero': '淘你喜欢',
      'scissors.taobao.heroHint': '在搜索框中输入商品名称',
      'scissors.taobao.keyword': '回力鞋',
      'scissors.taobao.empty': '没有找到与“{{query}}”相关的商品',
      'scissors.taobao.shoeAlt': '红白配色的经典帆布鞋',
      'scissors.taobao.product': '经典红白回力鞋 · 男女同款帆布鞋',
      'scissors.taobao.seller': '上海老字号运动鞋专营店',
      'scissors.taobao.balance': '账户余额',
      'scissors.taobao.buy': '立即购买',
      'scissors.taobao.orderSuccess': '下单成功！正在连接卖家…',
      'scissors.taobao.insufficient': '余额不足：当前余额只有商品价格的一半。',
      'scissors.smart.title': '智能剪刀',
      'scissors.smart.question': '检测到可以剪断的事项，是否剪断？',
      'scissors.common.yes': '是',
      'scissors.common.no': '否',
      'scissors.system.title': 'Windows 系统消息',
      'scissors.system.disconnected': '网络连接已中断',
      'scissors.system.sleepPrompt': '订单已提交，但当前无法连接到网络。单击“确定”启动屏幕保护程序。',
      'scissors.system.confirmSleep': '确定并休眠',
      'homeDoorTV.camera': '家门口 · 楼道摄像头 1',
      'homeDoorTV.feedAlt': '第一幕门口监控画面：楼道正常，快递已送达',
      'homeDoorTV.deliveryNotice': '楼道状态正常。门口有 1 件已送达快递，快递员已正常离开。',
      'homeDoorTV.online': '摄像头在线 · 楼道正常',
      'homeDoorTV.recording': '录像状态：正常 · 无异常事件',
    },
    en: {
      'scissors.standby.title': 'Windows is standing by',
      'scissors.standby.hint': 'Click or press any key to wake',
      'scissors.productName': 'Smart Scissors 1.0',
    },
  },
};

const storyFileSystem: Record<string, FileNode> = {
  我的文档: {
    type: 'folder',
    name: '我的文档',
    icon: 'folder',
    children: {
      回忆: {
        type: 'folder',
        name: '回忆',
        icon: 'folder',
        locked: true,
        password: '0904',
        children: {
          '和妈妈在家.jpg': {
            type: 'file',
            name: '和妈妈在家.jpg',
            icon: 'image',
            app: 'PhotoViewer',
            content: memoryMotherSonIndoors,
            description: '和妈妈在家里的合照',
          },
          '和妈妈在公园.jpg': {
            type: 'file',
            name: '和妈妈在公园.jpg',
            icon: 'image',
            app: 'PhotoViewer',
            content: memoryMotherSonOutdoors,
            description: '和妈妈在公园里的合照',
          },
          '雨天的校门口.jpg': {
            type: 'file',
            name: '雨天的校门口.jpg',
            icon: 'image',
            app: 'PhotoViewer',
            content: memorySchoolRegret,
            description: '争吵后，妈妈没能叫住小运',
          },
          '离开家的那天.jpg': {
            type: 'file',
            name: '离开家的那天.jpg',
            icon: 'image',
            app: 'PhotoViewer',
            content: memorySonLeaving,
            description: '小运离开家时，妈妈握着旧照片',
          },
          '最后一顿饭.jpg': {
            type: 'file',
            name: '最后一顿饭.jpg',
            icon: 'image',
            app: 'PhotoViewer',
            content: memoryMotherLastSmile,
            description: '妈妈最后一次对镜头露出微笑',
          },
          '妈妈的遗照.jpg': {
            type: 'file',
            name: '妈妈的遗照.jpg',
            icon: 'image',
            app: 'PhotoViewer',
            content: memoryMotherMemorial,
            description: '妈妈神情肃穆的黑白遗照',
          },
          '妈妈的遗书.jpg': {
            type: 'file',
            name: '妈妈的遗书.jpg',
            icon: 'image',
            app: 'PhotoViewer',
            content: memoryMotherFinalNote,
            description: '妈妈留下的最后一句话：我失望的人生。',
          },
        },
      },
    },
  },
  腾讯QQ: { type: 'app_shortcut', name: '腾讯QQ', app: 'QQ', icon: 'qq' },
  'Internet Explorer': {
    type: 'app_shortcut',
    name: 'Internet Explorer',
    app: 'InternetExplorer',
    icon: 'ie',
    url: 'http://www.taobao.com/',
  },
  图片查看器: { type: 'app_shortcut', name: '图片查看器', app: 'PhotoViewer', icon: 'image' },
  家门卫视: {
    type: 'app_shortcut',
    name: '家门卫视',
    app: 'HomeDoorTV',
    icon: 'security_center',
  },
  Photoshop: { type: 'app_shortcut', name: 'Adobe Photoshop CS2', app: 'Photoshop', icon: photoshopIcon },
  '十三岁生日.jpg': {
    type: 'file',
    name: '十三岁生日.jpg',
    icon: 'image',
    app: 'PhotoViewer',
    content: memoryThirteenthBirthday,
    ctime: '2001-09-04T20:13:00+08:00',
    mtime: '2001-09-04T20:13:00+08:00',
    atime: '2006-08-12T20:36:00+08:00',
    description: '十三岁生日那天，妈妈在蛋糕前落泪',
  },
  '待处理图片.jpg': {
    type: 'file',
    name: '待处理图片.jpg',
    icon: 'image',
    app: 'PhotoViewer',
    content: familyPhotoBlurred,
    mtime: '2006-08-12T20:36:00+08:00',
    description: '2006-08-12 家庭合照（待处理）',
  },
  '购物清单.txt': {
    type: 'file',
    name: '购物清单.txt',
    icon: 'notepad',
    app: 'Notepad',
    content: '购物清单\r\n============\r\n\r\n□ 回力鞋 × 1 双\r\n',
  },
};

export const ScissorsExperience: React.FC = () => {
  const xp = useRef<XPHandle>(null);
  const [act, setAct] = useState<1 | 2 | 3 | 4>(1);
  const [installed, setInstalled] = useState(false);
  const [balance, setBalance] = useState(99);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [groupAccepted, setGroupAccepted] = useState(false);
  const [groupCut, setGroupCut] = useState(false);
  const [groupMessages, setGroupMessages] = useState<FamilyMessage[]>([]);
  const [groupWindowOpen, setGroupWindowOpenState] = useState(false);
  const [groupPrompt, setGroupPrompt] = useState(false);
  const [actOneAwakened, setActOneAwakened] = useState(false);
  const [actTwoAwakened, setActTwoAwakened] = useState(false);
  const [auntUnread, setAuntUnread] = useState(false);
  const [photoSelected, setPhotoSelected] = useState(false);
  const [photoCut, setPhotoCut] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [networkPrompt, setNetworkPrompt] = useState(false);
  const [actThreeAwakened, setActThreeAwakened] = useState(false);
  const [friendRequest, setFriendRequest] = useState(false);
  const [identityPrompt, setIdentityPrompt] = useState(false);
  const [finaleStarted, setFinaleStarted] = useState(false);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [actFourNewsAlert, setActFourNewsAlert] = useState(false);
  const [finalAdVisible, setFinalAdVisible] = useState(false);
  const [photoPrompt, setPhotoPrompt] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<'waiting' | 'delivering'>('waiting');
  const [deliveryTracked, setDeliveryTracked] = useState(false);
  const [doorAlert, setDoorAlert] = useState(false);
  const [courierAtDoor, setCourierAtDoor] = useState(false);
  const adOpened = useRef(false);
  const actRef = useRef<1 | 2 | 3 | 4>(1);
  const identityCutRef = useRef(false);
  const identityPromptTriggeredRef = useRef(false);
  const actThreeAwakenedRef = useRef(false);
  const actFourPendingRef = useRef(false);
  const workReplyCursorRef = useRef<Record<string, number>>({});
  const xiaoyuRepliedRef = useRef(false);
  const auntPhotoRequestSentRef = useRef(false);

  // QQ keeps its live session in an external store so separate QQ windows can
  // share it. A new story run must explicitly replace that session; otherwise
  // messages and attachments from the previous run survive the remount.
  useEffect(() => {
    xp.current?.qq.loadProfile(storyQQProfile);
  }, []);

  useEffect(() => {
    const actName = act === 1 ? '一' : act === 2 ? '二' : act === 3 ? '三' : '四';
    document.title = `剪刀 · 第${actName}幕`;
  }, [act]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => window.dispatchEvent(new Event(START_SCREEN_SAVER_EVENT)),
      50
    );
    return () => window.clearTimeout(timer);
  }, []);

  const handleEvent = useCallback((event: XPEvent) => {
    if (event.type === 'ui:action' && event.appId === 'QQ') {
      if (event.control === 'group-window-open') {
        setGroupWindowOpenState(event.value === true);
        return;
      }
      if (event.control === 'group-message') {
        const count = typeof event.value === 'number' ? event.value : 0;
        setGroupMessages(FAMILY_MESSAGES.slice(0, count).map((message, index) => ({
          ...message,
          id: index + 1,
        })));
        return;
      }
    }
    if (
      event.type === 'qq:message' &&
      event.direction === 'outgoing' &&
      actRef.current === 3 &&
      identityCutRef.current
    ) {
      if (event.buddyId === 'xiaoyu') {
        if (xiaoyuRepliedRef.current) return;
        xiaoyuRepliedRef.current = true;
        xp.current?.qq.setTyping('xiaoyu', true);
        window.setTimeout(() => {
          xp.current?.qq.setTyping('xiaoyu', false);
          xp.current?.qq.sendMessage('xiaoyu', '我记得你，小运。可他们好像都不记得了。你到底做了什么？');
        }, 1200);
        return;
      }
      const buddyId = event.buddyId;
      xp.current?.qq.setTyping(buddyId, true);
      window.setTimeout(() => {
        xp.current?.qq.setTyping(buddyId, false);
        xp.current?.qq.sendMessage(buddyId, FORGOTTEN_REPLIES[buddyId] ?? DEFAULT_FORGOTTEN_REPLY);
      }, 1000);
      return;
    }
    if (
      event.type === 'qq:message' &&
      event.direction === 'outgoing' &&
      actRef.current === 3 &&
      !identityCutRef.current &&
      PRE_CUT_WORK_REPLIES[event.buddyId]
    ) {
      const buddyId = event.buddyId;
      const replies = PRE_CUT_WORK_REPLIES[buddyId];
      const cursor = workReplyCursorRef.current[buddyId] ?? 0;
      workReplyCursorRef.current[buddyId] = cursor + 1;
      xp.current?.qq.setTyping(buddyId, true);
      window.setTimeout(() => {
        xp.current?.qq.setTyping(buddyId, false);
        xp.current?.qq.sendMessage(buddyId, replies[cursor % replies.length]);
      }, 900);
      return;
    }
    if (
      event.type === 'qq:message' &&
      event.direction === 'outgoing' &&
      event.buddyId === 'aunt' &&
      event.attachment?.name === '家庭合照-已修复.jpg'
    ) {
      window.setTimeout(() => setNetworkPrompt(true), 700);
      return;
    }
    if (event.type !== 'screensaver:stop') return;
    if (actRef.current === 1 && !adOpened.current) {
      adOpened.current = true;
      setActOneAwakened(true);
      window.setTimeout(() => {
        xp.current?.openApp('QQ');
        xp.current?.openApp('ScissorsAd');
      }, 100);
      return;
    }
    if (actRef.current === 2) {
      setActTwoAwakened(true);
      window.setTimeout(() => xp.current?.openApp('QQ'), 180);
      return;
    }
    if (actRef.current === 3 && !actThreeAwakenedRef.current) {
      actThreeAwakenedRef.current = true;
      setActThreeAwakened(true);
      return;
    }
    if (actRef.current === 3 && actFourPendingRef.current) {
      actFourPendingRef.current = false;
      actRef.current = 4;
      setAct(4);
      setActFourNewsAlert(true);
      xp.current?.clock.set('2006-08-13T15:42:00+08:00');
    }
  }, []);

  const openInstaller = useCallback(() => xp.current?.openApp('ScissorsInstaller'), []);
  const finishInstall = useCallback(() => setInstalled(true), []);
  const completeOrder = useCallback(() => {
    setBalance(0);
    setOrderPlaced(true);
  }, []);
  const enterActTwo = useCallback(() => {
    actRef.current = 2;
    setActTwoAwakened(false);
    setAct(2);
    xp.current?.clock.set('2006-08-13T08:06:00+08:00');
  }, []);

  useEffect(() => {
    if (!actOneAwakened) return undefined;
    const timers: number[] = [];
    const later = (delay: number, action: () => void) => {
      timers.push(window.setTimeout(action, delay));
    };

    later(550, () => xp.current?.qq.setTyping('aunt', true));
    later(1500, () => {
      xp.current?.qq.setTyping('aunt', false);
      xp.current?.qq.sendMessage('aunt', ACT_ONE_AUNT_MESSAGES[0]);
    });
    later(2350, () => xp.current?.qq.setTyping('aunt', true));
    later(3200, () => {
      xp.current?.qq.setTyping('aunt', false);
      xp.current?.qq.sendMessage('aunt', ACT_ONE_AUNT_MESSAGES[1]);
    });

    return () => {
      timers.forEach(timer => window.clearTimeout(timer));
      xp.current?.qq.setTyping('aunt', false);
    };
  }, [actOneAwakened]);

  // Group delivery belongs to the story runtime, so it continues while the
  // QQ window is closed. Reopening the chat therefore shows the messages that
  // arrived in the background instead of restarting the conversation.
  useEffect(() => {
    if (!groupAccepted || groupCut || groupMessages.length >= FAMILY_MESSAGES.length) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setGroupMessages(current => {
        if (current.length >= FAMILY_MESSAGES.length) return current;
        return FAMILY_MESSAGES.slice(0, current.length + 1).map((message, index) => ({
          ...message,
          id: index + 1,
        }));
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [groupAccepted, groupCut, groupMessages.length]);
  const openGroup = useCallback(() => {
    window.dispatchEvent(new Event('windows-xp:qq-open-group-chat'));
  }, []);
  const acceptGroup = useCallback(() => {
    setGroupAccepted(true);
    window.setTimeout(openGroup, 80);
  }, [openGroup]);
  const setGroupWindowOpen = useCallback((open: boolean) => setGroupWindowOpenState(open), []);
  const cutGroup = useCallback(() => {
    setGroupCut(true);
    setGroupPrompt(false);
    window.dispatchEvent(new Event('scissors:qq-group-disconnect'));
    window.setTimeout(() => {
      if (auntPhotoRequestSentRef.current) return;
      auntPhotoRequestSentRef.current = true;
      setAuntUnread(true);
      xp.current?.qq.sendMessage('aunt', '小运，照片处理好了吗？');
    }, 1400);
  }, []);
  const markAuntRead = useCallback(() => {
    setAuntUnread(false);
    xp.current?.qq.open('aunt');
  }, []);
  const selectPhoto = useCallback(() => {
    setPhotoSelected(true);
    if (actRef.current === 2) window.setTimeout(() => setPhotoPrompt(true), 350);
  }, []);
  const cutPhoto = useCallback(() => {
    setPhotoCut(true);
    setPhotoPrompt(false);
  }, []);
  const savePhoto = useCallback(() => {
    if (!photoCut || photoSaved) return;
    xp.current?.fs.createFile(['家庭合照-已修复.jpg'], {
      type: 'file',
      name: '家庭合照-已修复.jpg',
      icon: 'image',
      app: 'PhotoViewer',
      content: familyPhotoClear,
      mtime: '2006-08-13T10:16:00+08:00',
      description: 'Photoshop 修复后的家庭合照',
    });
    setPhotoSaved(true);
  }, [photoCut, photoSaved]);
  const enterActThree = useCallback(() => {
    setNetworkPrompt(false);
    actRef.current = 3;
    setAct(3);
    setGroupMessages(FAMILY_MESSAGES.map((message, index) => ({ ...message, id: index + 1 })));
    xp.current?.clock.set('2006-08-13T10:18:00+08:00');
    xp.current?.qq.setBlockedByBuddy('xiaoyu', false);
    window.dispatchEvent(new Event(START_SCREEN_SAVER_EVENT));
  }, []);
  const acceptNewFriend = useCallback(() => {
    setFriendRequest(false);
    xp.current?.qq.open('new-colleague');
  }, []);
  const cutIdentity = useCallback(() => {
    identityCutRef.current = true;
    setIdentityPrompt(false);
    setFinaleStarted(true);
  }, []);
  const declineIdentity = useCallback(() => {
    setIdentityPrompt(false);
    setWebcamOpen(false);
    xp.current?.windows.list().forEach(windowInfo => {
      if (windowInfo.appId === 'StoryWebcam') xp.current?.closeWindow(windowInfo.id);
    });
    actFourPendingRef.current = true;
    window.setTimeout(() => window.dispatchEvent(new Event(START_SCREEN_SAVER_EVENT)), 250);
  }, []);
  const openActFourNews = useCallback(() => {
    setActFourNewsAlert(false);
    xp.current?.openApp('StoryTencentNews');
  }, []);
  const reachNewsEnd = useCallback(() => setFinalAdVisible(true), []);
  const finishGame = useCallback(() => {
    setFinalAdVisible(false);
    xp.current?.shell.setTaskbarVisible(false);
    xp.current?.session.shutdown();
  }, []);

  useEffect(() => {
    if (!finaleStarted) return undefined;
    const timers: number[] = [];
    const later = (delay: number, action: () => void) => {
      timers.push(window.setTimeout(action, delay));
    };
    const closeApps = (appIds: string[]) => {
      xp.current?.windows.list().forEach(windowInfo => {
        if (appIds.includes(windowInfo.appId)) xp.current?.closeWindow(windowInfo.id);
      });
    };

    closeApps(['StoryWebcam']);
    const qqWindowId = xp.current?.qq.open();
    xp.current?.windows.list().forEach(windowInfo => {
      if (windowInfo.appId === 'QQ' && windowInfo.id !== qqWindowId) {
        xp.current?.closeWindow(windowInfo.id);
      }
    });

    // Let the player read Xiaoyu's latest message before the deletion sequence.
    // Her conversation is deliberately kept until every other buddy is gone.
    later(300, () => xp.current?.qq.open('xiaoyu'));

    const buddyIds = storyQQProfile.buddies
      .map(buddy => buddy.id)
      .filter(buddyId => buddyId !== 'xiaoyu');
    const buddyDeletionStart = 2800;
    buddyIds.forEach((buddyId, index) => {
      later(buddyDeletionStart + index * 700, () => xp.current?.qq.removeBuddy(buddyId));
    });

    const xiaoyuDeletionAt = buddyDeletionStart + buddyIds.length * 700 + 400;
    later(xiaoyuDeletionAt, () => {
      xp.current?.windows.list().forEach(windowInfo => {
        if (windowInfo.appId === 'QQ' && windowInfo.title.includes('小雨')) {
          xp.current?.closeWindow(windowInfo.id);
        }
      });
      xp.current?.qq.removeBuddy('xiaoyu');
    });

    const afterBuddies = xiaoyuDeletionAt;
    later(afterBuddies + 1100, () => xp.current?.fs.deleteFile(['家庭合照-已修复.jpg']));
    later(afterBuddies + 1900, () => xp.current?.fs.deleteFile(['待处理图片.jpg']));
    later(afterBuddies + 2700, () => xp.current?.fs.deleteFile(['十三岁生日.jpg']));
    later(afterBuddies + 3600, () => xp.current?.openFile(['我的文档']));
    later(afterBuddies + 4700, () => {
      xp.current?.fs.unlockNode(['我的文档', '回忆']);
      xp.current?.openApp('Explorer', { initialPath: ['我的文档', '回忆'] });
    });

    const memoryFiles = [
      '和妈妈在家.jpg',
      '和妈妈在公园.jpg',
      '雨天的校门口.jpg',
      '离开家的那天.jpg',
      '最后一顿饭.jpg',
      '妈妈的遗照.jpg',
      '妈妈的遗书.jpg',
    ];
    const memoryBeatMs = 4200;
    memoryFiles.forEach((fileName, index) => {
      const openAt = afterBuddies + 6000 + index * memoryBeatMs;
      later(openAt, () => xp.current?.openFile(['我的文档', '回忆', fileName]));
      later(openAt + 3300, () => xp.current?.fs.deleteFile(['我的文档', '回忆', fileName]));
      later(openAt + 3800, () => closeApps(['PhotoViewer']));
    });
    later(afterBuddies + 6000 + memoryFiles.length * memoryBeatMs + 700, () => {
      xp.current?.shell.setTaskbarVisible(false);
      xp.current?.session.shutdown();
    });

    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [finaleStarted]);

  useEffect(() => {
    if (!actThreeAwakened) return undefined;
    const colleagueTimer = window.setTimeout(() => {
      xp.current?.qq.sendMessage(
        'xiaobei',
        '最近身体好点了吗？昨晚那版我看过了，人物头发边缘还有一点发硬，蒙版再柔一点就行。'
      );
    }, 900);
    const supervisorTimer = window.setTimeout(() => {
      xp.current?.qq.sendMessage(
        'supervisor-chen',
        '部门今天来了个新同事，我让他等会儿加你。你把昨天那套图的分层规范和链接素材发给他。'
      );
    }, 3200);
    const requestTimer = window.setTimeout(() => setFriendRequest(true), 5600);
    return () => {
      window.clearTimeout(colleagueTimer);
      window.clearTimeout(supervisorTimer);
      window.clearTimeout(requestTimer);
    };
  }, [actThreeAwakened]);
  const trackDelivery = useCallback(() => setDeliveryTracked(true), []);
  const cutDelivery = useCallback(() => {
    setDeliveryStatus('delivering');
    window.setTimeout(() => {
      setCourierAtDoor(true);
      setDoorAlert(true);
    }, 10000);
  }, []);
  const openDoorCamera = useCallback(() => {
    setDoorAlert(false);
    xp.current?.openApp('HomeDoorTV');
  }, []);

  useEffect(() => {
    if (groupCut || groupMessages.length !== Math.ceil(FAMILY_MESSAGES.length * 0.7)) return;
    setGroupPrompt(true);
  }, [groupCut, groupMessages.length]);

  useEffect(() => {
    if (groupCut || groupMessages.length !== FAMILY_MESSAGES.length) return undefined;
    const timer = window.setTimeout(() => {
      if (auntPhotoRequestSentRef.current) return;
      auntPhotoRequestSentRef.current = true;
      setAuntUnread(true);
      xp.current?.qq.sendMessage('aunt', '小运，照片处理好了吗？');
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [groupCut, groupMessages.length]);

  useEffect(() => {
    if (act !== 3 || groupMessages.length >= FAMILY_MESSAGES.length + ACT_THREE_GROUP_MESSAGES.length) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setGroupMessages(current => {
        const all = [...FAMILY_MESSAGES, ...ACT_THREE_GROUP_MESSAGES];
        if (current.length >= all.length) return current;
        return all.slice(0, current.length + 1).map((message, index) => ({ ...message, id: index + 1 }));
      });
    }, 2200);
    return () => window.clearInterval(timer);
  }, [act, groupMessages.length]);

  useEffect(() => {
    if (act !== 3) return undefined;
    let auntPhotoTimer: number | undefined;
    let webcamTimer: number | undefined;
    let auntQuestionTimer: number | undefined;
    let xiaoyuTimer: number | undefined;
    let xiaoyuSecondTimer: number | undefined;
    let identityPromptTimer: number | undefined;
    const timer = window.setTimeout(() => {
      xp.current?.qq.sendMessage('aunt', '你是谁？');
      auntPhotoTimer = window.setTimeout(() => {
        xp.current?.qq.receiveImage('aunt', '我们家的合照.jpg', familyPhotoWithoutXiaoyun);
        webcamTimer = window.setTimeout(() => {
          setWebcamOpen(true);
          xp.current?.openApp('StoryWebcam');
        }, 650);
        auntQuestionTimer = window.setTimeout(() => {
          xp.current?.qq.sendMessage('aunt', '你为什么会有我们家的合照？');
        }, 900);
        xiaoyuTimer = window.setTimeout(() => {
          xp.current?.qq.sendMessage('xiaoyu', '你到底剪断了什么？');
          xiaoyuSecondTimer = window.setTimeout(() => {
            xp.current?.qq.sendMessage('xiaoyu', '你先来我这，我们当面说。');
            identityPromptTimer = window.setTimeout(() => {
              if (identityCutRef.current || identityPromptTriggeredRef.current) return;
              identityPromptTriggeredRef.current = true;
              setIdentityPrompt(true);
            }, 1000);
          }, 10000);
        }, 1800);
      }, 1200);
    }, 30000);
    return () => {
      window.clearTimeout(timer);
      if (auntPhotoTimer !== undefined) window.clearTimeout(auntPhotoTimer);
      if (webcamTimer !== undefined) window.clearTimeout(webcamTimer);
      if (auntQuestionTimer !== undefined) window.clearTimeout(auntQuestionTimer);
      if (xiaoyuTimer !== undefined) window.clearTimeout(xiaoyuTimer);
      if (xiaoyuSecondTimer !== undefined) window.clearTimeout(xiaoyuSecondTimer);
      if (identityPromptTimer !== undefined) window.clearTimeout(identityPromptTimer);
    };
  }, [act]);

  const runtime = useMemo<StoryRuntime>(() => ({
    act,
    installed,
    balance,
    orderPlaced,
    groupAccepted,
    groupCut,
    groupMessages,
    groupWindowOpen,
    auntUnread,
    photoSelected,
    photoCut,
    photoSaved,
    deliveryStatus,
    deliveryTracked,
    doorAlert,
    courierAtDoor,
    webcamOpen,
    openInstaller,
    finishInstall,
    completeOrder,
    enterActTwo,
    acceptGroup,
    openGroup,
    setGroupWindowOpen,
    cutGroup,
    markAuntRead,
    selectPhoto,
    cutPhoto,
    savePhoto,
    trackDelivery,
    cutDelivery,
    openDoorCamera,
    reachNewsEnd,
  }), [
    act,
    acceptGroup,
    auntUnread,
    balance,
    completeOrder,
    cutGroup,
    cutPhoto,
    courierAtDoor,
    cutDelivery,
    deliveryStatus,
    deliveryTracked,
    doorAlert,
    enterActTwo,
    finishInstall,
    groupAccepted,
    groupCut,
    groupMessages,
    groupWindowOpen,
    installed,
    markAuntRead,
    openGroup,
    openDoorCamera,
    openInstaller,
    orderPlaced,
    photoCut,
    photoSaved,
    photoSelected,
    selectPhoto,
    savePhoto,
    setGroupWindowOpen,
    trackDelivery,
    webcamOpen,
    reachNewsEnd,
  ]);

  const activeStoryContentPack = useMemo<ContentPack>(() => ({
    ...storyContentPack,
    qqArchives: storyContentPack.qqArchives?.map(archive => ({
      ...archive,
      conversations: archive.conversations.map(conversation =>
        conversation.id !== 'family-group'
          ? conversation
          : {
              ...conversation,
              revealIntervalMs: undefined,
              messages: groupMessages.map((message, index) => ({
                id: `family-${index + 1}`,
                senderId: message.mine ? storyQQProfile.me.number : message.sender,
                senderName: message.mine ? storyQQProfile.me.nickname : message.sender,
                sentAt: `2006-08-13T${act === 3 ? '10' : '08'}:${String(7 + Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}+08:00`,
                text: message.text,
              })),
            }
      ),
    })) ?? [],
  }), [act, groupMessages]);

  const activeFileSystem = useMemo<Record<string, FileNode>>(
    () =>
      photoSaved
        ? {
            ...storyFileSystem,
            '待处理图片.jpg': {
              ...storyFileSystem['待处理图片.jpg'],
              content: familyPhotoClear,
              description: '2006-08-12 家庭合照（已修复）',
            } as FileNode,
            '家庭合照-已修复.jpg': {
              type: 'file',
              name: '家庭合照-已修复.jpg',
              icon: 'image',
              app: 'PhotoViewer',
              content: familyPhotoClear,
              mtime: '2006-08-13T10:16:00+08:00',
              description: 'Photoshop 修复后的家庭合照',
            },
          }
        : storyFileSystem,
    [photoSaved]
  );

  return (
    <StoryContext.Provider value={runtime}>
      <StoryShell>
        <StoryGlobalStyle />
        <AppProviders
          handleRef={xp}
          onEvent={handleEvent}
          language="zh"
          cultures={[storyCulture]}
          apps={storyApps}
          contentPacks={[activeStoryContentPack]}
          customFileSystem={activeFileSystem}
          fileSystemMode="replace"
          persistence="none"
          storagePrefix="scissors_act_one_"
          skipBoot
          autoLogin
          disableScreenSaver
          powerSequence={{ blackoutAfterMs: 600, reload: 'manual' }}
          clock={{ initialTime: '2006-08-12T22:08:00+08:00', timezone: 'Asia/Shanghai', mode: 'frozen' }}
        />
        {doorAlert && (
          <DoorToast onClick={openDoorCamera}>
            <strong>家门卫视 · 异常提醒</strong>
            检测到门口出现陌生人，点击查看实时画面。
          </DoorToast>
        )}
        {act === 2 && actTwoAwakened && !groupAccepted && !groupPrompt && !photoPrompt && (
          <SmartPrompt role="dialog" aria-label="家庭QQ群邀请">
            <SmartTitle>腾讯QQ · 群邀请</SmartTitle>
            <SmartBody><div><strong>姨妈</strong>邀请你加入群“相亲相爱一家人”。</div></SmartBody>
            <PromptActions><XPButton onClick={acceptGroup}>同意</XPButton><XPButton>拒绝</XPButton></PromptActions>
          </SmartPrompt>
        )}
        {networkPrompt && (
          <SmartPrompt role="dialog" aria-label="网络连接已中断">
            <SmartTitle>Windows 系统消息</SmartTitle>
            <SmartBody><div><strong>网络连接已中断</strong><br />图片发送完成，但 QQ 与服务器的连接突然中断。</div></SmartBody>
            <PromptActions><XPButton onClick={enterActThree}>确定</XPButton></PromptActions>
          </SmartPrompt>
        )}
        {act === 3 && friendRequest && (
          <SmartPrompt role="dialog" aria-label="好友申请">
            <SmartTitle>腾讯QQ · 好友申请</SmartTitle>
            <SmartBody><div><strong>新同事（906271）</strong>请求加你为好友。</div></SmartBody>
            <PromptActions><XPButton onClick={acceptNewFriend}>同意</XPButton><XPButton onClick={() => setFriendRequest(false)}>拒绝</XPButton></PromptActions>
          </SmartPrompt>
        )}
        {act === 3 && identityPrompt && (
          <SmartPrompt role="dialog" aria-label="智能剪刀">
            <SmartTitle>智能剪刀</SmartTitle>
            <SmartBody><ScissorsMark>✂</ScissorsMark><div>检测到可以剪断的目标，是否剪断？</div></SmartBody>
            <PromptActions><XPButton onClick={cutIdentity}>是</XPButton><XPButton onClick={declineIdentity}>否</XPButton></PromptActions>
          </SmartPrompt>
        )}
        {act === 4 && actFourNewsAlert && (
          <ActFourQQButton onClick={openActFourNews} aria-label="打开腾讯新闻">
            <XPIcon name="qq" size={32} />
            <span>腾讯QQ · 新闻快讯</span>
          </ActFourQQButton>
        )}
        {act === 4 && finalAdVisible && (
          <FinalScissorsAd onClick={finishGame} role="dialog" aria-label="智慧剪刀">
            <strong>智慧剪刀</strong>
            <span>✂ 剪掉不需要的一切~</span>
            <small>单击继续</small>
          </FinalScissorsAd>
        )}
        {act === 2 && !doorAlert && !groupWindowOpen && (auntUnread || (groupAccepted && groupMessages.length > 0 && !groupCut)) && !groupPrompt && !photoPrompt && (
          <QQToast onClick={() => auntUnread ? markAuntRead() : openGroup()}>
            <strong>腾讯QQ · 新消息</strong>
            {auntUnread
              ? '大姨：小运，照片处理好了吗？'
              : `${groupMessages[groupMessages.length - 1]?.sender}：${groupMessages[groupMessages.length - 1]?.text}`}
          </QQToast>
        )}
        {groupPrompt && !groupCut && (
          <SmartPrompt role="dialog" aria-label="智能剪刀">
            <SmartTitle>智能剪刀</SmartTitle>
            <SmartBody><ScissorsMark>✂</ScissorsMark><div>检测到可以剪断的事项，是否剪断？</div></SmartBody>
            <PromptActions><XPButton onClick={cutGroup}>是</XPButton><XPButton onClick={() => setGroupPrompt(false)}>否</XPButton></PromptActions>
          </SmartPrompt>
        )}
        {photoPrompt && !photoCut && (
          <SmartPrompt role="dialog" aria-label="智能剪刀">
            <SmartTitle>智能剪刀</SmartTitle>
            <SmartBody><ScissorsMark>✂</ScissorsMark><div>检测到可以剪断的事项，是否剪断？</div></SmartBody>
            <PromptActions><XPButton onClick={cutPhoto}>是</XPButton><XPButton onClick={() => setPhotoPrompt(false)}>否</XPButton></PromptActions>
          </SmartPrompt>
        )}
      </StoryShell>
    </StoryContext.Provider>
  );
};

export default ScissorsExperience;
