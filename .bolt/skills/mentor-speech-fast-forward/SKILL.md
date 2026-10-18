---
name: mentor-speech-fast-forward
description: Makes a mentor's spoken line skippable everywhere in a guided scenario — clicking the mentor's speech bubble or pressing Enter completes the sentence instantly while it is still typing, then advances the lesson once it has finished. Use whenever building or editing any scenario, mission, briefing, or intro where a mentor character (Andy, Maria, or another) speaks before the learner acts, whenever a typewriter effect types out a mentor message, whenever a learner complains they have to wait for the text to finish, or whenever a scenario's keyboard handling is added or changed. Triggers on requests like "let me skip the text", "Enter should fast-forward", "the typing is too slow", "clicking the bubble does nothing", or "make Enter work here too".
---

# Mentor Speech Fast-Forward

Every scenario that has a mentor speaking uses the same typewriter effect, and every one of them must let the learner skip it. A learner who has already read the line — or is replaying a mission — should never be forced to watch characters appear one at a time.

The rule has two halves and they are easy to get out of step:

- **While the sentence is still typing**, a click on the mentor's speech bubble or a press of Enter completes the sentence instantly. Nothing else happens: the lesson does not move on.
- **Once the sentence has finished**, the same click or key press advances the lesson — the next mentor line, or the handover to the device.

So the same gesture does the "obvious next thing" at all times: finish the text, then move on.

## The implementation

Each scenario owns a `useTypewriter` hook that returns `{ displayed, done, skip }`. `done` is true once the full sentence is on screen; `skip()` clears the interval and reveals the whole sentence at once.

A single `handleContinue` routes both halves, and both the bubble and the Enter key call it:

```tsx
const handleContinue = () => {
  if (!done) {
    skip();          // still typing -> complete the sentence, go no further
    return;
  }
  // sentence finished -> advance the lesson
};
```

Wire it to the bubble and to the keyboard:

```tsx
<div className={`mentor-bubble ${canContinue ? 'is-ready' : ''}`} onClick={handleContinue}>
  {/* ...name, text, and the continue arrow button (stopPropagation + handleContinue)... */}
</div>
```

```tsx
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
```

Two details in that handler are load-bearing:

- The `INPUT` / `TEXTAREA` / `isContentEditable` guard. Scenarios contain real form fields (an address, an amount, a word-entry grid). Enter belongs to the field when the learner is typing in it, and must not hijack the lesson.
- The listener is registered without a dependency array, or with `[handleContinue]` where `handleContinue` is a `useCallback`. A stale `done` in the closure means the first Enter press after the sentence finishes still only calls `skip()` and appears to do nothing, so the learner has to press twice.

## The mistake to avoid

Do not gate Enter on whether the lesson can currently advance. The tempting shortcut is a `canContinue` flag that also drives the continue arrow's enabled state, giving:

```tsx
if (!canContinue) return;   // wrong
```

`canContinue` is false while the sentence is still typing, so this makes Enter completely dead until the text finishes — the exact opposite of the intent, and it silently breaks the fast-forward on that screen only. If a guard is wanted at all, allow the case where the sentence has not finished, because that press can only complete text and can never advance the lesson:

```tsx
if (!canContinue && done) return;   // still typing -> let it through; finished -> respect the gate
```

Even then, prefer `handleContinue`'s own early returns over a `canContinue` check. A `handleContinue` that bails out when the lesson is waiting on the device (a pending connection, an animation in flight, a step the learner must perform) keeps Enter inert at the right moments without coupling the key to the arrow button's visual state.

## What Enter must never do

While the lesson is waiting on the device — "press the power button", "confirm on the device", "plug in the cable" — Enter must do nothing. The learner advances by operating the device, not by pressing a key. Get this right by letting `handleContinue` return early when the next action belongs to the device, rather than by allowing the key to fall through to the advance branch. The `device-locking-when-mentor-speaking` skill covers which device handlers ignore input in the same window.

## Relationship to the other scenario skills

- `flexible-intro-speech` decides *when* the intro ends and control hands to the device; this skill decides how the learner skips the text on the way there. The handover line is the one place where Enter stops advancing, because the device is next.
- `device-locking-when-mentor-speaking` owns the lock that freezes the device while the mentor speaks.
- `mentor-nudge-system` owns the correction shown when the learner presses the wrong device button. A nudge replaces the mentor's line, so it must also be skippable, and the nudge state belongs in the speech bubble's key so the typing animation restarts.

## Checking your work

On every screen with a mentor, confirm all four:

1. Clicking the bubble mid-sentence completes the sentence and does not advance the lesson.
2. Pressing Enter mid-sentence does the same.
3. Once the sentence is finished, the bubble click and the arrow button advance; Enter advances too, unless the device is next.
4. With the lesson waiting on the device, Enter does nothing.
