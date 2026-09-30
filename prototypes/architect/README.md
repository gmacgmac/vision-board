# Uplynk Architect

Describe a video workflow in plain English, and Claude draws it as a diagram you can point at, correct and approve.

## Start it

1. Make sure Claude is signed in on this Mac. You only need to do this once: open a terminal, type `claude`, then type `/login`.
2. Open a terminal in the repo root and run:

   ```bash
   node prototypes/architect/app/server.mjs
   ```

3. Open http://localhost:4455 in your browser.

Leave the terminal open while you use it. Press Ctrl+C in that terminal to stop it.

## Use it

1. **Start a plan.** Click **New plan**, then say or type your workflow in the box at the bottom and press Enter. The diagram draws itself in 10 to 20 seconds.
2. **Point at what to change.** Click a box, or drag around a group of boxes, and type a note. Add as many notes as you like.
3. **Send your changes.** Press Enter in the bottom box. Claude updates the diagram, and anything new or changed lights up.
4. **Check Claude's guesses.** The **Confirm these** list on the right shows what Claude assumed. Click one to reply to it.
5. **Approve.** When it looks right, click **Approve**. That version is saved as the plan of record.

Every version is saved in the `plans` folder, so you can click back through earlier versions at any time.

The **Conversation** tab shows everything you asked, what Claude replied, and what changed each time.

## The rules

Claude can only build flows the platform actually supports. Each building block lists what it can take in and send out (see the **Library** tab), and the platform-wide rules are in `rules/platform-rules.json`. If Claude's first draft breaks a rule, it's sent back and fixed before you see it, and the Conversation tab tells you when that happened.
