# Canvas UI

## Downloads

- **Latest release (recommended)**: `https://github.com/canvas-ai/canvas-electron/releases/latest`
- **All releases**: `https://github.com/canvas-ai/canvas-electron/releases`

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

### Production Package
```bash
npm run package
```

This creates platform-specific packages in the `release/` directory:
- **Linux**: AppImage
- **Windows**: NSIS installer
- **macOS**: DMG file

## License

AGPL-3.0-or-later - see LICENSE file for details.

## Roadmap

- [ ] Main management app
