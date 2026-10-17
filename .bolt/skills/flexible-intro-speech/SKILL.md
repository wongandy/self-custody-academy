---
name: flexible-intro-speech
description: Makes a mentor-led scenario intro safe to edit — the mentor opens alone in a large centered spotlight with the device hidden, plays each opening line one at a time, and on one named "handover" line the device window slides in and the intro ends. Use whenever building or editing a scenario intro, adding, removing, or reordering the mentor's opening lines, changing which line hands control to the device, or when a device appears partway through an introduction. Also use when an existing scenario reveals its device on a hard-coded sentence number and breaks as soon as a line is added.
---

# Flexible Intro Speech

Guided scenarios open with a mentor (e.g. "Andy") delivering a few lines of setup before the learner touches anything. The device they will use stays hidden during those lines; on one specific line it appears and the intro ends. That handover line is the hinge of the whole intro, and the way you identify it determines whether the intro survives editing.

The failure mode this skill prevents: the reveal is wired to a sentence *number*. Someone adds one sentence to the intro, every downstream number shifts by one, and now the device appears a line early or a line late. The fix is to identify the handover line by its content, not its position.

## The pattern

### 1. Give the handover line its own name

Pull the line that hands control to the device out of the intro list into a named constant, and keep it as the last entry of the list:

```
POWER_ON_MESSAGE = 'Start by clicking the power button to turn it on.'
INTRO_MESSAGES = [ ...setup lines..., POWER_ON_MESSAGE ]
```

The handover line is the one that tells the learner to do the first thing *on the device* — press the power button, select a menu item, copy an address. Everything before it is context the mentor delivers while the device is out of view. Keeping it last means the intro reads top to bottom in the order the learner hears it, and the reveal always lands on the final thing the mentor says before handing over.

### 2. Find the reveal position by lookup, not by counting

Compute the index of the handover line by searching the list for that constant, and fall back to the last entry if it is ever renamed or reworded:

```
POWER_ON_INDEX = indexOf(POWER_ON_MESSAGE), else length - 1
```

Now adding, removing, or reordering the setup lines above the handover line shifts the reveal automatically. This one change is the entire point of the skill — every other step below is driven off this index.

### 3. Drive spotlight and device visibility from that index

Two derived values, both computed from `POWER_ON_INDEX`:

- **Spotlight** — true while the intro is running *and* the current line is before the handover line. In spotlight the mentor is large and centered and the device area is hidden.
- **Device visible** — true once the current line has reached the handover line, and it stays true afterwards.

Never reveal the device on a fixed step count, and never let the spotlight outlive the handover line — the two are opposite sides of the same boundary.

### 4. Gate the continue button on the typing having finished

The continue button is enabled only when the current line has finished typing. While it is still typing, the learner's click should skip to the end of the line rather than advance. During the intro the button is enabled on every line *before* the handover line, so the learner can step through the setup one line at a time; it is not enabled on the handover line itself, because the next action belongs to the device.

### 5. Keep the device locked while the mentor is still talking

The device must ignore input until the mentor has finished the handover line. Two conditions combine:

- Locked while the intro is running and the current line is still typing.
- Locked while the continue button is active (see the `device-locking-when-mentor-speaking` skill).

Without the first condition the learner can click ahead of the mentor on the very line that introduces the device. Without the second they can interact with the device instead of clicking continue at a terminal step. The device unlocks exactly when the handover line has finished typing and the continue button is no longer the expected action.

## Supporting pieces

These make the transition feel deliberate rather than jarring:

- **Capture the mentor's position at the moment of the reveal.** Before the step that moves into the handover line, record the mentor's and speech bubble's on-screen rectangles. After the layout switches out of spotlight, animate from the recorded position to the new one, so the portrait and bubble glide into their smaller resting place instead of jumping. Respect the user's reduced-motion preference and skip the animation when it is set.
- **Restart the speech animation per line.** Key the speech bubble on the current line so each new line replays its reveal rather than continuing mid-animation. Include the nudge state in that key so a nudge restarts the animation too.
- **Advance one line per click.** Stepping through the setup is one click per line. Do not skip lines.
- **Leave the intro automatically once the learner touches the device.** If the device changes state before the handover line, treat the intro as over rather than leaving the mentor stuck on a stale line. This also covers the learner jumping ahead.

## Common mistakes

- **Revealing on a hard-coded sentence number.** The reveal shifts every time a line is added or removed. Always resolve the position from the named handover line.
- **Revealing a line early or late.** The device should appear on the handover line itself, not on the line before or after it. If it is off by one, the index is being computed by count instead of by lookup.
- **Leaving the device clickable while the mentor is still speaking.** The device must be locked until the handover line has finished typing, or the learner acts before being told what to do.
- **Not restarting the speech animation when the line changes.** The next line appears mid-way through, or not at all, because the bubble was not re-keyed.
- **Letting the spotlight persist past the handover line.** The device is visible but still framed as a background element, which reads as a bug.

## Relationship to the other scenario skills

- `device-locking-when-mentor-speaking` owns the *locked* concept — this skill decides *when* the intro ends and the lock releases, that skill decides which device handlers respect the lock.
- `mentor-nudge-system` owns what happens when the learner presses a wrong button after the device is unlocked. The nudge state must be included in the speech bubble key so a nudge restarts the animation.
