export type DeviceSwitcherOption<T extends string> = {
  id: T;
  label: string;
};

type DeviceSwitcherProps<T extends string> = {
  options: DeviceSwitcherOption<T>[];
  active: T;
  onSelect: (id: T) => void;
  /** Option Andy is pointing the learner at; it pulses until selected. */
  pulseId?: T | null;
  disabled?: boolean;
};

/**
 * Segmented control for moving between devices on phone-width screens, where
 * only one device fits at a time. It takes the place of the device caption
 * under the active device, so showing it costs no extra height and it doubles
 * as the "you are here" label.
 */
export function DeviceSwitcher<T extends string>({ options, active, onSelect, pulseId, disabled }: DeviceSwitcherProps<T>) {
  return (
    <div className="device-switcher device-switcher-enter" role="group">
      {options.map((option) => {
        const isActive = option.id === active;
        return (
          <button
            key={option.id}
            type="button"
            className={`device-switcher-option${isActive ? ' is-active' : ''}${!isActive && pulseId === option.id ? ' is-pulsing' : ''}`}
            aria-pressed={isActive}
            disabled={disabled && !isActive}
            onClick={() => {
              if (!isActive) onSelect(option.id);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
