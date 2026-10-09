---
name: mentor-nudge-system
description: Guides learners back on track when they press the wrong button on an interactive device during a guided scenario. Use whenever building or modifying a scenario with a mentor character and interactive device UIs (hardware wallet, exchange panel, phone) where the learner could press buttons that aren't part of the current step. Triggers on requests like "add nudges", "prevent wrong actions", "guide the user", "don't let them click that yet", or any scenario where a mentor gives step-by-step instructions alongside clickable controls.
---

# Mentor Nudge System

When a mentor character walks a learner through a step-by-step scenario, the learner may press device buttons that aren't part of the current instruction — turning the wallet off mid-setup, selecting the wrong menu item, or hitting cancel during word entry. The nudge system catches those actions and shows a brief, friendly correction message from the mentor instead of letting the action execute, so the learner stays focused on the current step without feeling punished.

## How the two sides connect

The nudge system has two halves that must be wired together:

1. **Scenario component** (the parent) — owns the nudge state, the mentor speech bubble, and the `expectedAction` computation. It passes `onUnexpectedAction`, `expectedAction`, and `locked` down to the device component.

2. **Device component** (the child, e.g. HardwareWallet) — checks every button handler against `expectedAction` before acting. If the action doesn't match, it calls `onUnexpectedAction?.()` and returns early. If `locked` is true, it returns immediately without doing anything at all.

The `locked` prop serves double duty: it freezes the device when the mentor's continue button is active (see the `device-locking-when-mentor-speaking` skill), and it is separate from nudging — locked means "no interaction at all," nudge means "you can interact but wrong actions are gently corrected."

## Scenario-side setup

Define the nudge constants and state at the top of the scenario component:

```tsx
const NUDGE_MESSAGE = "No need to do that now. Let's stick to the plan.";
const NUDGE_DURATION_MS = 1250;

// inside the component:
const [nudgeActive, setNudgeActive] = useState(false);
const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
```

Wire nudge into three things the scenario already computes:

- **`canContinue`** — when nudge is active, set this to `false` so the continue button hides and the learner can't advance past the nudge:
  ```tsx
  const canContinue = nudgeActive
    ? false
    : /* existing continue logic */;
  ```

- **`mentorMessage`** — when nudge is active, show the nudge message instead of the normal mentor line:
  ```tsx
  const mentorMessage = nudgeActive ? NUDGE_MESSAGE : baseMentorMessage;
  ```

- **`bubbleKey`** — change the key to `'nudge'` so the speech bubble re-animates (typewriter restarts) even if the underlying mentor message hasn't changed:
  ```tsx
  const bubbleKey = nudgeActive ? 'nudge' : /* existing key logic */;
  ```

### The unexpected-action handler

```tsx
const handleUnexpectedAction = useCallback(() => {
  setNudgeActive(true);
  if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
  nudgeTimer.current = setTimeout(() => setNudgeActive(false), NUDGE_DURATION_MS);
}, []);
```

### Cleanup effects

Two effects are required to avoid stale timers:

```tsx
// Reset nudge when the device phase changes (learner moved to the right step).
useEffect(() => {
  if (nudgeActive) {
    setNudgeActive(false);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
  }
}, [walletPhase]);

// Clear timer on unmount.
useEffect(() => () => {
  if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
}, []);
```

### Computing `expectedAction`

The scenario derives `expectedAction` from the current device phase so the device knows exactly which action is the "right" one at this moment. Pass it down alongside the handler and lock state:

```tsx
const expectedAction: ExpectedAction =
  walletPhase === 'off'
    ? { type: 'power-on' }
    : walletPhase === 'menu'
      ? { type: 'confirm-menu-item', label: 'Create wallet' }
      : /* ...other phases... */
      : { type: 'none' };

<HardwareWallet
  onUnexpectedAction={handleUnexpectedAction}
  expectedAction={expectedAction}
  locked={canContinue}
  /* ...other props... */
/>
```

Use `{ type: 'none' }` for phases where any button press is acceptable (no nudge needed).

## Device-side setup (HardwareWallet pattern)

### The `ExpectedAction` type

```tsx
export type ExpectedAction =
  | { type: 'power-on' }
  | { type: 'confirm-menu-item'; label: string }
  | { type: 'confirm' }
  | { type: 'none' };
```

- `power-on` — the only correct action is turning the device on.
- `confirm-menu-item` — the learner must confirm a specific menu item by label (e.g. "Create wallet").
- `confirm` — the learner must press the confirm/check button (used during word entry and quiz phases).
- `none` — no expectation; all actions are allowed.

### Props

```tsx
onUnexpectedAction?: () => void;
locked?: boolean;
expectedAction?: ExpectedAction;  // defaults to { type: 'none' }
```

### Button handler pattern

Every button handler follows the same structure: check `locked` first, then check `expectedAction`, then proceed.

```tsx
const handlePower = useCallback(() => {
  if (locked) return;
  if (phase === 'off') {
    startBoot();
    return;
  }
  // Device is already on — powering off isn't the expected action.
  if (expectedAction.type === 'power-on' || expectedAction.type === 'confirm-menu-item' || expectedAction.type === 'confirm') {
    onUnexpectedAction?.();
    return;
  }
  updatePhase('off');
}, [/* deps */]);
```

For menu confirmation, compare the currently highlighted menu item's label to the expected label:

```tsx
const isExpectedMenuItem = useCallback((): boolean => {
  if (expectedAction.type !== 'confirm-menu-item') return true;
  if (phase !== 'menu' && phase !== 'ready-menu') return true;
  const item = menuItems[menuIndex];
  return item && item.label === expectedAction.label;
}, [expectedAction, phase, menuItems, menuIndex]);

const handleEnter = useCallback(() => {
  if (locked) return;
  if (expectedAction.type === 'confirm-menu-item' && (phase === 'menu' || phase === 'ready-menu') && !isExpectedMenuItem()) {
    onUnexpectedAction?.();
    return;
  }
  // ... proceed with normal enter behavior
}, [/* deps */]);
```

For the cancel/X button, nudge when the learner tries to back out of a phase where they should be confirming instead:

```tsx
const handleCancel = useCallback(() => {
  if (locked) return;
  if (expectedAction.type === 'power-on' || expectedAction.type === 'confirm-menu-item') {
    if (phase === 'menu' || phase === 'ready-menu') {
      onUnexpectedAction?.();
      return;
    }
  }
  if (expectedAction.type === 'confirm' && (phase === 'create-intro' || phase === 'create-words' || phase === 'create-quiz')) {
    onUnexpectedAction?.();
    return;
  }
  // ... proceed with normal cancel behavior
}, [/* deps */]);
```

## Which buttons should nudge vs. be silently locked

- **Nudge** (call `onUnexpectedAction`): when the learner presses a button that does something, but it's the wrong something for this step. The mentor briefly corrects them and the action is swallowed. This applies to power, enter/confirm, and cancel when they don't match `expectedAction`.
- **Silently locked** (just `return`): when `locked` is true — the mentor is speaking and the continue button is active. No action at all, no nudge. This is the `device-locking-when-mentor-speaking` skill's domain.
- **Allowed** (proceed normally): when `expectedAction` is `{ type: 'none' }` or the action matches the expectation.

## When not to nudge

- During phases where exploration is the point (e.g. browsing the menu before the mentor gives a specific instruction). Set `expectedAction` to `{ type: 'none' }` in those phases.
- For actions that are genuinely destructive and should be blocked entirely — use `locked` instead of a nudge.
- The nudge message should never shame the learner. "No need to do that now. Let's stick to the plan." is the established tone — gentle, collaborative, forward-looking.

## Example: full wiring in a scenario

```tsx
// Constants
const NUDGE_MESSAGE = "No need to do that now. Let's stick to the plan.";
const NUDGE_DURATION_MS = 1250;

// State
const [nudgeActive, setNudgeActive] = useState(false);
const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

// Derived values
const canContinue = nudgeActive ? false : /* existing logic */;
const mentorMessage = nudgeActive ? NUDGE_MESSAGE : baseMentorMessage;
const bubbleKey = nudgeActive ? 'nudge' : /* existing key */;

// Handler
const handleUnexpectedAction = useCallback(() => {
  setNudgeActive(true);
  if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
  nudgeTimer.current = setTimeout(() => setNudgeActive(false), NUDGE_DURATION_MS);
}, []);

// Cleanup
useEffect(() => {
  if (nudgeActive) {
    setNudgeActive(false);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
  }
}, [walletPhase]);

useEffect(() => () => {
  if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
}, []);

// Expected action from current phase
const expectedAction: ExpectedAction =
  walletPhase === 'off' ? { type: 'power-on' }
  : walletPhase === 'menu' ? { type: 'confirm-menu-item', label: 'Create wallet' }
  : { type: 'none' };

// Pass to device
<HardwareWallet
  onUnexpectedAction={handleUnexpectedAction}
  expectedAction={expectedAction}
  locked={canContinue}
/>
```
