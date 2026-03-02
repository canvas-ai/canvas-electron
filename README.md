# Canvas UI

## Downloads

- **Latest release (recommended)**: [Latest release](https://github.com/canvas-ai/canvas-electron/releases/latest)
- **All releases**: [All releases](https://github.com/canvas-ai/canvas-electron/releases)

### Config/Data Storage
- **Linux/Mac**: `~/.canvas/electron/agents/<agent-name>/`
- **Windows**: `%APPDATA%/Canvas/electron/agents/<agent-name>/`
- **Format**: Plain JSON files with datetime stamps
- **Structure**: `YYYY-MM-DDTHH-mm-ss-conversation.json`

## Development

### Prerequisites
- Node.js 20.x or higher
- npm or yarn package manager

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd canvas

# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Package the application
npm run package
```

### Development Scripts
- `npm run dev` - Start both main and renderer in development mode
- `npm run dev:main` - Build and run main process only
- `npm run dev:renderer` - Start Vite dev server for renderer
- `npm run build` - Build both main and renderer for production
- `npm run build:main` - Build main process only
- `npm run build:renderer` - Build renderer only
- `npm run lint` - Run ESLint on all TypeScript files
- `npm run type-check` - Run TypeScript type checking

### Development Build
```bash
npm run build
```

### How to cut a release

Tag and push (tag should match our versioning convention):

```bash 
git tag v2.0.0-alpha.1
git push origin v2.0.0-alpha.1
```

GitHub Actions will build + create a Release with the installers.


### Production Package
```bash
npm run package
```

This creates platform-specific packages in the `release/` directory:
- **Linux**: AppImage
- **Windows**: NSIS installer
- **macOS**: DMG file

## Event Hooks

Canvas UI can run scripts in response to server-side WebSocket events (context URL changes, tree mutations, document updates, etc.). Useful for triggering external tools like rclone mounts, notifications, or CI pipelines.

**Setup**: create executable scripts in `~/.canvas/hooks/` (`~/Canvas/hooks/` on Windows) named after the event they handle:

```bash
# Create hooks directory
mkdir -p ~/.canvas/hooks

# Create a hook for context URL changes
cat > ~/.canvas/hooks/context.url.set << 'EOF'
#!/bin/bash
URL=$(cat | jq -r '.url')
# Note, stdin is a pipe, once processed its gone
# You can capture the raw stdin with stdin=$(cat)
echo "[$(date)] context url changed to: $URL"
EOF
chmod +x ~/.canvas/hooks/context.url.set
```

- **Naming**: filename = event name (e.g. `context.url.set`, `workspace.tree.path.inserted`)
- **Activation**: `chmod +x` enables the hook, remove the flag to disable
- **Input**: event name as `$1`, JSON payload on stdin
- **Output**: stdout/stderr appended to `~/.canvas/logs/hooks.log`
- **Config**: set `hooks.enabled: false` in `~/.canvas/config/canvas-ui.json` to disable globally

Available events are listed in the [WebSocket API docs](https://github.com/canvas-ai/canvas-server/blob/main/docs/API.md#websocket-api).

## License

AGPL-3.0-or-later - see LICENSE file for details.

## Roadmap

- [ ] Main management app
