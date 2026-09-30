// The note dialog for comments and "more context". Native <dialog>: modal, Esc closes, focus
// returns to the item that opened it.
const dlg = document.getElementById('note-dialog') as HTMLDialogElement;
const title = document.getElementById('note-title')!;
const item = document.getElementById('note-item')!;
const text = document.getElementById('note-text') as HTMLTextAreaElement;
const save = document.getElementById('note-save') as HTMLButtonElement;
let required = false;

text.oninput = () => { save.disabled = required && !text.value.trim(); };
text.onkeydown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !save.disabled) {
    e.preventDefault();
    dlg.close('save');
  }
};

/** Resolves to the text ('' when optional and left empty), or null when cancelled. */
export function askNote(heading: string, itemLine: string, isRequired: boolean, placeholder: string): Promise<string | null> {
  required = isRequired;
  title.textContent = heading;
  item.textContent = itemLine;
  text.value = '';
  text.placeholder = placeholder;
  save.disabled = isRequired;
  dlg.returnValue = '';
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => {
      resolve(dlg.returnValue === 'save' ? text.value.trim() : null);
    }, { once: true });
    dlg.showModal();
    text.focus();
  });
}
