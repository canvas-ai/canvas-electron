import { Document } from '@/types/workspace'
import { File, Calendar, Hash, Eye, ExternalLink, Globe, X, Trash2, Copy, Move, Clipboard, CheckSquare, Square, Download, Upload, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Scissors, Link } from 'lucide-react'
import { useState, useCallback, useMemo, useEffect } from 'react'
import Fuse from 'fuse.js'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { createPortal } from 'react-dom'

interface DocumentListProps {
  documents: Document[]
  isLoading: boolean
  contextPath: string
  totalCount: number
  onRemoveDocument?: (documentId: number) => void
  onDeleteDocument?: (documentId: number) => void
  onRemoveDocuments?: (documentIds: number[]) => void
  onDeleteDocuments?: (documentIds: number[]) => void
  onCopyDocuments?: (documentIds: number[]) => void
  onCutDocuments?: (documentIds: number[]) => void
  onPasteDocuments?: (path: string, documentIds: number[]) => Promise<boolean>
  onImportDocuments?: (documents: any[], contextPath: string) => Promise<boolean>
  pastedDocumentIds?: number[]
  viewMode?: 'card' | 'table'
  activeContextUrl?: string
  currentContextUrl?: string
  // Pagination props
  currentPage?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

interface DocumentRowProps {
  document: Document
  isSelected?: boolean
  onSelect?: (documentId: number, isSelected: boolean, isCtrlClick: boolean) => void
  onRemoveDocument?: (documentId: number) => void
  onDeleteDocument?: (documentId: number) => void
  onRightClick?: (event: React.MouseEvent, documentId: number) => void
  onDragStart?: (event: React.DragEvent, documentId: number) => void
}

interface DocumentTableRowProps {
  document: Document
  isSelected?: boolean
  onSelect?: (documentId: number, isSelected: boolean, isCtrlClick: boolean) => void
  onRemoveDocument?: (documentId: number) => void
  onDeleteDocument?: (documentId: number) => void
  onRightClick?: (event: React.MouseEvent, documentId: number) => void
  onDragStart?: (event: React.DragEvent, documentId: number) => void
}

interface DocumentDetailModalProps {
  document: Document | null
  isOpen: boolean
  onClose: () => void
}

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  documents: Document[]
  selectedDocuments: Set<number>
}

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (documents: any[]) => Promise<boolean>
}

function ExportModal({ isOpen, onClose, documents, selectedDocuments }: ExportModalProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  if (!isOpen) return null

  const handleClose = () => {
    setCopyStatus('idle')
    onClose()
  }

  const documentsToExport = selectedDocuments.size > 0
    ? documents.filter(doc => selectedDocuments.has(doc.id))
    : documents

  const exportData = documentsToExport.map(doc => ({
    schema: doc.schema,
    schemaVersion: doc.schemaVersion,
    data: doc.data,
    metadata: doc.metadata
  }))

  const jsonString = JSON.stringify(exportData, null, 2)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonString)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      setCopyStatus('error')
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'a') {
        e.preventDefault()
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(e.currentTarget)
        selection?.removeAllRanges()
        selection?.addRange(range)
      } else if (e.key === 'c') {
        copyToClipboard()
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Export Documents</h2>
              <p className="text-muted-foreground">
                Exporting {documentsToExport.length} document{documentsToExport.length !== 1 ? 's' : ''}
                {copyStatus === 'copied' && <span className="text-green-600 ml-2">✓ Copied to clipboard!</span>}
                {copyStatus === 'error' && <span className="text-red-600 ml-2">✗ Failed to copy</span>}
              </p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-muted rounded-sm" title="Close">✕</button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">JSON Data (Press Ctrl+A to select all, Ctrl+C to copy)</h3>
                <Button onClick={copyToClipboard} size="sm" className="flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </Button>
              </div>
            <textarea
              className="w-full h-96 p-4 bg-muted border rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              value={jsonString}
              readOnly
              autoFocus
              onKeyDown={handleKeyDown}
              onFocus={(e) => e.target.select()}
            />
            </div>
          </div>

          <div className="mt-8 pt-4 border-t flex justify-end">
            <Button onClick={handleClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [jsonInput, setJsonInput] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const validateAndImport = async () => {
    setError(null)
    if (!jsonInput.trim()) {
      setError('Please enter JSON data')
      return
    }

    try {
      const parsed = JSON.parse(jsonInput)
      const documents = Array.isArray(parsed) ? parsed : [parsed]

      // Validate document structure
      for (const doc of documents) {
        if (!doc.schema || !doc.data) {
          setError('Each document must have "schema" and "data" fields')
          return
        }
      }

      setIsImporting(true)
      const success = await onImport(documents)
      if (success) {
        setJsonInput('')
        onClose()
      } else {
        setError('Failed to import documents')
      }
    } catch (err) {
      setError('Invalid JSON format')
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setJsonInput('')
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Import Documents</h2>
              <p className="text-muted-foreground">
                Paste JSON data containing documents to import
              </p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-muted rounded-sm" title="Close">✕</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                JSON Data (single document or array of documents)
              </label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-64 p-3 border rounded-lg font-mono text-sm"
                placeholder='[{"schema": "data/abstraction/tab", "schemaVersion": "2.0", "data": {...}, "metadata": {...}}]'
                disabled={isImporting}
                autoFocus
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border">
                {error}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <p><strong>Format:</strong> Each document must have "schema", "schemaVersion", "data", and "metadata" fields.</p>
              <p><strong>Example schemas:</strong> "data/abstraction/tab", "data/abstraction/file", etc.</p>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t flex justify-between">
            <Button variant="outline" onClick={handleClose} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={validateAndImport} disabled={isImporting || !jsonInput.trim()}>
              {isImporting ? 'Importing...' : 'Import Documents'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DocumentDetailModal({ document, isOpen, onClose }: DocumentDetailModalProps) {
  const [showRawJson, setShowRawJson] = useState(false)
  if (!isOpen || !document) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Document Details</h2>
              <p className="text-muted-foreground">ID: {document.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowRawJson(v => !v)}>
                {showRawJson ? 'View Data' : 'View Raw JSON'}
              </Button>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-sm" title="Close">✕</button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Basic Information</h3>
              <div className="grid gap-3 text-sm">
                <div><span className="font-medium">Schema:</span><span className="ml-2 font-mono">{document.schema}</span></div>
                <div><span className="font-medium">Schema Version:</span><span className="ml-2">{document.schemaVersion}</span></div>
                <div><span className="font-medium">Version:</span><span className="ml-2">{document.versionNumber} / {document.latestVersion}</span></div>
                <div><span className="font-medium">Created:</span><span className="ml-2">{formatDate(document.createdAt)}</span></div>
                <div><span className="font-medium">Updated:</span><span className="ml-2">{formatDate(document.updatedAt)}</span></div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">{showRawJson ? 'Raw Document JSON' : 'Document Data'}</h3>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">{JSON.stringify(showRawJson ? document : document.data, null, 2)}</pre>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Metadata</h3>
              <div className="grid gap-3 text-sm">
                <div><span className="font-medium">Content Type:</span><span className="ml-2">{document.metadata.contentType}</span></div>
                <div><span className="font-medium">Content Encoding:</span><span className="ml-2">{document.metadata.contentEncoding}</span></div>
                {document.metadata.dataPaths.length > 0 && (
                  <div>
                    <span className="font-medium">Data Paths:</span>
                    <div className="ml-2 mt-1">
                      {document.metadata.dataPaths.map((path, index) => (<div key={index} className="font-mono text-xs">{path}</div>))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {document.checksumArray.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Checksums</h3>
                <div className="space-y-2">
                  {document.checksumArray.map((checksum, index) => {
                    const [algo, hash] = checksum.split('/')
                    return (
                      <div key={index} className="flex items-center gap-2 text-sm font-mono">
                        <span className="font-medium">{algo}:</span>
                        <span className="text-muted-foreground">{hash}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">Index Options</h3>
              <div className="space-y-3 text-sm">
                <div><span className="font-medium">Primary Checksum Algorithm:</span><span className="ml-2">{document.indexOptions.primaryChecksumAlgorithm}</span></div>
                <div>
                  <span className="font-medium">FTS Search Fields:</span>
                  <div className="ml-2 mt-1">{document.indexOptions.ftsSearchFields.map((field, index) => (<span key={index} className="inline-block bg-muted px-2 py-1 rounded text-xs mr-2 mb-1">{field}</span>))}</div>
                </div>
                <div>
                  <span className="font-medium">Vector Embedding Fields:</span>
                  <div className="ml-2 mt-1">{document.indexOptions.vectorEmbeddingFields.map((field, index) => (<span key={index} className="inline-block bg-muted px-2 py-1 rounded text-xs mr-2 mb-1">{field}</span>))}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DocumentTableRow({ document, isSelected, onSelect, onRemoveDocument, onDeleteDocument, onRightClick, onDragStart }: DocumentTableRowProps) {
  const [showDetailModal, setShowDetailModal] = useState(false)

  const isTabDocument = document.schema === 'data/abstraction/tab'
  const tabUrl = isTabDocument ? document.data.url : null

  const handleDragStart = (e: React.DragEvent) => {
    onDragStart?.(e, document.id);
  }

  const getDisplayTitle = () => {
    if (document.data.title) return document.data.title
    if (document.data.name) return document.data.name
    if (document.data.filename) return document.data.filename
    if (isTabDocument && document.data.url) {
      try { const url = new URL(document.data.url); return url.hostname + url.pathname } catch { return document.data.url }
    }
    return `Document ${document.id}`
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const getSchemaDisplayName = (schema: string) => { const parts = schema.split('/'); return parts[parts.length - 1] || schema }

  const getPrimaryChecksum = () => {
    if (document.checksumArray && document.checksumArray.length > 0) {
      const primary = document.checksumArray.find(c => c.startsWith(document.indexOptions?.primaryChecksumAlgorithm || 'sha1'))
      if (primary) { const [algo, hash] = primary.split('/'); return { algo, hash: hash.substring(0, 8) + '...' } }
    }
    return null
  }

  const primaryChecksum = getPrimaryChecksum()

  const handleDocumentClick = (e: React.MouseEvent) => {
    const isCtrlClick = e.ctrlKey || e.metaKey
    if (onSelect) {
      if (isCtrlClick) {
        // For ctrl+click, toggle selection state
        onSelect(document.id, !isSelected, isCtrlClick)
      } else {
        // For regular click, always select this document (and clear others)
        onSelect(document.id, true, isCtrlClick)
      }
    }
    if (!isCtrlClick) {
      if (isTabDocument && tabUrl) {
        window.open(tabUrl, '_blank', 'noopener,noreferrer')
      } else {
        setShowDetailModal(true)
      }
    }
  }

  const handleMouseDown = () => {
    // Removed auto-selection logic to avoid race conditions with drag operations
    // Drag will work based on current selection state, click will handle selection
  }

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent bubbling to empty area handler
    if (onSelect && !isSelected) { onSelect(document.id, true, false) }
    onRightClick?.(e, document.id)
  }

  const handleViewDetails = (e: React.MouseEvent) => { e.stopPropagation(); setShowDetailModal(true) }
  const handleRemoveDocument = (e: React.MouseEvent) => { e.stopPropagation(); onRemoveDocument?.(document.id) }
  const handleDeleteDocument = (e: React.MouseEvent) => { e.stopPropagation(); onDeleteDocument?.(document.id) }

  return (
    <>
      <TableRow
        className={`cursor-pointer ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-muted/50'}`}
        onClick={handleDocumentClick}
        onMouseDown={handleMouseDown}
        onContextMenu={handleRightClick}
        draggable
        onDragStart={handleDragStart}
      >
        <TableCell className="w-12">{isTabDocument ? <Globe className="h-4 w-4 text-blue-500" /> : <File className="h-4 w-4 text-blue-500" />}</TableCell>
        <TableCell className="font-medium max-w-xs">
          <div className="flex items-center gap-2">
            <span className="truncate" title={getDisplayTitle()}>{getDisplayTitle()}</span>
            {isTabDocument && (<ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />)}
          </div>
        </TableCell>
        <TableCell><span className="px-2 py-1 text-xs bg-muted rounded border">{getSchemaDisplayName(document.schema)}</span></TableCell>
        <TableCell className="text-xs text-muted-foreground">{document.id}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{primaryChecksum && (<span className="font-mono" title={`${primaryChecksum.algo} checksum`}>{primaryChecksum.hash}</span>)}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{formatDate(document.createdAt)}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{document.versionNumber > 1 ? `v${document.versionNumber}` : ''}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleViewDetails} title="View document details"><Eye className="h-4 w-4" /></Button>
            {onRemoveDocument && (<Button variant="ghost" size="sm" onClick={handleRemoveDocument} title="Remove document from context"><X className="h-4 w-4" /></Button>)}
            {onDeleteDocument && (<Button variant="ghost" size="sm" onClick={handleDeleteDocument} title="Delete document permanently" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>)}
          </div>
        </TableCell>
      </TableRow>
      <DocumentDetailModal document={document} isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} />
    </>
  )
}

function DocumentRow({ document, isSelected, onSelect, onRemoveDocument, onDeleteDocument, onRightClick, onDragStart }: DocumentRowProps) {
  const [showDetailModal, setShowDetailModal] = useState(false)
  const isTabDocument = document.schema === 'data/abstraction/tab'
  const tabUrl = isTabDocument ? document.data.url : null

  const handleDragStart = (e: React.DragEvent) => {
    onDragStart?.(e, document.id);
  }

  const getDisplayTitle = () => {
    if (document.data.title) return document.data.title
    if (document.data.name) return document.data.name
    if (document.data.filename) return document.data.filename
    if (isTabDocument && document.data.url) { try { const url = new URL(document.data.url); return url.hostname + url.pathname } catch { return document.data.url } }
    return `Document ${document.id}`
  }

  const getDisplayContent = () => {
    if (document.data.content) { const content = String(document.data.content); return content.length > 100 ? content.substring(0, 100) + '...' : content }
    if (document.data.description) return document.data.description
    if (document.data.summary) return document.data.summary
    if (isTabDocument && document.data.url) return `Tab: ${document.data.url}`
    return ''
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const getSchemaDisplayName = (schema: string) => { const parts = schema.split('/'); return parts[parts.length - 1] || schema }

  const getPrimaryChecksum = () => { if (document.checksumArray && document.checksumArray.length > 0) { const primary = document.checksumArray.find(c => c.startsWith(document.indexOptions?.primaryChecksumAlgorithm || 'sha1')); if (primary) { const [algo, hash] = primary.split('/'); return { algo, hash: hash.substring(0, 8) + '...' } } } return null }

  const primaryChecksum = getPrimaryChecksum()

  const handleDocumentClick = (e: React.MouseEvent) => {
    const isCtrlClick = e.ctrlKey || e.metaKey
    if (onSelect) {
      if (isCtrlClick) {
        // For ctrl+click, toggle selection state
        onSelect(document.id, !isSelected, isCtrlClick)
      } else {
        // For regular click, always select this document (and clear others)
        onSelect(document.id, true, isCtrlClick)
      }
    }
    if (!isCtrlClick) { if (isTabDocument && tabUrl) { window.open(tabUrl, '_blank', 'noopener,noreferrer') } else { setShowDetailModal(true) } }
  }

  const handleMouseDown = () => {
    // Removed auto-selection logic to avoid race conditions with drag operations
    // Drag will work based on current selection state, click will handle selection
  }

  const handleRightClick = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); if (onSelect && !isSelected) { onSelect(document.id, true, false) } onRightClick?.(e, document.id) }
  const handleViewDetails = (e: React.MouseEvent) => { e.stopPropagation(); setShowDetailModal(true) }
  const handleRemoveDocument = (e: React.MouseEvent) => { e.stopPropagation(); onRemoveDocument?.(document.id) }
  const handleDeleteDocument = (e: React.MouseEvent) => { e.stopPropagation(); onDeleteDocument?.(document.id) }

  return (
    <>
      <div
        className={`border rounded-lg p-4 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : ''} ${isTabDocument && !isSelected ? 'hover:bg-blue-50 hover:border-blue-200' : !isSelected ? 'hover:bg-accent/50' : ''}`}
        onClick={handleDocumentClick}
        onMouseDown={handleMouseDown}
        onContextMenu={handleRightClick}
        draggable
        onDragStart={handleDragStart}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 overflow-hidden">
              {isTabDocument ? (<Globe className="h-4 w-4 text-blue-500 flex-shrink-0" />) : (<File className="h-4 w-4 text-blue-500 flex-shrink-0" />)}
              <h4 className="font-medium truncate min-w-0 flex-1 max-w-[640px]" title={getDisplayTitle()}>{getDisplayTitle()}</h4>
              {isTabDocument && (<ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />)}
              <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded border flex-shrink-0">{getSchemaDisplayName(document.schema)}</span>
            </div>

            {getDisplayContent() && (<p className="text-sm text-muted-foreground mb-3 line-clamp-2 break-all overflow-hidden">{getDisplayContent()}</p>)}

            <div className="flex items-center gap-4 text-xs text-muted-foreground overflow-hidden">
              <div className="flex items-center gap-1 flex-shrink-0"><span className="font-medium">ID:</span><span className="font-mono truncate max-w-[60px]" title={`ID: ${document.id}`}>{document.id}</span></div>
              {primaryChecksum && (<div className="flex items-center gap-1 flex-shrink-0"><Hash className="h-3 w-3" /><span className="font-mono" title={`${primaryChecksum.algo} checksum`}>{primaryChecksum.hash}</span></div>)}
              <div className="flex items-center gap-1 flex-shrink-0"><Calendar className="h-3 w-3" /><span title={`Created: ${formatDate(document.createdAt)}`}>{formatDate(document.createdAt)}</span></div>
              {document.versionNumber > 1 && (<div className="flex items-center gap-1 flex-shrink-0"><span className="font-medium">v{document.versionNumber}</span></div>)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleViewDetails} className="p-1 hover:bg-muted rounded-sm" title="View document details"><Eye className="h-4 w-4" /></button>
            {onRemoveDocument && (<button onClick={handleRemoveDocument} className="p-1 hover:bg-muted rounded-sm" title="Remove document from context (keep in database)"><X className="h-4 w-4" /></button>)}
            {onDeleteDocument && (<button onClick={handleDeleteDocument} className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded-sm text-destructive" title="Delete document permanently from database"><Trash2 className="h-4 w-4" /></button>)}
          </div>
        </div>
      </div>
      <DocumentDetailModal document={document} isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} />
    </>
  )
}

export function DocumentList({ documents, isLoading, contextPath, totalCount, onRemoveDocument, onDeleteDocument, onRemoveDocuments, onDeleteDocuments, onCopyDocuments, onCutDocuments, onPasteDocuments, onImportDocuments, pastedDocumentIds, viewMode = 'card', activeContextUrl, currentContextUrl, currentPage = 1, pageSize = 50, onPageChange, onPageSizeChange }: DocumentListProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<Set<number>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; documentIds: number[] } | null>(null)
  const [emptyAreaContextMenu, setEmptyAreaContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Clear selection when context path changes
  useEffect(() => {
    setSelectedDocuments(new Set())
  }, [contextPath])
      // Handle drag start for selected documents
  const handleMultiDragStart = useCallback((e: React.DragEvent, documentId: number) => {
    // Always ensure the dragged document is included
    let draggedIds: number[];

    if (selectedDocuments.has(documentId) && selectedDocuments.size > 1) {
      // Document is part of a multi-selection, drag all selected documents
      draggedIds = Array.from(selectedDocuments);
    } else {
      // Single document drag - either it's the only selected one or not selected at all
      draggedIds = [documentId];
      // Update selection to show this document is being dragged
      setSelectedDocuments(new Set([documentId]));
    }

    const dragData = {
      type: 'document',
      documentIds: draggedIds
    };

    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copyMove';

    // Add visual feedback for dragging
    e.dataTransfer.setDragImage(e.currentTarget as Element, 0, 0);
  }, [selectedDocuments])

  // Fuse.js configuration for fuzzy search
  const fuseOptions = useMemo(() => ({
    keys: [
      { name: 'data.title', weight: 0.4 },
      { name: 'data.name', weight: 0.4 },
      { name: 'data.filename', weight: 0.4 },
      { name: 'data.url', weight: 0.3 },
      { name: 'data.content', weight: 0.2 },
      { name: 'data.description', weight: 0.2 },
      { name: 'schema', weight: 0.1 }
    ],
    threshold: 0.4,
    location: 0,
    distance: 100,
    minMatchCharLength: 1,
    includeScore: true,
    includeMatches: true,
    ignoreLocation: true
  }), [])

  // Create Fuse instance
  const fuse = useMemo(() => {
    if (documents.length === 0) return null
    return new Fuse(documents, fuseOptions)
  }, [documents, fuseOptions])

  // Filter documents based on search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents
    if (!fuse) return documents

    const searchResults = fuse.search(searchQuery)
    return searchResults.map(result => result.item)
  }, [documents, searchQuery, fuse])

  const handleDocumentSelect = useCallback((documentId: number, isSelected: boolean, isCtrlClick: boolean) => {
    setSelectedDocuments(prev => {
      const newSelection = new Set(prev)
      if (isCtrlClick) {
        if (isSelected) { newSelection.add(documentId) } else { newSelection.delete(documentId) }
      } else {
        newSelection.clear(); if (isSelected) { newSelection.add(documentId) }
      }
      return newSelection
    })
  }, [])

  const handleDocumentRightClick = useCallback((event: React.MouseEvent, documentId: number) => {
    event.preventDefault()
    event.stopPropagation() // Prevent bubbling to empty area handler
    let targetIds: number[]
    if (selectedDocuments.has(documentId)) { targetIds = Array.from(selectedDocuments) } else { targetIds = [documentId]; setSelectedDocuments(new Set([documentId])) }
    setContextMenu({ x: event.clientX, y: event.clientY, documentIds: targetIds })
  }, [selectedDocuments])

  const handleContextMenuAction = useCallback(async (action: string, documentIds: number[]) => {
    switch (action) {
      case 'copy': onCopyDocuments?.(documentIds); break
      case 'cut': onCutDocuments?.(documentIds); break
      case 'remove': documentIds.length === 1 ? onRemoveDocument?.(documentIds[0]) : onRemoveDocuments?.(documentIds); break
      case 'delete': documentIds.length === 1 ? onDeleteDocument?.(documentIds[0]) : onDeleteDocuments?.(documentIds); break
      case 'view-details':
        if (documentIds.length === 1) {
          const document = documents.find(doc => doc.id === documentIds[0]);
          if (document) {
            // Find the document row and trigger the detail modal
            const detailEvent = new CustomEvent('show-document-detail', { detail: { document } });
            window.dispatchEvent(detailEvent);
          }
        }
        break;
      case 'open-url':
        if (documentIds.length === 1) {
          const document = documents.find(doc => doc.id === documentIds[0]);
          if (document && document.schema === 'data/abstraction/tab' && document.data.url) {
            window.open(document.data.url, '_blank', 'noopener,noreferrer');
          }
        }
        break;
      case 'copy-id':
        if (documentIds.length === 1) {
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(documentIds[0].toString());
            } else {
              // Fallback for environments without clipboard API
              const textArea = document.createElement('textarea');
              textArea.value = documentIds[0].toString();
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
            }
          } catch (err) {
            console.error('Failed to copy ID to clipboard:', err);
            // Fallback method
            const textArea = document.createElement('textarea');
            textArea.value = documentIds[0].toString();
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
          }
        }
        break;
    }
    setContextMenu(null)
    setSelectedDocuments(new Set())
  }, [onCopyDocuments, onCutDocuments, onRemoveDocument, onRemoveDocuments, onDeleteDocument, onDeleteDocuments, documents])

  const handleEmptyAreaRightClick = useCallback((event: React.MouseEvent) => {
    // Show context menu if there are documents to paste or import functionality is available
    const hasPasteOption = pastedDocumentIds && pastedDocumentIds.length > 0 && onPasteDocuments
    const hasImportOption = onImportDocuments

    if (!hasPasteOption && !hasImportOption) return

    event.preventDefault()
    event.stopPropagation()
    setEmptyAreaContextMenu({ x: event.clientX, y: event.clientY })
  }, [pastedDocumentIds, onPasteDocuments, onImportDocuments])

  const handleEmptyAreaPaste = useCallback(async () => {
    if (!onPasteDocuments || !pastedDocumentIds || pastedDocumentIds.length === 0) return
    try {
      await onPasteDocuments(contextPath, pastedDocumentIds)
    } catch (error) {
      console.error('Failed to paste documents:', error)
    } finally {
      setEmptyAreaContextMenu(null)
    }
  }, [onPasteDocuments, pastedDocumentIds, contextPath])

  const handleSelectAll = useCallback(() => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set())
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)))
    }
  }, [selectedDocuments.size, filteredDocuments])

  const handleImport = useCallback(async (importedDocuments: any[]) => {
    if (!onImportDocuments) return false
    try {
      return await onImportDocuments(importedDocuments, contextPath)
    } catch (error) {
      console.error('Failed to import documents:', error)
      return false
    }
  }, [onImportDocuments, contextPath])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 p-4">
      <div className="border-b pb-3 mb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground">Documents</h3>
            <p className="text-xs text-muted-foreground mt-1">Context: <span className="font-mono">{contextPath}</span>{activeContextUrl && currentContextUrl && activeContextUrl !== currentContextUrl && (<span className="text-orange-600 ml-2">(not yet active)</span>)}</p>
            {selectedDocuments.size > 0 && (<p className="text-xs text-blue-600 mt-1">{selectedDocuments.size} document{selectedDocuments.size !== 1 ? 's' : ''} selected</p>)}
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{searchQuery ? `${filteredDocuments.length} of ${documents.length}` : `${documents.length}`} documents</p>
            {totalCount > documents.length && (<p className="text-xs text-muted-foreground">{totalCount} total (showing first {documents.length})</p>)}
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-3 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        {onPageChange && totalCount > pageSize && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span>per page</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(1)}
                  disabled={currentPage === 1}
                  className="p-1"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="px-3 py-1 text-sm font-medium">
                  Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  className="p-1"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.ceil(totalCount / pageSize))}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  className="p-1"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {documents.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex items-center gap-2"
              disabled={filteredDocuments.length === 0}
            >
              {selectedDocuments.size === filteredDocuments.length ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Deselect All{searchQuery && ` (${filteredDocuments.length})`}
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  Select All{searchQuery && ` (${filteredDocuments.length})`}
                </>
              )}
            </Button>

            {selectedDocuments.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const selectedIds = Array.from(selectedDocuments)
                    onCopyDocuments?.(selectedIds)
                  }}
                  className="flex items-center gap-2"
                  title="Copy selected documents"
                >
                  <Copy className="h-4 w-4" />
                  Copy ({selectedDocuments.size})
                </Button>

                {onCutDocuments && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const selectedIds = Array.from(selectedDocuments)
                      onCutDocuments(selectedIds)
                    }}
                    className="flex items-center gap-2"
                    title="Cut selected documents"
                  >
                    <Scissors className="h-4 w-4" />
                    Cut ({selectedDocuments.size})
                  </Button>
                )}

                {(onRemoveDocument || onRemoveDocuments) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const selectedIds = Array.from(selectedDocuments)
                      if (selectedIds.length === 1) {
                        onRemoveDocument?.(selectedIds[0])
                      } else {
                        onRemoveDocuments?.(selectedIds)
                      }
                      setSelectedDocuments(new Set())
                    }}
                    className="flex items-center gap-2"
                    title="Remove selected documents from context"
                  >
                    <X className="h-4 w-4" />
                    Remove ({selectedDocuments.size})
                  </Button>
                )}

                {(onDeleteDocument || onDeleteDocuments) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const selectedIds = Array.from(selectedDocuments)
                      if (selectedIds.length === 1) {
                        onDeleteDocument?.(selectedIds[0])
                      } else {
                        onDeleteDocuments?.(selectedIds)
                      }
                      setSelectedDocuments(new Set())
                    }}
                    className="flex items-center gap-2 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                    title="Delete selected documents permanently"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete ({selectedDocuments.size})
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2"
                  title="Export selected documents"
                >
                  <Download className="h-4 w-4" />
                  Export ({selectedDocuments.size})
                </Button>
              </>
            )}

            {pastedDocumentIds && pastedDocumentIds.length > 0 && onPasteDocuments && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPasteDocuments(contextPath, pastedDocumentIds)}
                className="flex items-center gap-2"
                title="Paste documents to current context"
              >
                <Clipboard className="h-4 w-4" />
                Paste ({pastedDocumentIds.length})
              </Button>
            )}

            {selectedDocuments.size === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2"
                title="Export all documents"
              >
                <Download className="h-4 w-4" />
                Export All
              </Button>
            )}

            {onImportDocuments && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2"
                title="Import documents"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
            )}
          </div>
        )}
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="flex-1 flex items-center justify-center" onContextMenu={handleEmptyAreaRightClick}>
          <div className="text-center space-y-2">
            <File className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No documents match your search' : 'No documents found in this context'}
            </p>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? (
                <>Search: <span className="font-mono">"{searchQuery}"</span></>
              ) : (
                <>Path: <span className="font-mono">{contextPath}</span></>
              )}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-primary hover:text-primary/80 underline mt-1"
              >
                Clear search
              </button>
            )}
            {!searchQuery && pastedDocumentIds && pastedDocumentIds.length > 0 && (
              <p className="text-xs text-muted-foreground">Right-click to paste {pastedDocumentIds.length} document(s)</p>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="flex-1 overflow-y-auto" onContextMenu={handleEmptyAreaRightClick}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Schema</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Checksum</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((document) => (
                <DocumentTableRow key={document.id} document={document} isSelected={selectedDocuments.has(document.id)} onSelect={handleDocumentSelect} onRemoveDocument={onRemoveDocument} onDeleteDocument={onDeleteDocument} onRightClick={handleDocumentRightClick} onDragStart={handleMultiDragStart} />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" onContextMenu={handleEmptyAreaRightClick}>
          <div className="space-y-3 pr-2">
            {filteredDocuments.map((document) => (
              <div key={document.id} onContextMenu={(e) => { e.stopPropagation(); handleDocumentRightClick(e, document.id); }}>
                <DocumentRow document={document} isSelected={selectedDocuments.has(document.id)} onSelect={handleDocumentSelect} onRemoveDocument={onRemoveDocument} onDeleteDocument={onDeleteDocument} onRightClick={handleDocumentRightClick} onDragStart={handleMultiDragStart} />
              </div>
            ))}
          </div>
        </div>
      )}

      {contextMenu && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 bg-background border rounded-lg shadow-lg py-1 min-w-[120px]" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button className="w-full text-left px-3 py-1 hover:bg-muted text-sm flex items-center gap-2" onClick={() => handleContextMenuAction('copy', contextMenu.documentIds)}>
              <Copy className="h-3 w-3" />
              Copy {contextMenu.documentIds.length > 1 ? `(${contextMenu.documentIds.length})` : ''}
            </button>
            {onCutDocuments && (
              <button className="w-full text-left px-3 py-1 hover:bg-muted text-sm flex items-center gap-2" onClick={() => handleContextMenuAction('cut', contextMenu.documentIds)}>
                <Scissors className="h-3 w-3" />
                Cut {contextMenu.documentIds.length > 1 ? `(${contextMenu.documentIds.length})` : ''}
              </button>
            )}
            {contextMenu.documentIds.length === 1 && (
              <>
                <div className="my-1 h-px bg-border" />
                <button className="w-full text-left px-3 py-1 hover:bg-muted text-sm flex items-center gap-2" onClick={() => handleContextMenuAction('view-details', contextMenu.documentIds)}>
                  <Eye className="h-3 w-3" />
                  View Details
                </button>
                {(() => {
                  const document = documents.find(doc => doc.id === contextMenu.documentIds[0]);
                  const isTabDocument = document?.schema === 'data/abstraction/tab';
                  return isTabDocument && document?.data.url ? (
                    <button className="w-full text-left px-3 py-1 hover:bg-muted text-sm flex items-center gap-2" onClick={() => handleContextMenuAction('open-url', contextMenu.documentIds)}>
                      <ExternalLink className="h-3 w-3" />
                      Open URL
                    </button>
                  ) : null;
                })()}
                <button className="w-full text-left px-3 py-1 hover:bg-muted text-sm flex items-center gap-2" onClick={() => handleContextMenuAction('copy-id', contextMenu.documentIds)}>
                  <Link className="h-3 w-3" />
                  Copy ID
                </button>
              </>
            )}
            {(onRemoveDocument || onRemoveDocuments) && (
              <>
                <div className="my-1 h-px bg-border" />
                <button className="w-full text-left px-3 py-1 hover:bg-muted text-sm flex items-center gap-2" onClick={() => handleContextMenuAction('remove', contextMenu.documentIds)}>
                  <Move className="h-3 w-3" />
                  Remove {contextMenu.documentIds.length > 1 ? `(${contextMenu.documentIds.length})` : ''}
                </button>
              </>
            )}
            {(onDeleteDocument || onDeleteDocuments) && (
              <button className="w-full text-left px-3 py-1 hover:bg-muted text-sm flex items-center gap-2 text-destructive" onClick={() => handleContextMenuAction('delete', contextMenu.documentIds)}>
                <Trash2 className="h-3 w-3" />
                Delete {contextMenu.documentIds.length > 1 ? `(${contextMenu.documentIds.length})` : ''}
              </button>
            )}
          </div>
        </>, document.body
      )}

      {/* Empty Area Context Menu */}
      {emptyAreaContextMenu && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setEmptyAreaContextMenu(null)} />
          <div className="fixed z-50 bg-background border rounded-lg shadow-lg py-1 min-w-[120px]" style={{ left: emptyAreaContextMenu.x, top: emptyAreaContextMenu.y }}>
            {pastedDocumentIds && pastedDocumentIds.length > 0 && (
              <button className="w-full text-left px-3 py-1 hover:bg-muted text-sm flex items-center gap-2" onClick={handleEmptyAreaPaste}>
                <Clipboard className="h-3 w-3" />
                Paste Documents ({pastedDocumentIds.length})
              </button>
            )}
            {onImportDocuments && (
              <button className="w-full text-left px-3 py-1 hover:bg-muted text-sm flex items-center gap-2" onClick={() => { setEmptyAreaContextMenu(null); setShowImportModal(true) }}>
                <Upload className="h-3 w-3" />
                Import Documents
              </button>
            )}
          </div>
        </>, document.body
      )}

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        documents={documents}
        selectedDocuments={selectedDocuments}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
    </div>
  )
}

export default DocumentList
