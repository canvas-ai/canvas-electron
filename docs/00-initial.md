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

Every app integrated with canvas has 2 modu operandi:
- a "bind" mode where applications binds to a specific context and follows it. If I switch a context named "work" from universe://work/task1 to universe://work/task2, all bound applications will load the relevant tabs, notes, email threads etc automatically) 
- explorer mode, where you normally browse through your workspaces > workspace tied context paths and clicking on workspaces > universe > work/task1 creates a default canvas showing a list of all data available for that given context path

The tricky part is how to design the menu
Globaly we have
- Contexts - think "sessions", they only exist so that all connected devices(phones, TVs, laptops) can "follow" what I am doing if I want to
  - Contexts can have their own ACL
- Workspaces
  - Each workspace has its own "Context Tree" 
  - Each workspace can have its own ACLs
  - Workspaces need to define their own data sources 
- Agents (defined globaly, can be linked to both Workspaces and Contexts)
- Roles (defined globaly, can be used by any workspace if configured as such)
--
- Remotes 
- Global API Keys 
- Settings ? 

One could probably get away with a 3 stage menu
Main selection above > List of <selection> > Tree (in case of a workspace) or selection details for the rest > Selection details  in case of a tree

--

OK 
Agents/Roles global: fine, but in UI show “linked to” per workspace/context.
Remotes: admin-ish; tuck under Settings unless you’re actively switching.
API keys: Settings → Credentials.

deal
as for the toolbox, toolbox is for tools - we will for example have a vertical timeline filter to zoom in-out and select time ranges, toggles for showing specific data abstractions etc  + our global applets live here, menu we should implement as a toggable sidebar on the left, either by extending from the canvas window and visually separating it or as a standalone window entirely
In this case, one could argue that having a tree menu "connected" to the canvas element kinda makes sense if you want to switch from /work/task1 to /work/task2 keeping your current filters/UI in place

That would imply that we can "bind" a specific canvas instead of the whole app which may be *more* practical as it appears to be (I'd have one canvas on monitor 1 following my global "context" and one on monitor 2 for some ad-hoc replies/browsing etc

--

Hold on hold on, I remember how painful it was to reimplement all the drag&drop and context menu functionality that we kinda already have in our webui

a) maybe we could reuse an existing FOSS file manager and just fine-tune it to our needs, when you navigate through a context tree you are filtering just based on context and getting ALL data (notes, browser tabs/urls, files) - We could show a folder for each data abstraction (strip data/abstraction from data/abstraction/<type>, capitalize type and set OR we can always show a list and let toolbox do the magic as was intended (the above strategy with a folder-per-abstraction was meant for our webdav backend)

Found a couple of examples
@flmngr/flmngr-react (5M weekly downloads)
@svar-ui/react-filemanager (555 wd)
@cubone/react-file-manager (1499 wd)

b) or lets directly port some of the components from our webui



