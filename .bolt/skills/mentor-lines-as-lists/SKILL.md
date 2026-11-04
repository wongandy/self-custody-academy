---
name: mentor-lines-as-lists
description: Keeps every mentor's spoken words in a list of individual lines (one entry per speech line) instead of one fixed block of text, so adding, removing, or reordering a line is a one-entry change and never shifts anything downstream. Use whenever building or editing any scenario, mission, briefing, or intro where a mentor character (Andy, Maria, or another) speaks — especially when the user asks to add a new sentence or line of mentor dialogue, split a paragraph into separate lines, or reorder what the mentor says. Triggers on requests like "add a line", "have the mentor say X after the intro", "make that its own speech", or "split the intro".
---

# Mentor Lines as Lists

Any text a mentor speaks in a guided scenario must be stored as a list of
individual lines, not one fixed block of text. Each entry in the list is one
speech bubble the learner steps through — typed out, then advanced with a click
or Enter.

## The rule

Store speech as a named list of strings:

```
INTRO_LINES = [ ...lines... ]
```

Never concatenate lines into a single string, and never hard-code a paragraph
when the mentor is expected to say several things. If the mentor currently says
one block but more lines are plausible later, still make it a one-entry list —
converting later is a bigger, riskier change than starting right.

Reasons this matters:

- Adding a line is appending one entry; nothing else changes.
- The speech bubble re-keys on the line index, so each line replays its typing
  animation cleanly (see `mentor-speech-fast-forward`).
- Downstream logic — when the spotlight ends, when the device appears — keys on
  reaching the *end* of the list, not on a fixed sentence number, so lines can
  never knock it out of step.

## Wiring

- Track the current line with a step index; the message shown is
  `LINES[step] ?? LINES[0]`.
- Advance one line per continue: if the line is still typing, the click
  completes it and goes no further; once finished, the next click moves to the
  next line (see `mentor-speech-fast-forward`).
- On the final line, do whatever the last line originally did — hand over to the
  device, start the next stage. The end-of-list behavior is reached by
  "is this the last entry?", never by counting from a fixed number.
- Include the line index in the speech bubble's key so each line types from the
  start, and so nudges restart it too (see `mentor-nudge-system`).

## Example

```
// Before — one block; adding a sentence means rewriting this string
const INTRO_MESSAGE = "Line one. Line two.";

// After — adding "Line three" is one new entry
const INTRO_LINES = [
  "Line one.",
  "Line two.",
  "Line three.",
];
```

## Relationship to the other scenario skills

- `flexible-intro-speech` decides when the intro ends and the device appears;
  this skill ensures the lines *before* that moment are a list so that moment
  never shifts.
- `mentor-speech-fast-forward` decides how the learner skips or advances each
  line; this skill defines what a "line" is in the first place.
- `mentor-nudge-system` replaces the current line with a correction; the nudge
  state belongs in the bubble key alongside the line index.
