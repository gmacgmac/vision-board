// Entry point: the page styles and the pattern styles (the chat's too, chatPanel flag), the board's
// and the chat's elements, then the Svelte shell, which mounts the board canvas. Elements are
// defined before anything creates one.
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
import '../../../packages/ui/src/markdown/markdown.css';
import '../../../packages/ui/src/region/region.css';
import '../../../packages/ui/src/region/region-narrow.css';
import '../../../packages/ui/src/region/region-note.css';
import '../../../packages/ui/src/tip/tip.css';
import '../../../packages/ui/src/paused/paused.css';
import '../../../packages/ui/src/note-bubble/note-bubble.css';
import '../../../packages/ui/src/selection-bar/selection-bar.css';
import '../../../packages/chat/src/chat.css';
import './styles/chat-host.css';
import './styles/chat-sidebar.css';
import './styles/folder-dialog.css';
import './styles/archived-dialog.css';
import './styles/lock.css';
import { defineBoardElements } from '../../../packages/ui/src/index.ts';
import { defineChatElements } from '../../../packages/chat/src/index.ts';
import App from './shell/App.svelte';

defineBoardElements();
defineChatElements();
mount(App, { target: document.body });
