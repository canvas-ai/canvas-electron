# Canvas UI - Modern Electron AI Assistant

A modern, lightweight Electron application that provides a toolbox-style AI chat interface with support for multiple AI providers (Ollama, OpenAI, Anthropic) and MCP (Model Context Protocol) tools.

## Features

### 🚀 Core Features
- **System Tray Application**: Runs in the background with easy access via tray icon
- **Toolbox Interface**: Popup window (Super+Space) positioned optimally on screen
- **Multi-Provider Support**: Works with Ollama, OpenAI, and Anthropic APIs
- **Conversation Management**: Persistent chat history stored locally
- **MCP Tools Integration**: Support for Model Context Protocol tools
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

### 🎯 Toolbox Window
- **Dimensions**: 640px wide × 452px high (1:√2 ratio)
- **Positioning**: 460px from right edge, vertically centered
- **Shortcut**: `Super+Space` (or `Ctrl+Alt+Space` as fallback)
- **Layout**: Chat history sidebar + main chat area
- **Multimodal Support**: Text input with planned support for files, voice, and images

### ⚙️ Settings System
- **Agent Configuration**: Multiple AI agents with different settings
- **API Management**: Support for different runtimes and endpoints
- **Model Parameters**: Temperature, Top-P, Max Tokens configuration
- **MCP Tools**: Enable/disable and configure context protocol tools

### 💾 Data Storage
- **Linux/Mac**: `~/.canvas/electron/agents/<agent-name>/`
- **Windows**: `%APPDATA%/Canvas/electron/agents/<agent-name>/`
- **Format**: Plain JSON files with datetime stamps
- **Structure**: `YYYY-MM-DDTHH-mm-ss-conversation.json`

## Architecture

### Modern Electron Structure
```
src/
├── main/           # Electron main process (Node.js)
│   ├── main.ts     # Application entry point
│   ├── tray.ts     # System tray management
│   ├── toolbox.ts  # Toolbox window management
│   ├── settings.ts # Settings window management
│   └── services/   # Business logic services
├── renderer/       # Frontend (React + TypeScript)
│   ├── components/ # UI components (shadcn/ui)
│   ├── pages/      # Application pages
│   └── lib/        # Utilities and helpers
└── shared/         # Shared types and constants
    ├── types.ts    # TypeScript interfaces
    └── constants.ts # Application constants
```

### Security Features
- **Context Isolation**: Renderer processes are sandboxed
- **Preload Scripts**: Secure IPC communication
- **No Node Integration**: Renderer processes don't have direct Node.js access
- **Input Validation**: All user inputs are validated

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

### Project Structure
The application follows Electron best practices with clear separation between:
- **Main Process**: Handles system integration, window management, and native APIs
- **Renderer Process**: Handles UI rendering and user interactions
- **Preload Scripts**: Provide secure bridge between main and renderer

## Configuration

### Agent Configuration
Each agent can be configured with:
- **Name**: Display name for the agent
- **System Prompt**: Instructions for the AI model
- **Runtime**: `ollama`, `openai`, or `anthropic`
- **API URL**: Endpoint for the API service
- **API Token**: Authentication token
- **Model**: Specific model name (e.g., `llama3.2`, `gpt-4`, `claude-3-sonnet`)
- **Parameters**: Temperature, Top-P, Max Tokens
- **MCP Tools**: List of enabled context protocol tools

### Default Configuration
```json
{
  "name": "Default Agent",
  "systemPrompt": "You are a helpful AI assistant.",
  "runtime": "ollama",
  "apiUrl": "http://localhost:11434",
  "apiToken": "",
  "model": "llama3.2",
  "temperature": 0.7,
  "topP": 0.9,
  "maxTokens": 2048,
  "mcpTools": []
}
```

## API Integration

### Ollama
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.2

# Default endpoint: http://localhost:11434
```

### OpenAI
```javascript
// Configuration
{
  "runtime": "openai",
  "apiUrl": "https://api.openai.com/v1",
  "apiToken": "sk-...",
  "model": "gpt-4"
}
```

### Anthropic
```javascript
// Configuration
{
  "runtime": "anthropic",
  "apiUrl": "https://api.anthropic.com",
  "apiToken": "sk-ant-...",
  "model": "claude-3-sonnet-20240229"
}
```

## MCP (Model Context Protocol) Integration

The application includes support for MCP tools, allowing AI agents to use external tools and services. MCP tools can be:
- Enabled/disabled per agent
- Configured with custom parameters
- Used for extending AI capabilities

### Adding MCP Tools
1. Open Settings
2. Select an agent
3. Navigate to MCP Tools section
4. Click "+" to add a new tool
5. Configure tool name and parameters
6. Save settings

## Keyboard Shortcuts

- `Super+Space` - Toggle toolbox window
- `Ctrl+Alt+Space` - Alternative toolbox toggle
- `Enter` - Send message in chat
- `Shift+Enter` - New line in message input

## Building and Packaging

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

## Troubleshooting

### Common Issues

1. **Toolbox not opening**: Check if global shortcuts are registered properly
2. **API connection failed**: Verify API URL and token configuration
3. **Conversations not saving**: Check file system permissions for data directory
4. **UI not loading**: Ensure renderer build completed successfully

### Debug Mode
Run with debug flags to see detailed logs:
```bash
DEBUG=canvas* npm start
```

### Development Tools
- Press `F12` in any window to open Chrome DevTools
- Use the Debug Tools option in the tray menu
- Check the main process logs in the terminal

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the coding standards
4. Add tests for new functionality
5. Submit a pull request

## License

AGPL-3.0-or-later - see LICENSE file for details.

## Roadmap

- [ ] Voice input support
- [ ] Image/file attachment support  
- [ ] Plugin system for custom tools
- [ ] Cloud synchronization
- [ ] Multiple conversation tabs
- [ ] Custom themes
- [ ] Mobile companion app