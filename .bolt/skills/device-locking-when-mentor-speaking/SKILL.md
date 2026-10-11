---
name: device-locking-when-mentor-speaking
description: Locks background device buttons (hardware wallet, phone, exchange UI) whenever a mentor character is speaking and the continue button is active, so the learner is guided to click continue instead of interacting with devices. Use whenever building or modifying a scenario with a mentor guide and interactive device UIs — especially hardware wallet simulations, exchange/phone panels, or any screen where a character gives instructions alongside clickable hardware or software controls.
---

# Device Locking When Mentor Is Speaking

In guided learning scenarios, a mentor character (e.g. "Andy") gives step-by-step instructions while interactive device UIs are visible in the background. When the mentor finishes speaking and the continue button becomes active, background device buttons must stop responding to clicks — otherwise the learner can wander off the intended path by pressing device buttons instead of clicking continue.

## When to apply

Apply this pattern in any scenario that combines:

- A mentor or guide character whose speech appears in a speech bubble with a continue/checkmark button
- One or more interactive device UIs in the background (hardware wallet with power/up/down/enter/cancel buttons, a phone with exchange form fields, etc.)

If the scenario has a mentor but no interactive devices, this skill doesn't apply. If the scenario has devices but no mentor continue flow, it doesn't apply either.

## The pattern

### 1. Track a `locked` boolean derived from the continue button state

The continue button is active when the mentor has finished delivering the current instruction and the learner is expected to click continue to proceed. Compute a `canContinue` boolean for this, then pass a `locked` prop to each device component:

```tsx
locked={canContinue}
```

When `locked` is `true`, every interactive button on that device must short-circuit at the top of its handler and do nothing:

```tsx
const handleUp = useCallback(() => {
  if (locked) return;
  // ... normal behavior
}, [locked, ...]);
```

Apply the `if (locked) return;` guard to **every** button handler the device exposes: power, up, down, enter/confirm, cancel/back, copy, and any custom action buttons.

### 2. Only lock at terminal states, not during every instruction

The `canContinue` flag may be `true` at moments where the learner still needs to interact with the device (e.g. during an intro step before the device is revealed, or during a sub-instruction sequence). Locking at those moments would prevent the learner from using the device when they need to.

Compute `locked` so it is only `true` when the scenario has reached a genuine terminal or success state where the only valid action is to click continue:

```tsx
// Good — only locks at the final success screen
locked={!isInIntro && !switchIntroStep && exchangeIntroStep === null && exchangeScreen === 'success'}
```

If the scenario has a single terminal state (like a setup scenario), `locked={canContinue}` is sufficient because `canContinue` is only true at that terminal state.

### 3. Visual feedback is optional but helpful

The device buttons can remain visually unchanged when locked — the primary signal is that clicks do nothing. However, if the device supports it, dimming or graying out buttons when locked provides clearer feedback that the device is inactive.

### 4. Lock all devices, not just one

If multiple device UIs are visible simultaneously (e.g. a hardware wallet and a phone exchange panel), pass the same `locked` prop to each device. The learner should not be able to interact with any device while the mentor's continue button is active.

## Examples

### Setup scenario (single terminal state)

In a wallet setup scenario, the mentor walks the learner through powering on, creating a wallet, and confirming a recovery phrase. The continue button is only active at `create-done` and `ready-menu` — both terminal states. Passing `locked={canContinue}` is correct here because `canContinue` is `false` during every step where the learner needs to use the device.

### Withdraw scenario (multiple canContinue points)

In a withdraw scenario, the mentor has intro steps, switch-panel steps, exchange-form steps, and a final success screen. `canContinue` is `true` at several non-terminal points (intro step 0, last switch step, last exchange step). Passing `locked={canContinue}` would incorrectly lock the wallet during those steps. Instead, compute locked to only be true at the success state:

```tsx
locked={!isInIntro && !switchIntroStep && exchangeIntroStep === null && exchangeScreen === 'success'}
```

This lets the learner freely navigate the wallet menu during all instruction phases while still locking it when the withdrawal is submitted and Andy's continue button is the only valid next action.

## Common mistakes

- **Locking too early**: If the learner can't scroll the wallet menu during an intro step, the lock is too aggressive. Narrow the condition to only terminal states.
- **Forgetting a handler**: Every button handler needs the `if (locked) return;` guard. Missing one means that button still works when it shouldn't.
- **Locking only one device**: If both a wallet and a phone are visible, both need the `locked` prop. A learner clicking through the exchange form while the mentor says "click continue" is the same problem.
- **Using `disabled` on the DOM button instead of a handler guard**: The `locked` prop is a concept the component understands. Inside the component, guard the handlers with `if (locked) return;`. You may also set `disabled` on the DOM element for visual feedback, but the handler guard is what actually prevents the action.
