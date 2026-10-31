// Entry point: the page's styles (styles/page.ts), the board's elements, then the Svelte shell,
// which mounts the board canvas. Elements are defined before anything creates one. The chat's elements and
// styles are not here: they load when its panel first opens (board/chat-view.ts).
import { mount } from 'svelte';
import './styles/page.ts';
import { defineBoardElements } from '#ui';
import App from './shell/App.svelte';

defineBoardElements();
mount(App, { target: document.body });
