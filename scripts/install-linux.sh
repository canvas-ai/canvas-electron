#!/bin/bash
set -e

# Canvas UI Linux Installer
# Installs the latest AppImage and creates a desktop entry

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RELEASE_DIR="$PROJECT_ROOT/release"

INSTALL_DIR="$HOME/.canvas/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_SOURCE="$PROJECT_ROOT/public/icons/logo_512x512.png"
ICON_DEST="$HOME/.canvas/canvas-ui.png"

echo "==> Canvas UI Linux Installer"

# Find latest AppImage
APPIMAGE=$(find "$RELEASE_DIR" -maxdepth 1 -name "canvas-ui-*.AppImage" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)

if [ -z "$APPIMAGE" ]; then
    echo "Error: No AppImage found in $RELEASE_DIR"
    echo "Run 'npm run package' first to build the AppImage"
    exit 1
fi

echo "Found: $(basename "$APPIMAGE")"

# Create install directory
mkdir -p "$INSTALL_DIR"
echo "==> Installing to $INSTALL_DIR/canvas-ui"

# Copy and make executable
cp "$APPIMAGE" "$INSTALL_DIR/canvas-ui"
chmod +x "$INSTALL_DIR/canvas-ui"

# Copy icon
mkdir -p "$(dirname "$ICON_DEST")"
cp "$ICON_SOURCE" "$ICON_DEST"

# Create desktop entry
mkdir -p "$DESKTOP_DIR"
cat > "$DESKTOP_DIR/canvas-ui.desktop" <<EOF
[Desktop Entry]
Name=Canvas UI
Comment=Context layer on top of your unstructured universe
Exec=$INSTALL_DIR/canvas-ui
Icon=$ICON_DEST
Terminal=false
Type=Application
Categories=Utility;Development;
StartupWMClass=Canvas UI
EOF

chmod +x "$DESKTOP_DIR/canvas-ui.desktop"

# Update desktop database if available
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

echo "==> Installation complete!"
echo ""
echo "Canvas UI installed to: $INSTALL_DIR/canvas-ui"
echo "Desktop entry created at: $DESKTOP_DIR/canvas-ui.desktop"
echo ""
echo "You can now:"
echo "  - Launch from application menu"
echo "  - Run: $INSTALL_DIR/canvas-ui"
echo "  - Add $INSTALL_DIR to PATH for 'canvas-ui' command"
