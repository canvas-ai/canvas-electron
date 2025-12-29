import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { TreeNode } from '@/types/workspace'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LayerSelectorDialogProps {
  isOpen: boolean
  onClose: () => void
  tree: TreeNode
  currentLayerName: string
  operation: 'merge' | 'subtract'
  onConfirm: (selectedLayers: string[]) => Promise<void>
}

function flattenTree(node: TreeNode, parentPath: string = ''): Array<{ name: string; path: string }> {
  const result: Array<{ name: string; path: string }> = []

  if (node.name && node.name !== '/') {
    const currentPath = parentPath === '/' ? `/${node.name}` : `${parentPath}/${node.name}`
    result.push({ name: node.name, path: currentPath })
  }

  if (node.children && node.children.length > 0) {
    const currentPath = node.name === '/' ? '/' : (parentPath === '/' ? `/${node.name}` : `${parentPath}/${node.name}`)
    for (const child of node.children) {
      result.push(...flattenTree(child, currentPath))
    }
  }

  return result
}

export function LayerSelectorDialog({
  isOpen,
  onClose,
  tree,
  currentLayerName,
  operation,
  onConfirm
}: LayerSelectorDialogProps) {
  const [selectedLayers, setSelectedLayers] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const layers = flattenTree(tree).filter(layer => layer.name !== currentLayerName)

  const toggleLayer = (layerName: string) => {
    const newSelected = new Set(selectedLayers)
    if (newSelected.has(layerName)) {
      newSelected.delete(layerName)
    } else {
      newSelected.add(layerName)
    }
    setSelectedLayers(newSelected)
  }

  const handleConfirm = async () => {
    if (selectedLayers.size === 0) return

    setIsLoading(true)
    try {
      await onConfirm(Array.from(selectedLayers))
      onClose()
    } catch (error) {
      console.error('Layer operation failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const operationText = operation === 'merge' ? 'Merge Into' : 'Subtract From'
  const actionText = operation === 'merge' ? 'merge' : 'subtract'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-md max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">{operationText} Layers</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Select layers to {actionText} <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{currentLayerName}</span> {operation === 'merge' ? 'into' : 'from'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Layer List */}
        <div className="flex-1 overflow-y-auto p-4">
          {layers.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No other layers available
            </div>
          ) : (
            <div className="space-y-1">
              {layers.map((layer) => (
                <button
                  key={layer.name}
                  onClick={() => toggleLayer(layer.name)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors",
                    selectedLayers.has(layer.name)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "h-4 w-4 border rounded flex items-center justify-center flex-shrink-0",
                    selectedLayers.has(layer.name)
                      ? "bg-primary-foreground border-primary-foreground"
                      : "border-muted-foreground"
                  )}>
                    {selectedLayers.has(layer.name) && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                  </div>
                  <span className="font-mono text-xs flex-1 text-left">{layer.name}</span>
                  <span className="text-xs text-muted-foreground">{layer.path}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedLayers.size} layer{selectedLayers.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={selectedLayers.size === 0 || isLoading}
            >
              {isLoading ? 'Processing...' : `${operationText}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

