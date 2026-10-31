// The view bundle's entry (bin/build-plugin.ts): the one name a host imports from `view/board.js`, and the
// one stylesheet it loads (`view/board.css`): the tokens, the board's sheets, then the theme map. The bundle
// carries its own Svelte; a host's is not touched.
import '#tokens/styles.css';
import '../src/styles/sheets.css';
import './theme.css';

export { mount } from '../src/board/index.ts';
