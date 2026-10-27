// Entry point: the page's styles (styles/page.ts), the board's elements, then the Svelte shell,
// which mounts the board canvas. Elements are defined before anything creates one, and Markdown is
// told whether to draw images (cardImages flag) before anything renders. The chat's elements and
// styles are not here: they load when its panel first opens (board/chat-view.ts).
import { mount } from 'svelte';
import './styles/page.ts';
import { flagOn } from '#format';
import { defineBoardElements, setMarkdownImages } from '#ui';
import { pageFlags } from './flags.ts';
import App from './shell/App.svelte';

setMarkdownImages(flagOn('cardImages', pageFlags()));
defineBoardElements();
mount(App, { target: document.body });
