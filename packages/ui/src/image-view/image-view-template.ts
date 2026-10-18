// Image view pattern, layer 2 (template): the zoomed view's markup, the one place it is built. A modal
// dialog over the board (D-048 ruling 22): the backdrop, the image, and the × in the screen's top
// corner, which takes focus when it opens (the dialog's only control). Tokens style it (image-view.css).
import { esc } from '../markdown/inline.ts';
import { ACTION_ICON, svgIcon } from '../node/node-icons.ts';
import { IMAGE_VIEW_WORDS } from './image-view-core.ts';

export const imageViewTemplate = (): string =>
  '<dialog class="vb-iv"><div class="vb-iv-scrim"></div><img class="vb-iv-img" alt="">'
  + `<button type="button" class="vb-iv-x" autofocus aria-label="${esc(IMAGE_VIEW_WORDS.close)}" title="${esc(IMAGE_VIEW_WORDS.closeTip)}">`
  + `${svgIcon(ACTION_ICON.drop!, 20, 'vb-iv-x-icon')}</button></dialog>`;
