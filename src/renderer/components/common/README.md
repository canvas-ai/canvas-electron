# Unified Tree Component

## Overview

The new unified `TreeView` component replaces both the previous `ContextTreeView` and workspace `TreeView` components, providing a single, feature-rich tree implementation with drag-and-drop functionality and context menu support.

## Features

- **Unified Interface**: Single component for both context and workspace trees
- **Drag & Drop**: File manager-like drag and drop with keyboard modifiers:
  - Default: Move operation
  - `Ctrl` key: Copy operation
  - `Shift` key: Recursive operation
- **Context Menu**: Right-click context menu with all tree operations:
  - Insert Path
  - Remove Path
  - Remove Path (Recursive)
  - Merge Up
  - Merge Down
  - Subtract Up
  - Subtract Down
- **Read-only Mode**: Toggle to disable all write operations
- **Visual Feedback**: Drag-over highlighting and visual cues
- **API Integration**: Built-in integration with tree API endpoints

## Components

### `TreeView` (Main Component)
The unified tree component with all functionality.

### `useTreeOperations` (Hook)
Custom hook that provides tree API operations for contexts.

### `UnifiedTreeExample` (Example/Wrapper)
Example wrapper component showing how to use the unified tree for different scenarios.

## Migration Guide

### From ContextTreeView

**Before:**
```tsx
import { ContextTreeView } from '@/components/context/tree-view'

<ContextTreeView
  tree={tree}
  selectedPath={selectedPath}
  onPathSelect={onPathSelect}
  contextId={contextId}
  workspaceId={workspaceId}
  disabled={disabled}
/>
```

**After:**
```tsx
import { TreeView } from '@/components/common/tree-view'
import { useTreeOperations } from '@/hooks/useTreeOperations'

const treeOperations = useTreeOperations({
  contextId,
  onRefresh: refetchTree
})

<TreeView
  tree={tree}
  selectedPath={selectedPath}
  onPathSelect={onPathSelect}
  readOnly={disabled}
  title="Context Tree"
  onInsertPath={treeOperations.insertPath}
  onRemovePath={treeOperations.removePath}
  onMovePath={treeOperations.movePath}
  onCopyPath={treeOperations.copyPath}
  onMergeUp={treeOperations.mergeUp}
  onMergeDown={treeOperations.mergeDown}
/>
```

### From Workspace TreeView

**Before:**
```tsx
import { TreeView } from '@/components/workspace/tree-view'

<TreeView
  tree={tree}
  selectedPath={selectedPath}
  onPathSelect={onPathSelect}
/>
```

**After:**
```tsx
import { TreeView } from '@/components/common/tree-view'

<TreeView
  tree={tree}
  selectedPath={selectedPath}
  onPathSelect={onPathSelect}
  readOnly={true}
  title="Workspace Tree"
/>
```

## API Integration

The component integrates with the following tree API endpoints:

- `POST /api/contexts/:id/tree/paths` - Insert path
- `DELETE /api/contexts/:id/tree/paths` - Remove path
- `POST /api/contexts/:id/tree/paths/move` - Move path
- `POST /api/contexts/:id/tree/paths/copy` - Copy path
- `POST /api/contexts/:id/tree/paths/merge-up` - Merge up
- `POST /api/contexts/:id/tree/paths/merge-down` - Merge down

## Props Reference

### TreeView Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tree` | `TreeNode` | - | Tree data structure |
| `selectedPath` | `string` | - | Currently selected path |
| `onPathSelect` | `(path: string) => void` | - | Path selection callback |
| `readOnly` | `boolean` | `false` | Disable write operations |
| `title` | `string` | `'Tree'` | Tree section title |
| `subtitle` | `string?` | - | Tree section subtitle |
| `onInsertPath` | `(path: string, autoCreateLayers?: boolean) => Promise<boolean>` | - | Insert path callback |
| `onRemovePath` | `(path: string, recursive?: boolean) => Promise<boolean>` | - | Remove path callback |
| `onMovePath` | `(fromPath: string, toPath: string, recursive?: boolean) => Promise<boolean>` | - | Move path callback |
| `onCopyPath` | `(fromPath: string, toPath: string, recursive?: boolean) => Promise<boolean>` | - | Copy path callback |
| `onMergeUp` | `(path: string) => Promise<boolean>` | - | Merge up callback |
| `onMergeDown` | `(path: string) => Promise<boolean>` | - | Merge down callback |
| `onSubtractUp` | `(path: string) => Promise<boolean>` | - | Subtract up callback |
| `onSubtractDown` | `(path: string) => Promise<boolean>` | - | Subtract down callback |

### useTreeOperations Hook

```tsx
const {
  insertPath,
  removePath,
  movePath,
  copyPath,
  mergeUp,
  mergeDown,
  subtractUp,
  subtractDown
} = useTreeOperations({
  contextId: string,
  onRefresh?: () => void
})
```

## Best Practices

1. **Use the hook**: Always use `useTreeOperations` for context trees that need API integration
2. **Handle errors**: The operations throw errors on failure, wrap in try-catch blocks
3. **Refresh data**: Pass `onRefresh` to the hook to automatically refresh tree data after operations
4. **Read-only mode**: Use `readOnly={true}` for workspace trees or shared contexts
5. **Custom titles**: Provide meaningful titles to distinguish different tree types 

- DocumentList: shared across contexts, workspaces, layers (moved from workspace/) 
