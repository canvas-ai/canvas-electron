import { useState } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react'
import { TreeNode } from '@/types/workspace'
import { cn } from '@/lib/utils'

interface TreeViewProps {
  tree: TreeNode
  selectedPath: string
  onPathSelect: (path: string) => void
}

interface TreeNodeProps {
  node: TreeNode
  level: number
  parentPath: string
  selectedPath: string
  onPathSelect: (path: string) => void
}

function TreeNodeComponent({ node, level, parentPath, selectedPath, onPathSelect }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Build the current path
  const currentPath = parentPath === '/' ? `/${node.name}` : `${parentPath}/${node.name}`
  const isSelected = selectedPath === currentPath
  const hasChildren = node.children && node.children.length > 0

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleSelect = () => {
    onPathSelect(currentPath)
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm",
          isSelected && "bg-accent text-accent-foreground",
          "text-sm"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse button */}
        <div className="flex items-center justify-center w-4 h-4 mr-1">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleToggle()
              }}
              className="hover:bg-muted rounded-sm p-0.5"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <div className="w-3 h-3" />
          )}
        </div>

        {/* Folder icon */}
        <div className="flex items-center justify-center w-4 h-4 mr-2">
          {hasChildren && isExpanded ? (
            <FolderOpen className="h-3 w-3 text-blue-500" />
          ) : (
            <Folder className="h-3 w-3 text-blue-500" />
          )}
        </div>

        {/* Node label with color indicator */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {node.color && (
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
      </div>

      {/* Children */}
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
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function TreeView({ tree, selectedPath, onPathSelect }: TreeViewProps) {
  return (
    <div className="w-full">
      <div className="border-b pb-2 mb-2">
        <h3 className="font-semibold text-sm text-muted-foreground">Workspace Tree</h3>
      </div>

      <div className="space-y-0.5">
        {/* Root node */}
        <div
          className={cn(
            "flex items-center py-1 px-2 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm",
            selectedPath === '/' && "bg-accent text-accent-foreground",
            "text-sm"
          )}
          onClick={() => onPathSelect('/')}
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
            <span className="truncate font-medium" title={tree.description || tree.label}>
              {tree.label}
            </span>
          </div>
        </div>

        {/* Child nodes */}
        {tree.children?.map((child) => (
          <TreeNodeComponent
            key={child.id}
            node={child}
            level={0}
            parentPath="/"
            selectedPath={selectedPath}
            onPathSelect={onPathSelect}
          />
        ))}
      </div>
    </div>
  )
}
