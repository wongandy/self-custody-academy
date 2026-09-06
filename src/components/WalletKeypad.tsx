import { useCallback } from 'react';

type WalletKeypadProps = {
  onKey: (key: string) => void;
  onBackspace: () => void;
  onLeft: () => void;
  onRight: () => void;
  disabled?: boolean;
};

const NUMBER_ROW = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const QWERTY_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

export default function WalletKeypad({ onKey, onBackspace, onLeft, onRight, disabled }: WalletKeypadProps) {
  const handleKey = useCallback(
    (key: string) => {
      if (disabled) return;
      onKey(key);
    },
    [disabled, onKey],
  );

  return (
    <div className="hw-keypad">
      <div className="hw-keypad-row hw-keypad-numbers">
        {NUMBER_ROW.map((key) => (
          <button
            key={key}
            className="hw-key"
            type="button"
            disabled={disabled}
            onClick={() => handleKey(key)}
          >
            {key}
          </button>
        ))}
      </div>
      {QWERTY_ROWS.map((row, i) => (
        <div key={i} className="hw-keypad-row">
          {i === 2 && (
            <button
              className="hw-key hw-key-wide"
              type="button"
              disabled={disabled}
              onClick={onLeft}
              aria-label="Left arrow"
            >
              ←
            </button>
          )}
          {row.map((key) => (
            <button
              key={key}
              className="hw-key"
              type="button"
              disabled={disabled}
              onClick={() => handleKey(key)}
            >
              {key}
            </button>
          ))}
          {i === 2 && (
            <button
              className="hw-key hw-key-wide"
              type="button"
              disabled={disabled}
              onClick={onBackspace}
              aria-label="Backspace"
            >
              ⌫
            </button>
          )}
        </div>
      ))}
      <div className="hw-keypad-row hw-keypad-bottom">
        <button
          className="hw-key hw-key-space"
          type="button"
          disabled={disabled}
          onClick={onRight}
          aria-label="Right arrow / next"
        >
          →
        </button>
      </div>
    </div>
  );
}
