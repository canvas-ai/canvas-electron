// Ported from server web UI: server/src/ui/web/src/components/common/tree-view.tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Trash2,
  Plus,
  Clipboard,
  Copy,
  Scissors,
  Edit,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TreeNode } from '@/types/workspace'

type TreeClipboardMode = 'copy' | 'cut'
type TreeClipboard = { mode: TreeClipboardMode; paths: string[] }

interface TreeViewProps {
  tree: TreeNode
  selectedPath: string
  onPathSelect: (path: string) => void
  readOnly?: boolean
  defaultExpanded?: boolean
  expandedPath?: string
  title?: string
  subtitle?: string
  onInsertPath?: (path: string, autoCreateLayers?: boolean) => Promise<boolean>
  onRemovePath?: (path: string, recursive?: boolean) => Promise<boolean>
  onRenamePath?: (fromPath: string, newName: string) => Promise<boolean>
  onMovePath?: (fromPath: string, toPath: string, recursive?: boolean) => Promise<boolean>
  onCopyPath?: (fromPath: string, toPath: string, recursive?: boolean) => Promise<boolean>
  onCopyPathToClipboard?: (path: string) => void
  onCutPathToClipboard?: (path: string) => void
  onPastePathFromClipboard?: (path: string) => Promise<boolean>
  onMergeLayer?: (layerId: string, targetLayers: string[]) => Promise<any>
  onSubtractLayer?: (layerId: string, targetLayers: string[]) => Promise<any>
  onMergeUp?: (path: string) => Promise<boolean>
  onMergeDown?: (path: string) => Promise<boolean>
  onPasteDocuments?: (path: string, documentIds: number[]) => Promise<boolean>
  pastedDocumentIds?: number[]
  clipboardPaths?: string[]
  // Layer selection for merge/subtract
  sourceLayerPath?: string | null
  targetLayerPaths?: Set<string>
  onLayerSelectionChange?: (sourcePath: string | null, targetPaths: Set<string>) => void
}

interface TreeNodeProps {
  node: TreeNode
  level: number
  parentPath: string
  selectedPath: string
  onPathSelect: (path: string) => void
  readOnly: boolean
  defaultExpanded?: boolean
  expandedPath?: string
  onInsertPath?: (path: string, autoCreateLayers?: boolean) => Promise<boolean>
  onRemovePath?: (path: string, recursive?: boolean) => Promise<boolean>
  onRenamePath?: (fromPath: string, newName: string) => Promise<boolean>
  onMovePath?: (fromPath: string, toPath: string, recursive?: boolean) => Promise<boolean>
  onCopyPath?: (fromPath: string, toPath: string, recursive?: boolean) => Promise<boolean>
  onCopyPathToClipboard?: (path: string) => void
  onCutPathToClipboard?: (path: string) => void
  onPastePathFromClipboard?: (path: string) => Promise<boolean>
  onMergeLayer?: (layerId: string, targetLayers: string[]) => Promise<any>
  onSubtractLayer?: (layerId: string, targetLayers: string[]) => Promise<any>
  onPasteDocuments?: (path: string, documentIds: number[]) => Promise<boolean>
  pastedDocumentIds?: number[]
  clipboardPaths?: string[]
  onDragStart: (path: string, event: React.DragEvent) => void
  onDragOver: (path: string, event: React.DragEvent) => void
  onDrop: (path: string, event: React.DragEvent) => void
  dragOverPath: string | null
  tree: TreeNode
  // Layer selection
  sourceLayerPath?: string | null
  targetLayerPaths?: Set<string>
  onLayerSelectionChange?: (sourcePath: string | null, targetPaths: Set<string>) => void
}

interface ContextMenuProps {
  isOpen: boolean
  onClose: () => void
  x: number
  y: number
  path: string
  onInsertPath?: (path: string, autoCreateLayers?: boolean) => Promise<boolean>
  onRemovePath?: (path: string, recursive?: boolean) => Promise<boolean>
  onRenamePath?: (fromPath: string, newName: string) => Promise<boolean>
  onCopyPath?: (path: string) => void
  onCutPath?: (path: string) => void
  onPastePath?: (path: string) => Promise<boolean>
  onMergeLayer?: (layerId: string, targetLayers: string[]) => Promise<any>
  onSubtractLayer?: (layerId: string, targetLayers: string[]) => Promise<any>
  onPasteDocuments?: (path: string, documentIds: number[]) => Promise<boolean>
  pastedDocumentIds?: number[]
  clipboardPaths?: string[]
  clipboardDocuments?: number[]
  tree: TreeNode
  sourceLayerPath?: string | null
  targetLayerPaths?: Set<string>
}

function ContextMenu({
  isOpen,
  onClose,
  x,
  y,
  path,
  onInsertPath,
  onRemovePath,
  onRenamePath,
  onCopyPath,
  onCutPath,
  onPastePath,
  onMergeLayer,
  onSubtractLayer,
  onPasteDocuments,
  pastedDocumentIds,
  clipboardPaths,
  sourceLayerPath,
  targetLayerPaths,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const hasValidLayerSelection = sourceLayerPath && targetLayerPaths && targetLayerPaths.size > 0

  const handleAction = async (action: string) => {
    try {
      switch (action) {
        case 'insert': {
          const newPath = prompt('Enter new path name:', '')
          if (newPath && onInsertPath) {
            const fullPath = path === '/' ? `/${newPath}` : `${path}/${newPath}`
            await onInsertPath(fullPath, true)
          }
          break
        }
        case 'rename': {
          const currentName = path.split('/').pop() || ''
          const newName = prompt('Enter new name:', currentName)
          if (newName && newName !== currentName && onRenamePath) {
            await onRenamePath(path, newName)
          }
          break
        }
        case 'remove': {
          if (confirm(`Are you sure you want to remove "${path}"?`)) {
            if (onRemovePath) await onRemovePath(path, false)
          }
          break
        }
        case 'remove-recursive': {
          if (confirm(`Are you sure you want to recursively remove "${path}" and all its children?`)) {
            if (onRemovePath) await onRemovePath(path, true)
          }
          break
        }
        case 'merge-layer': {
          if (onMergeLayer && sourceLayerPath && targetLayerPaths) {
            const sourceLayerName = sourceLayerPath.split('/').filter(Boolean).pop() || sourceLayerPath
            const targetLayerNames = Array.from(targetLayerPaths).map(
              (p) => p.split('/').filter(Boolean).pop() || p
            )
            await onMergeLayer(sourceLayerName, targetLayerNames)
          }
          break
        }
        case 'subtract-layer': {
          if (onSubtractLayer && sourceLayerPath && targetLayerPaths) {
            const sourceLayerName = sourceLayerPath.split('/').filter(Boolean).pop() || sourceLayerPath
            const targetLayerNames = Array.from(targetLayerPaths).map(
              (p) => p.split('/').filter(Boolean).pop() || p
            )
            await onSubtractLayer(sourceLayerName, targetLayerNames)
          }
          break
        }
        case 'copy':
          onCopyPath?.(path)
          break
        case 'cut':
          onCutPath?.(path)
          break
        case 'paste-paths':
          if (onPastePath) await onPastePath(path)
          break
        case 'paste-documents':
          if (onPasteDocuments && pastedDocumentIds && pastedDocumentIds.length > 0) {
            await onPasteDocuments(path, pastedDocumentIds)
          }
          break
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error)
      alert(`Failed to ${action}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      onClose()
    }
  }

  if (!isOpen) return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        style={{ left: x, top: y }}
      >
        <div
          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
          onClick={() => handleAction('insert')}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Folder
        </div>
        {path !== '/' && (
          <div
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleAction('rename')}
          >
            <Edit className="w-4 h-4 mr-2" />
            Rename
          </div>
        )}
        <div className="my-1 h-px bg-border" />
        <div
          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
          onClick={() => handleAction('copy')}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </div>
        <div
          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
          onClick={() => handleAction('cut')}
        >
          <Scissors className="w-4 h-4 mr-2" />
          Cut
        </div>
        {clipboardPaths && clipboardPaths.length > 0 && (
          <div
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleAction('paste-paths')}
          >
            <Clipboard className="w-4 h-4 mr-2" />
            Paste Folders ({clipboardPaths.length})
          </div>
        )}
        {pastedDocumentIds && pastedDocumentIds.length > 0 && (
          <div
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleAction('paste-documents')}
          >
            <Clipboard className="w-4 h-4 mr-2" />
            Paste Documents ({pastedDocumentIds.length})
          </div>
        )}
        <div className="my-1 h-px bg-border" />
        <div
          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
          onClick={() => handleAction('remove')}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Remove Path
        </div>
        <div
          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
          onClick={() => handleAction('remove-recursive')}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Remove Path (Recursive)
        </div>
        {hasValidLayerSelection && <div className="my-1 h-px bg-border" />}
        {onMergeLayer && hasValidLayerSelection && (
          <div
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleAction('merge-layer')}
          >
            <Layers className="w-4 h-4 mr-2" />
            Merge Layer (source: {sourceLayerPath?.split('/').pop()}, targets: {targetLayerPaths?.size})
          </div>
        )}
        {onSubtractLayer && hasValidLayerSelection && (
          <div
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleAction('subtract-layer')}
          >
            <Layers className="w-4 h-4 mr-2" />
            Subtract Layer (source: {sourceLayerPath?.split('/').pop()}, targets: {targetLayerPaths?.size})
          </div>
        )}
      </div>
    </>,
    document.body
  )
}

function TreeNodeComponent({
  node,
  level,
  parentPath,
  selectedPath,
  onPathSelect,
  readOnly,
  defaultExpanded = false,
  expandedPath,
  onInsertPath,
  onRemovePath,
  onRenamePath,
  onMovePath,
  onCopyPath,
  onCopyPathToClipboard,
  onCutPathToClipboard,
  onPastePathFromClipboard,
  onMergeLayer,
  onSubtractLayer,
  onPasteDocuments,
  pastedDocumentIds,
  clipboardPaths,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverPath,
  tree,
  sourceLayerPath,
  targetLayerPaths,
  onLayerSelectionChange,
}: TreeNodeProps) {
  const currentPath = parentPath === '/' ? `/${node.name}` : `${parentPath}/${node.name}`

  const shouldBeAutoExpanded = () => {
    if (expandedPath && expandedPath !== '/') {
      const normalizedExpandedPath = expandedPath.startsWith('/') ? expandedPath : `/${expandedPath}`
      const normalizedCurrentPath = currentPath.startsWith('/') ? currentPath : `/${currentPath}`
      return normalizedExpandedPath.startsWith(normalizedCurrentPath) && normalizedExpandedPath !== normalizedCurrentPath
    }
    return defaultExpanded
  }

  const [manuallyExpanded, setManuallyExpanded] = useState<boolean | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const isSelected = selectedPath === currentPath
  const hasChildren = node.children && node.children.length > 0
  const isDragOver = dragOverPath === currentPath

  const isSourceLayer = sourceLayerPath === currentPath
  const isTargetLayer = targetLayerPaths?.has(currentPath) || false

  const isExpanded = manuallyExpanded !== null ? manuallyExpanded : shouldBeAutoExpanded()

  useEffect(() => {}, [expandedPath, manuallyExpanded])

  const handleToggle = () => {
    if (hasChildren) setManuallyExpanded(!isExpanded)
  }

  const handleSelect = (e: React.MouseEvent) => {
    if (onLayerSelectionChange && (onMergeLayer || onSubtractLayer)) {
      if (e.ctrlKey || e.metaKey) {
        if (sourceLayerPath && currentPath !== sourceLayerPath) {
          const newTargets = new Set(targetLayerPaths || [])
          if (newTargets.has(currentPath)) newTargets.delete(currentPath)
          else newTargets.add(currentPath)
          onLayerSelectionChange(sourceLayerPath, newTargets)
        }
        return
      } else {
        onLayerSelectionChange(currentPath, new Set())
      }
    }

    onPathSelect(currentPath)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (readOnly) return
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  return (
    <div>
      <div
        className={cn(
          'flex items-center py-1 px-2 rounded-sm text-sm relative group cursor-pointer',
          readOnly && 'opacity-75',
          isSourceLayer && 'bg-blue-100 hover:bg-blue-200',
          !isSourceLayer && isTargetLayer && 'bg-red-100 hover:bg-red-200',
          !isSourceLayer && !isTargetLayer && isSelected && 'bg-accent text-accent-foreground',
          !isSourceLayer && !isTargetLayer && !isSelected && 'hover:bg-accent hover:text-accent-foreground',
          isDragOver && !readOnly && 'border-2 border-blue-300'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
        onContextMenu={handleContextMenu}
        draggable={!readOnly}
        onDragStart={(e) => !readOnly && onDragStart(currentPath, e)}
        onDragOver={(e) => !readOnly && onDragOver(currentPath, e)}
        onDrop={(e) => !readOnly && onDrop(currentPath, e)}
      >
        <div className="flex items-center justify-center w-4 h-4 mr-1">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleToggle()
              }}
              className="hover:bg-muted rounded-sm p-0.5"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : (
            <div className="w-3 h-3" />
          )}
        </div>

        <div className="flex items-center justify-center w-4 h-4 mr-2">
          {hasChildren && isExpanded ? (
            <FolderOpen className="h-3 w-3 text-blue-500" />
          ) : (
            <Folder className="h-3 w-3 text-blue-500" />
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {node.color && node.color !== '#fff' && (
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: node.color }}
              title={`Color: ${node.color}`}
            />
          )}
          <span className="truncate" title={node.description || node.label}>
            {node.label}
          </span>
        </div>

        {!readOnly && (
          <button
            className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded-sm p-1 ml-auto"
            onClick={(e) => {
              e.stopPropagation()
              handleContextMenu(e)
            }}
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        )}
      </div>

      <ContextMenu
        isOpen={!!contextMenu}
        onClose={() => setContextMenu(null)}
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        path={currentPath}
        onInsertPath={onInsertPath}
        onRemovePath={onRemovePath}
        onRenamePath={onRenamePath}
        onCopyPath={onCopyPathToClipboard}
        onCutPath={onCutPathToClipboard}
        onPastePath={onPastePathFromClipboard}
        onMergeLayer={onMergeLayer}
        onSubtractLayer={onSubtractLayer}
        onPasteDocuments={onPasteDocuments}
        pastedDocumentIds={pastedDocumentIds}
        sourceLayerPath={sourceLayerPath}
        targetLayerPaths={targetLayerPaths}
        clipboardPaths={clipboardPaths}
        tree={tree}
      />

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              parentPath={currentPath}
              selectedPath={selectedPath}
              onPathSelect={onPathSelect}
              readOnly={readOnly}
              defaultExpanded={defaultExpanded}
              expandedPath={expandedPath}
              onInsertPath={onInsertPath}
              onRemovePath={onRemovePath}
              onRenamePath={onRenamePath}
              onMovePath={onMovePath}
              onCopyPath={onCopyPath}
              onCopyPathToClipboard={onCopyPathToClipboard}
              onCutPathToClipboard={onCutPathToClipboard}
              onPastePathFromClipboard={onPastePathFromClipboard}
              onMergeLayer={onMergeLayer}
              onSubtractLayer={onSubtractLayer}
              onPasteDocuments={onPasteDocuments}
              pastedDocumentIds={pastedDocumentIds}
              clipboardPaths={clipboardPaths}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              dragOverPath={dragOverPath}
              tree={tree}
              sourceLayerPath={sourceLayerPath}
              targetLayerPaths={targetLayerPaths}
              onLayerSelectionChange={onLayerSelectionChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function TreeView({
  tree,
  selectedPath,
  onPathSelect,
  readOnly = false,
  defaultExpanded = false,
  expandedPath,
  title,
  subtitle,
  onInsertPath,
  onRemovePath,
  onRenamePath,
  onMovePath,
  onCopyPath,
  onCopyPathToClipboard,
  onCutPathToClipboard,
  onPastePathFromClipboard,
  onMergeLayer,
  onSubtractLayer,
  onPasteDocuments,
  pastedDocumentIds,
  clipboardPaths,
  sourceLayerPath: externalSourceLayerPath,
  targetLayerPaths: externalTargetLayerPaths,
  onLayerSelectionChange: externalOnLayerSelectionChange,
}: TreeViewProps) {
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)
  const [draggedPath, setDraggedPath] = useState<string | null>(null)
  const [rootContextMenu, setRootContextMenu] = useState<{ x: number; y: number } | null>(null)
  const dragCounterRef = useRef(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const [internalClipboard, setInternalClipboard] = useState<TreeClipboard | null>(null)

  const [internalSourceLayerPath, setInternalSourceLayerPath] = useState<string | null>(null)
  const [internalTargetLayerPaths, setInternalTargetLayerPaths] = useState<Set<string>>(new Set())

  const sourceLayerPath = externalSourceLayerPath !== undefined ? externalSourceLayerPath : internalSourceLayerPath
  const targetLayerPaths = externalTargetLayerPaths !== undefined ? externalTargetLayerPaths : internalTargetLayerPaths

  const handleLayerSelectionChange = useCallback(
    (sourcePath: string | null, targetPaths: Set<string>) => {
      if (externalOnLayerSelectionChange) externalOnLayerSelectionChange(sourcePath, targetPaths)
      else {
        setInternalSourceLayerPath(sourcePath)
        setInternalTargetLayerPaths(targetPaths)
      }
    },
    [externalOnLayerSelectionChange]
  )

  const effectiveClipboardPaths = clipboardPaths ?? internalClipboard?.paths ?? []

  const handleCopyPathToClipboardInternal = useCallback(
    (path: string) => {
      if (readOnly) return
      if (!path || path === '/') return
      setInternalClipboard({ mode: 'copy', paths: [path] })
    },
    [readOnly]
  )

  const handleCutPathToClipboardInternal = useCallback(
    (path: string) => {
      if (readOnly) return
      if (!path || path === '/') return
      setInternalClipboard({ mode: 'cut', paths: [path] })
    },
    [readOnly]
  )

  const handlePastePathFromClipboardInternal = useCallback(
    async (targetPath: string): Promise<boolean> => {
      if (readOnly) return false
      if (!internalClipboard || internalClipboard.paths.length === 0) return false
      if (!onMovePath && !onCopyPath) return false

      const { mode, paths } = internalClipboard
      let didSomething = false

      for (const fromPath of paths) {
        if (!fromPath || fromPath === targetPath) continue

        if (mode === 'cut') {
          if (!onMovePath) return false
          await onMovePath(fromPath, targetPath, false)
          didSomething = true
        } else {
          if (!onCopyPath) return false
          await onCopyPath(fromPath, targetPath, false)
          didSomething = true
        }
      }

      if (!didSomething) return false
      if (mode === 'cut') setInternalClipboard(null)
      return true
    },
    [readOnly, internalClipboard, onMovePath, onCopyPath]
  )

  const effectiveCopyToClipboard = onCopyPathToClipboard ?? handleCopyPathToClipboardInternal
  const effectiveCutToClipboard = onCutPathToClipboard ?? handleCutPathToClipboardInternal
  const effectivePasteFromClipboard = onPastePathFromClipboard ?? handlePastePathFromClipboardInternal

  const handleDragStart = useCallback(
    (path: string, event: React.DragEvent) => {
      if (readOnly) return
      setDraggedPath(path)
      event.dataTransfer.setData('text/plain', path)
      event.dataTransfer.effectAllowed = 'copyMove'
    },
    [readOnly]
  )

  const handleDragOver = useCallback(
    (path: string, event: React.DragEvent) => {
      if (readOnly) return

      const hasDocumentData = event.dataTransfer.types.includes('application/json')
      const hasPathData = event.dataTransfer.types.includes('text/plain')

      if (hasPathData && draggedPath) {
        const normalizedSource = draggedPath.endsWith('/') ? draggedPath.slice(0, -1) : draggedPath
        const normalizedTarget = path.endsWith('/') ? path.slice(0, -1) : path

        const isCopy = event.ctrlKey || event.metaKey
        const sourceParent = normalizedSource.substring(0, normalizedSource.lastIndexOf('/')) || '/'

        const isInvalidOperation =
          normalizedTarget.startsWith(normalizedSource + '/') ||
          normalizedSource === normalizedTarget ||
          (!isCopy && normalizedTarget === sourceParent)

        if (isInvalidOperation) {
          event.dataTransfer.dropEffect = 'none'
          return
        }
      }

      event.preventDefault()

      if (hasDocumentData) event.dataTransfer.dropEffect = 'copy'
      else if (hasPathData) event.dataTransfer.dropEffect = event.ctrlKey ? 'copy' : 'move'
      else event.dataTransfer.dropEffect = 'copy'

      setDragOverPath(path)
      dragCounterRef.current++
    },
    [readOnly, draggedPath]
  )

  const handleDrop = useCallback(
    async (targetPath: string, event: React.DragEvent) => {
      if (readOnly) return

      event.preventDefault()
      setDragOverPath(null)
      dragCounterRef.current = 0

      try {
        const dragData = event.dataTransfer.getData('application/json')
        if (dragData) {
          const parsedData = JSON.parse(dragData)
          if (parsedData.type === 'document') {
            const documentIds = parsedData.documentIds || [parsedData.documentId]
            if (onPasteDocuments) await onPasteDocuments(targetPath, documentIds)
            return
          }
        }

        if (!draggedPath) return
        const sourcePath = draggedPath
        setDraggedPath(null)
        if (sourcePath === targetPath) return

        const isCtrlPressed = event.ctrlKey || event.metaKey
        if (!isCtrlPressed) {
          const normalizedSource = sourcePath.endsWith('/') ? sourcePath.slice(0, -1) : sourcePath
          const normalizedTarget = targetPath.endsWith('/') ? targetPath.slice(0, -1) : targetPath

          if (normalizedTarget.startsWith(normalizedSource + '/')) {
            alert(`Cannot move "${sourcePath}" into its own subdirectory "${targetPath}"`)
            return
          }

          const sourceParent = normalizedSource.substring(0, normalizedSource.lastIndexOf('/')) || '/'
          if (normalizedTarget === sourceParent) {
            alert(`Cannot move "${sourcePath}" to its current parent directory "${targetPath}"`)
            return
          }

          if (normalizedSource === normalizedTarget) return
        }

        const isShiftPressed = event.shiftKey

        if (isCtrlPressed && onCopyPath) {
          await onCopyPath(sourcePath, targetPath, false)
        } else if (onMovePath) {
          await onMovePath(sourcePath, targetPath, isShiftPressed)
        }
      } catch (error) {
        console.error('Error during drop operation:', error)
        alert(`Drop operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    [readOnly, draggedPath, onCopyPath, onMovePath, onPasteDocuments]
  )

  const handleDragLeave = useCallback(() => {
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setDragOverPath(null)
  }, [])

  const handleRootContextMenu = (e: React.MouseEvent) => {
    if (readOnly) return
    e.preventDefault()
    e.stopPropagation()
    setRootContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly) return
    const isMod = e.ctrlKey || e.metaKey
    if (!isMod) return
    const key = e.key.toLowerCase()
    if (key === 'c') {
      e.preventDefault()
      effectiveCopyToClipboard(selectedPath)
    } else if (key === 'x') {
      e.preventDefault()
      effectiveCutToClipboard(selectedPath)
    } else if (key === 'v') {
      e.preventDefault()
      void effectivePasteFromClipboard(selectedPath)
    }
  }

  return (
    <div
      ref={rootRef}
      className="w-full outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseDown={() => rootRef.current?.focus()}
      onDragLeave={handleDragLeave}
    >
      {(title || subtitle) && (
        <div className="border-b pb-2 mb-2">
          {title && <h3 className="font-semibold text-sm text-muted-foreground">{title}</h3>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      <div className="space-y-0.5">
        <div
          className={cn(
            'flex items-center py-1 px-2 rounded-sm text-sm group cursor-pointer hover:bg-accent hover:text-accent-foreground',
            readOnly && 'opacity-75',
            selectedPath === '/' && 'bg-accent text-accent-foreground',
            dragOverPath === '/' && !readOnly && 'bg-blue-100 border-2 border-blue-300'
          )}
          onClick={() => onPathSelect('/')}
          onContextMenu={handleRootContextMenu}
          onDragOver={(e) => !readOnly && handleDragOver('/', e)}
          onDrop={(e) => !readOnly && handleDrop('/', e)}
        >
          <div className="flex items-center justify-center w-4 h-4 mr-1">
            <div className="w-3 h-3" />
          </div>
          <div className="flex items-center justify-center w-4 h-4 mr-2">
            <FolderOpen className="h-3 w-3 text-blue-600" />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {tree.color && tree.color !== '#fff' && (
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: tree.color }}
                title={`Color: ${tree.color}`}
              />
            )}
            <span className="truncate font-medium" title={tree.description || 'Root directory'}>
              /
            </span>
          </div>

          {!readOnly && (
            <button
              className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded-sm p-1 ml-auto"
              onClick={(e) => {
                e.stopPropagation()
                handleRootContextMenu(e)
              }}
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          )}
        </div>

        <ContextMenu
          isOpen={!!rootContextMenu}
          onClose={() => setRootContextMenu(null)}
          x={rootContextMenu?.x || 0}
          y={rootContextMenu?.y || 0}
          path="/"
          onInsertPath={onInsertPath}
          onRemovePath={onRemovePath}
          onRenamePath={onRenamePath}
          onCopyPath={effectiveCopyToClipboard}
          onCutPath={effectiveCutToClipboard}
          onPastePath={effectivePasteFromClipboard}
          onMergeLayer={onMergeLayer}
          onSubtractLayer={onSubtractLayer}
          onPasteDocuments={onPasteDocuments}
          pastedDocumentIds={pastedDocumentIds}
          clipboardPaths={effectiveClipboardPaths}
          tree={tree}
          sourceLayerPath={sourceLayerPath}
          targetLayerPaths={targetLayerPaths}
        />

        {tree.children?.map((child) => (
          <TreeNodeComponent
            key={child.id}
            node={child}
            level={1}
            parentPath="/"
            selectedPath={selectedPath}
            onPathSelect={onPathSelect}
            readOnly={readOnly}
            defaultExpanded={defaultExpanded}
            expandedPath={expandedPath}
            onInsertPath={onInsertPath}
            onRemovePath={onRemovePath}
            onRenamePath={onRenamePath}
            onMovePath={onMovePath}
            onCopyPath={onCopyPath}
            onCopyPathToClipboard={effectiveCopyToClipboard}
            onCutPathToClipboard={effectiveCutToClipboard}
            onPastePathFromClipboard={effectivePasteFromClipboard}
            onMergeLayer={onMergeLayer}
            onSubtractLayer={onSubtractLayer}
            onPasteDocuments={onPasteDocuments}
            pastedDocumentIds={pastedDocumentIds}
            clipboardPaths={effectiveClipboardPaths}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            dragOverPath={dragOverPath}
            tree={tree}
            sourceLayerPath={sourceLayerPath}
            targetLayerPaths={targetLayerPaths}
            onLayerSelectionChange={handleLayerSelectionChange}
          />
        ))}
      </div>
    </div>
  )
}

