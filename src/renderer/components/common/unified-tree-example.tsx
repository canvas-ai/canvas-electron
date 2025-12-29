
import { TreeView } from './tree-view'
import { useTreeOperations } from '@/hooks/useTreeOperations'
import { TreeNode } from '@/types/workspace'

interface UnifiedTreeExampleProps {
  // For Context Tree usage
  contextId?: string
  workspaceId?: string
  readOnly?: boolean

  // For Workspace Tree usage
  isWorkspaceMode?: boolean

  // Common props
  tree: TreeNode
  selectedPath: string
  onPathSelect: (path: string) => void
  onTreeRefresh?: () => void
}

export function UnifiedTreeExample({
  contextId,
  readOnly = false,
  isWorkspaceMode = false,
  tree,
  selectedPath,
  onPathSelect,
  onTreeRefresh
}: UnifiedTreeExampleProps) {
  // Use tree operations hook for context trees
  const treeOperations = contextId ? useTreeOperations({
    contextId,
    onRefresh: onTreeRefresh
  }) : null

  // Determine the tree title and subtitle
  const title = isWorkspaceMode ? 'Workspace Tree' : 'Context Tree'
  const subtitle = readOnly
    ? 'Read-only view (shared context)'
    : isWorkspaceMode
      ? 'Right-click for context menu, drag to move/copy (Ctrl=copy, Shift=recursive)'
      : 'Right-click for context menu, drag to move/copy (Ctrl=copy, Shift=recursive)'

  return (
    <TreeView
      tree={tree}
      selectedPath={selectedPath}
      onPathSelect={onPathSelect}
      readOnly={readOnly}
      title={title}
      subtitle={subtitle}
      // Pass tree operations if available (only for context trees with API access)
      onInsertPath={treeOperations?.insertPath}
      onRemovePath={treeOperations?.removePath}
      onMovePath={treeOperations?.movePath}
      onCopyPath={treeOperations?.copyPath}
      onMergeUp={treeOperations?.mergeUp}
      onMergeDown={treeOperations?.mergeDown}
    />
  )
}

// Example usage for Context Tree (replaces ContextTreeView):
/*
<UnifiedTreeExample
  contextId="context-123"
  workspaceId="workspace-456"
  readOnly={false}
  tree={contextTree}
  selectedPath={selectedPath}
  onPathSelect={setSelectedPath}
  onTreeRefresh={refetchContextTree}
/>
*/

// Example usage for Workspace Tree (replaces TreeView):
/*
<UnifiedTreeExample
  isWorkspaceMode={true}
  readOnly={true} // Workspace trees are typically read-only
  tree={workspaceTree}
  selectedPath={selectedPath}
  onPathSelect={setSelectedPath}
/>
*/
