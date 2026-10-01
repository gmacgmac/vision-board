// Entry point: the page styles, then the Svelte shell, which mounts the board canvas.
import { mount } from 'svelte';
import './styles/board.css';
import './styles/item.css';
import App from './shell/App.svelte';

mount(App, { target: document.body });
