// Entry point: the page styles and the pattern styles, the board's elements, then the Svelte
// shell, which mounts the board canvas. Elements are defined before anything creates one.
import { mount } from 'svelte';
import './styles/board.css';
import './styles/access.css';
import '../../../packages/ui/src/node/node.css';
import '../../../packages/ui/src/markdown/markdown.css';
import '../../../packages/ui/src/region/region.css';
import '../../../packages/ui/src/region/region-note.css';
import '../../../packages/ui/src/tip/tip.css';
import '../../../packages/ui/src/note-bubble/note-bubble.css';
import '../../../packages/ui/src/selection-bar/selection-bar.css';
import { defineBoardElements } from '../../../packages/ui/src/index.ts';
import App from './shell/App.svelte';

defineBoardElements();
mount(App, { target: document.body });
