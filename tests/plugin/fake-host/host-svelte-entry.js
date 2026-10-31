// What the fake host's page takes from its own Svelte (host-svelte.ts bundles this with that Svelte).
import { mount } from 'svelte';
import HostPane from './host-pane.svelte';

export const drawPane = (target, props) => mount(HostPane, { target, props });
