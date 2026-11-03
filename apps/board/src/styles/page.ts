// The board page's stylesheets, in cascade order: the tokens, the page's own rules (shell.css), the
// board's own sheets (sheets.css, `#board/styles.css` to a host), then what the page alone draws (its chat, its folder, its ledger).
// The one list: main.ts and the gallery both import it (D-059).
import '#tokens/styles.css';
import './shell.css';
import './sheets.css';
import './chat-sidebar.css';
import './folder-dialog.css';
import './current-folder.css';
import './ledgers.css';
import './editing.css';
