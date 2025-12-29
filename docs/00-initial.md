There is something fishy about this electron skeleton repo.
Note, ./server is a git submodule pointing to the server runtime

The project structure should support the following functionality:
- All content is displayed in a "Canvas" element - a electron BrowserWindows or the shiny new BaseWindow - whatever will be more suitable
- There can be multiple canvases on the screen, we do support tiling them, minimize/maximize, close, save, share
- A Canvas is a dynamic element thats used to display whatever data the user wants to work on, either in a full-page single view or in a movable, resizeable grid layout combining several "applets" - for example emails, notes, list of files or a file manager like section, even an image or vides
- Canvas is supposed to be controlled directly, from a 2nd major element called Toolbox(more on that later) or using an LLM agent - a user should be able to hit a shortcut and ask via mic "Show me the latest emails for the istream project please" or "show me the last 2 invoices from peter thiel side-by-side"; as mentioned earlier, cavnases are shareable and can be opened from different devices, so that one could tell his agent "open my emails on my LG TV please"(LG web browser would need to be open and connected to the canvas web app under the same user and tagged as a device but this is out of scope for the current refactor)

This means that we have 2 major elements
- Canvases
- Toolbox (separate window with its own shortcut)

We will need a window manager to keep an eye on the tiling, positions, sizes etc
Within Canvases, we need to support various data formats hence could support them using dedicated self-contained containers/components called "applets" or simillar

First, how would you refine the above?
Note, at this stage we are preparing ther folder structure only hence secondly, can you please  create a proper structure for our canvas-server desktop app and update .gitignore accordingly. 

--

With that initial canvas, it should be centered both horizontaly and vertically like an application launcher window.
No toolbox would be shown for now or if then right next right to the canvas with a 32px gap between both windows and in minimized mode - meaning - just a slim ruler-like panel the height of the canvas.
When the application starts, a user may want to have a specific home screen view but we would first show a login screen but thats content, lets focus on the layout first 

--
CANVAS_HOME structure

```text
~/.canvas/                      (or ~/Canvas on Windows)
  config/                       # small, global, mostly-human-editable JSON
    remotes.json
    settings.json               # global prefs
  accounts/                     # everything tied to a remote/account lives together
    <user>@<remote.id>/
      workspaces/<workspace>/...  # local cache + workspace-specific state
      agents/<agent>/...          # local agent defs/cache for that remote
      roles/<role>/...            # role defs/cache for that remote
      cache/...
  ui/                           # electron-only state: window layouts, last active canvas, etc
    state.json
  logs/
  tmp/
```
