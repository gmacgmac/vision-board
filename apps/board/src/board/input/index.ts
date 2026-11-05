// Front door of board/input/: code outside the folder imports from here only (ARCH_06).
export { AREA_COMMANDS, COMMANDS, HEADER_COMMANDS, SELECTION_COMMANDS, barButtons, commandTitle, isCommand, selectionButtons, zoomTitle } from './commands.ts';
export type { CommandId } from './commands.ts';
export { keyGroups } from './key-help.ts';
export { DRAG_THRESHOLD } from './pointer.ts';
export { bindStage } from './wiring.ts';
export type { StageHandlers } from './wiring.ts';
export { WHEEL_GAP, canScroll, createWheelLatch, scrollerOn } from './wheel-latch.ts';
export type { Overflow, ScrollBox } from './wheel-latch.ts';
