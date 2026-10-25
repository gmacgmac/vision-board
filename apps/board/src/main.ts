// Entry point: the page styles and the pattern styles, the board's elements, then the Svelte shell,
// which mounts the board canvas. Elements are defined before anything creates one, and Markdown is
// told whether to draw images (cardImages flag) before anything renders. The chat's elements and
// styles are not here: they load when its panel first opens (board/chat-view.ts).
import { mount } from 'svelte';
import './styles/board.css';
import './styles/access.css';
import './styles/key-help.css';
import './styles/go-to-card.css';
import './styles/proposals.css';
import '../../../packages/ui/src/node/node.css';
import '../../../packages/ui/src/node/node-popover.css';
import '../../../packages/ui/src/node/node-steps.css';
import '../../../packages/ui/src/node/node-parking.css';
import '../../../packages/ui/src/node/node-notes.css';
import '../../../packages/ui/src/node/node-app.css';
import '../../../packages/ui/src/app-frame/app-frame.css';
import '../../../packages/ui/src/markdown/markdown.css';
import '../../../packages/ui/src/image-view/image-view.css';
import '../../../packages/ui/src/region/region.css';
import '../../../packages/ui/src/region/region-narrow.css';
import '../../../packages/ui/src/region/region-note.css';
import '../../../packages/ui/src/region/region-rail.css';
import '../../../packages/ui/src/region/region-fresh.css';
import '../../../packages/ui/src/tip/tip.css';
import '../../../packages/ui/src/paused/paused.css';
import '../../../packages/ui/src/note-bubble/note-bubble.css';
import '../../../packages/ui/src/selection-bar/selection-bar.css';
import './styles/chat-sidebar.css';
import './styles/folder-dialog.css';
import './styles/archived-dialog.css';
import './styles/lock.css';
import { flagOn } from '../../../packages/format/src/index.ts';
import { defineBoardElements, setMarkdownImages } from '../../../packages/ui/src/index.ts';
import { pageFlags } from './flags.ts';
import App from './shell/App.svelte';

setMarkdownImages(flagOn('cardImages', pageFlags()));
defineBoardElements();
mount(App, { target: document.body });
