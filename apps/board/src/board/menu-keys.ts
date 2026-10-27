// A menu's keys now live in the shared base (packages/ui base/menu.ts, `#ui` `menuKeydown`, UI_01).
// This file only passes them on for the callers not yet moved (history-flow.ts); import from `#ui`.
export { menuKeydown } from '#ui';
