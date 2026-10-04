import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeftRight, ChevronRight, Download, Send } from 'lucide-react';
import andyPortrait from '@/components/Andy.webp';
import mariaPortrait from '@/components/Maria.webp';

type ConnectScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

const HANDOFF_MESSAGES = [
  "Now let's get your hardware wallet connected. But before we do that I'd like to introduce you to a colleague of mine.",
  "She'll be the one to teach you all about the connecting part — I'll let her take it from here.",
];

const MARIA_MESSAGES = [
  "Hi, I'm Maria! I run this academy together with Andy, and I specialise in helping people move their Bitcoin safely.",
  "Now that your hardware wallet is set up and funded, the next step is connecting it to a wallet app on your computer — that's what I'll walk you through.",
];

const WALLET_INTERFACE_MESSAGE = 'This is your wallet interface.';

type Mentor = 'andy' | 'maria';

type WalletTab = 'transactions' | 'send' | 'receive';

const WALLET_TABS: { id: WalletTab; label: string; Icon: typeof Send }[] = [
  { id: 'transactions', label: 'Transactions', Icon: ArrowLeftRight },
  { id: 'send', label: 'Send', Icon: Send },
  { id: 'receive', label: 'Receive', Icon: Download },
];

const WALLET_BALANCE = '0.04998';

const TRANSACTIONS = [
  { date: '2026-09-21 09:48', value: '+0.04998 BTC', balance: '0.04998 BTC', incoming: true },
];

function useTypewriter(text: string, speed = 6) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;

    if (!text) {
      setDone(true);
      return;
    }

    const timer = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(timer);
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, speed);

    timerRef.current = timer;
    return () => clearInterval(timer);
  }, [text, speed]);

  const skip = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayed(text);
    setDone(true);
  }, [text]);

  return { displayed, done, skip };
}

export default function ConnectScenario({ onBack }: ConnectScenarioProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [activeMentor, setActiveMentor] = useState<Mentor>('andy');
  const [laptopVisible, setLaptopVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<WalletTab>('receive');

  const spotlight = !laptopVisible;

  const messages = activeMentor === 'andy' ? HANDOFF_MESSAGES : MARIA_MESSAGES;
  const currentMessage = laptopVisible && activeMentor === 'maria' ? WALLET_INTERFACE_MESSAGE : messages[messageIndex];
  const { displayed, done, skip } = useTypewriter(currentMessage);

  const isLastMessage = messageIndex === messages.length - 1;
  const canContinue = done;
  const portrait = activeMentor === 'andy' ? andyPortrait : mariaPortrait;
  const mentorName = activeMentor === 'andy' ? 'Andy' : 'Maria';
  const activeTabLabel = WALLET_TABS.find((tab) => tab.id === activeTab)?.label ?? '';

  const portraitRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);

  const handleContinue = () => {
    if (!done) {
      skip();
      return;
    }

    if (activeMentor === 'andy' && messageIndex === HANDOFF_MESSAGES.length - 1) {
      setActiveMentor('maria');
      setMessageIndex(0);
      return;
    }

    if (isLastMessage) {
      if (activeMentor === 'maria' && !laptopVisible) {
        if (portraitRef.current && bubbleRef.current) {
          flipRects.current = {
            portrait: portraitRef.current.getBoundingClientRect(),
            bubble: bubbleRef.current.getBoundingClientRect(),
          };
        }
        setLaptopVisible(true);
      }
      return;
    }

    setMessageIndex((current) => current + 1);
  };

  // Maria glides from the large spotlight portrait down to the compact row beneath the wallet window.
  useLayoutEffect(() => {
    if (spotlight || !flipRects.current) return;
    const portraitEl = portraitRef.current;
    const bubbleEl = bubbleRef.current;
    if (!portraitEl || !bubbleEl) return;

    const pFirst = flipRects.current.portrait;
    const bFirst = flipRects.current.bubble;
    const pLast = portraitEl.getBoundingClientRect();
    const bLast = bubbleEl.getBoundingClientRect();
    flipRects.current = null;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const opts: KeyframeAnimationOptions = {
      duration: 560,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    };

    portraitEl.style.transformOrigin = 'top left';
    portraitEl.animate(
      [
        {
          transform: `translate(${pFirst.left - pLast.left}px, ${pFirst.top - pLast.top}px) scale(${pFirst.width / pLast.width}, ${pFirst.height / pLast.height})`,
        },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ],
      opts,
    );

    bubbleEl.style.transformOrigin = 'top left';
    bubbleEl.animate(
      [
        {
          transform: `translate(${bFirst.left - bLast.left}px, ${bFirst.top - bLast.top}px) scale(${bFirst.width / bLast.width}, ${bFirst.height / bLast.height})`,
        },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ],
      opts,
    );
  }, [spotlight]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      e.preventDefault();
      handleContinue();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <main className={`scenario-page scenario-page-fit ${spotlight ? 'scenario-page-spotlight' : 'scenario-page-wallet'}`}>
      <div className={`scenario-mentor-layout ${spotlight ? 'spotlight' : ''}`}>
        {laptopVisible && (
          <div className="wallet-laptop laptop-enter">
            <div className="wallet-window">
              <div className="wallet-window-titlebar">
                <span className="tl-dot red" />
                <span className="tl-dot yellow" />
                <span className="tl-dot green" />
              </div>
              <div className="wallet-window-body">
                <aside className="wallet-sidebar">
                  {WALLET_TABS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      className={`wallet-nav-item ${activeTab === id ? 'active' : ''}`}
                      onClick={() => setActiveTab(id)}
                      aria-pressed={activeTab === id}
                    >
                      <Icon strokeWidth={2.2} />
                      <span className="wallet-nav-label">{label}</span>
                    </button>
                  ))}
                </aside>
                <div className="wallet-canvas">
                  {activeTab === 'transactions' ? (
                    <div key={activeTab} className="wallet-transactions">
                      <div className="wallet-tx-summary">
                        <div className="wallet-tx-summary-item">
                          <span className="wallet-tx-summary-label">Balance</span>
                          <span className="wallet-tx-summary-value">{WALLET_BALANCE} BTC</span>
                        </div>
                        <div className="wallet-tx-summary-item">
                          <span className="wallet-tx-summary-label">Transactions</span>
                          <span className="wallet-tx-summary-value">{TRANSACTIONS.length}</span>
                        </div>
                      </div>
                      <div className="wallet-tx-table-wrap">
                        <table className="wallet-tx-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Value</th>
                              <th>Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {TRANSACTIONS.map((tx) => (
                              <tr key={tx.date}>
                                <td>{tx.date}</td>
                                <td className={tx.incoming ? 'in' : 'out'}>{tx.value}</td>
                                <td>{tx.balance}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p key={activeTab} className="wallet-canvas-placeholder">{activeTabLabel} content coming soon</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mentor-row">
          <div
            key={activeMentor}
            ref={portraitRef}
            className="mentor-portrait mentor-portrait-enter"
            aria-label={`${mentorName}, your mentor`}
            role="img"
          >
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={portrait} alt={`${mentorName}, your mentor`} />
            </div>
            <div className="mentor-portrait-badge">{mentorName}</div>
          </div>
          <div
            ref={bubbleRef}
            className={`mentor-bubble ${canContinue ? 'is-ready' : ''}`}
            onClick={handleContinue}
          >
            <div className="mentor-bubble-content" key={`${activeMentor}-${messageIndex}-${laptopVisible}`}>
              <span className="mentor-bubble-name">{mentorName}</span>
              <div className="mentor-bubble-text-wrap">
                <p className="mentor-bubble-text-ghost">{currentMessage}</p>
                <p className="mentor-bubble-text">
                  {displayed}
                  {!done && <span className="typewriter-cursor" />}
                </p>
              </div>
            </div>
            <button
              className={`bubble-next ${canContinue ? 'ready' : ''}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleContinue();
              }}
              disabled={!canContinue}
              aria-label="Continue"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
