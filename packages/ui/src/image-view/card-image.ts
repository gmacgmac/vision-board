// Image view pattern, an image on a card (D-048 rulings 22-23): the renderer's `.vb-md-img` in a card's
// body becomes the button that opens the zoomed view, in the card's tab order (`imageButton`); an image
// the board can't show gives its place to the box saying why (`showProblem`, the renderer's
// `imageNote`). While it loads it is a sunken box at the card's width (markdown.css). Browser only.
import { imageNote } from '../markdown/image.ts';

/** The class of an image's button on a card. */
export const IMAGE_BUTTON = 'vb-img';

/** Wrap `img` in the button that opens it (its alt text names the button) and return the button. */
export function imageButton(img: HTMLImageElement): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = IMAGE_BUTTON;
  b.setAttribute('aria-haspopup', 'dialog');
  img.replaceWith(b);
  b.append(img);
  return b;
}

/** Put the box saying why in the place of `img` (or of its button): "Image not found: <path>" or
 * "Image not shown: <path> (<reason>)". */
export function showProblem(img: HTMLImageElement, path: string, reason: string): void {
  (img.closest(`.${IMAGE_BUTTON}`) ?? img).outerHTML = imageNote(path, reason);
}
