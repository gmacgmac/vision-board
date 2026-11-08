// Words: plugin. What a host shows of the board plugin as a whole: its name and the kinds of chip it adds to a chat.
// Keys: vision-board.plugin.<name> (an object's members are dotted on). Plain code: no imports.
export const name = 'Vision Board';

/** The chip kinds the board adds to a chat (`ChipKind`, #actions), as a person reads them. */
export const chips = {
  card: 'Card',
  note: 'Note',
  board: 'Board',
  selection: 'Selected cards',
  answers: 'Answers',
};
