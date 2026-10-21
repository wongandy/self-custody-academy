const KEY_ROWS: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.7],
  [1.7, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.7],
  [2.1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.1],
  [1.4, 1.4, 1.2, 6.5, 1.2, 1.4, 1.4],
];

// Purely decorative laptop base — the keys are not interactive.
function LaptopKeyboard() {
  return (
    <div className="laptop-keyboard" aria-hidden="true">
      <div className="laptop-kb-deck">
        {KEY_ROWS.map((row, rowIndex) => (
          <div className="laptop-kb-row" key={rowIndex}>
            {row.map((grow, keyIndex) => (
              <span
                key={keyIndex}
                className={`laptop-kb-key${keyIndex === 3 && rowIndex === 3 ? ' laptop-kb-key-space' : ''}`}
                style={{ flexGrow: grow }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LaptopKeyboard;
