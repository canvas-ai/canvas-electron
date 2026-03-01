import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { TreeNode, ContextMode, Context, Workspace } from './types';
import {
  insertTreePath,
  removeTreePath,
  moveTreePath,
  copyTreePath,
  renameLayer,
} from './api';

// ── Types ────────────────────────────────────────────────

type TreeBase = { contextId?: string; workspaceName?: string };
type ClipboardEntry = { mode: 'copy' | 'cut'; path: string };

// ── SVG icons (inline, no deps) ──────────────────────────

const Icon = ({ d, className = '' }: { d: string; className?: string }) => (
  <svg className={`h-4 w-4 shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ChevronDown = () => <Icon d="m6 9 6 6 6-6" />;
const ChevronRight = () => <Icon d="m9 18 6-6-6-6" />;
const PlusIcon = () => <Icon d="M12 5v14M5 12h14" />;
const EditIcon = () => <Icon d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />;
const CopyIcon = () => <Icon d="M9 2H4a2 2 0 0 0-2 2v5M15 2h5a2 2 0 0 1 2 2v5M15 22h5a2 2 0 0 0 2-2v-5M9 22H4a2 2 0 0 1-2-2v-5" />;
const ScissorsIcon = () => <Icon d="M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12l12 12" className="h-4 w-4" />;
const ClipboardIcon = () => <Icon d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />;
const TrashIcon = () => <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />;

const FolderOpen = () => (
  <svg className="mr-2 h-3.5 w-3.5 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
  </svg>
);
const FolderClosed = () => (
  <svg className="mr-2 h-3.5 w-3.5 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </svg>
);

// ── Context menu ─────────────────────────────────────────

const menuItemClass = 'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground';

function TreeContextMenu({
  x,
  y,
  path,
  clipboard,
  onAction,
  onClose,
}: {
  x: number;
  y: number;
  path: string;
  clipboard: ClipboardEntry | null;
  onAction: (action: string, path: string) => void;
  onClose: () => void;
}) {
  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 min-w-[10rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        style={{ left: x, top: y }}
      >
        <div className={menuItemClass} onClick={() => onAction('insert', path)}>
          <PlusIcon /> New Folder
        </div>
        {path !== '/' && (
          <div className={menuItemClass} onClick={() => onAction('rename', path)}>
            <EditIcon /> Rename
          </div>
        )}
        <div className="my-1 h-px bg-border" />
        <div className={menuItemClass} onClick={() => onAction('copy', path)}>
          <CopyIcon /> Copy
        </div>
        <div className={menuItemClass} onClick={() => onAction('cut', path)}>
          <ScissorsIcon /> Cut
        </div>
        {clipboard && (
          <div className={menuItemClass} onClick={() => onAction('paste', path)}>
            <ClipboardIcon /> Paste ({clipboard.mode})
          </div>
        )}
        <div className="my-1 h-px bg-border" />
        <div className={menuItemClass} onClick={() => onAction('remove', path)}>
          <TrashIcon /> Remove
        </div>
        <div className={menuItemClass} onClick={() => onAction('remove-recursive', path)}>
          <TrashIcon /> Remove (Recursive)
        </div>
      </div>
    </>,
    document.body,
  );
}

// ── Tree node row ────────────────────────────────────────

function TreeNodeRow({
  node,
  level,
  parentPath,
  selectedPath,
  expandedPaths,
  dragOverPath,
  onSelect,
  onToggle,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  node: TreeNode;
  level: number;
  parentPath: string;
  selectedPath: string;
  expandedPaths: Set<string>;
  dragOverPath: string | null;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string) => void;
  onDragStart: (path: string, e: React.DragEvent) => void;
  onDragOver: (path: string, e: React.DragEvent) => void;
  onDrop: (path: string, e: React.DragEvent) => void;
}) {
  const currentPath = parentPath === '/' ? `/${node.name}` : `${parentPath}/${node.name}`;
  const hasChildren = node.children?.length > 0;
  const isExpanded = expandedPaths.has(currentPath);
  const isSelected = selectedPath === currentPath;
  const isDragOver = dragOverPath === currentPath;

  return (
    <>
      <div
        className={`group flex cursor-pointer items-center rounded-sm px-2 py-1 text-sm transition-colors ${
          isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
        } ${isDragOver ? 'ring-2 ring-blue-400' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(currentPath)}
        onContextMenu={(e) => onContextMenu(e, currentPath)}
        draggable
        onDragStart={(e) => onDragStart(currentPath, e)}
        onDragOver={(e) => onDragOver(currentPath, e)}
        onDrop={(e) => onDrop(currentPath, e)}
      >
        <button
          className="mr-1 flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground"
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(currentPath); }}
        >
          {hasChildren && (isExpanded ? <ChevronDown /> : <ChevronRight />)}
        </button>

        {hasChildren && isExpanded ? <FolderOpen /> : <FolderClosed />}

        {node.color && node.color !== '#fff' && node.color !== '#ffffff' && (
          <span className="mr-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: node.color }} />
        )}

        <span className="min-w-0 truncate">{node.label || node.name}</span>

        <button
          className="ml-auto rounded-sm p-0.5 opacity-0 hover:bg-muted group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onContextMenu(e, currentPath); }}
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
        </button>
      </div>

      {hasChildren && isExpanded && node.children.map((child) => (
        <TreeNodeRow
          key={child.id || child.name}
          node={child}
          level={level + 1}
          parentPath={currentPath}
          selectedPath={selectedPath}
          expandedPaths={expandedPaths}
          dragOverPath={dragOverPath}
          onSelect={onSelect}
          onToggle={onToggle}
          onContextMenu={onContextMenu}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
        />
      ))}
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────

function expandPathAncestors(path: string): string[] {
  const parts = path.split('/').filter(Boolean);
  return parts.map((_, i) => '/' + parts.slice(0, i + 1).join('/'));
}

function pathToContextUrl(workspaceName: string, path: string): string {
  return `${workspaceName}://${path.replace(/^\//, '')}`;
}

function findNode(root: TreeNode, path: string): TreeNode | null {
  const parts = path.split('/').filter(Boolean);
  let node = root;
  for (const part of parts) {
    const next = node.children?.find((c) => c.name === part);
    if (!next) return null;
    node = next;
  }
  return node;
}

// ── Main component ──────────────────────────────────────

type Props = {
  workspace: Workspace;
  context: Context | null;
  mode: ContextMode;
  tree: TreeNode | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onPathSelect: (path: string) => void;
  onRefresh: () => void;
};

export function MenuTreeView({ workspace, context, mode, tree, loading, error, onBack, onPathSelect, onRefresh }: Props) {
  const [selectedPath, setSelectedPath] = useState('/');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'context' | 'directory'>('context');
  const [clipboard, setClipboard] = useState<ClipboardEntry | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [draggedPath, setDraggedPath] = useState<string | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const treeBase: TreeBase = mode === 'bound' && context
    ? { contextId: context.id }
    : { workspaceName: workspace.name };

  // Auto-expand to current context URL
  useEffect(() => {
    if (!tree || !context?.url) return;
    const match = context.url.match(/^[^:]+:\/\/(.*)$/);
    const treePath = match ? `/${match[1]}` : '/';
    setSelectedPath(treePath || '/');
    setExpandedPaths(new Set(expandPathAncestors(treePath)));
  }, [tree, context?.url]);

  // ── Node interactions ──────────────────────────────────

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }, []);

  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path);
    if (mode === 'bound' && context) {
      onPathSelect(pathToContextUrl(workspace.name, path));
    }
  }, [mode, context, workspace.name, onPathSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, path });
  }, []);

  // ── Drag & drop ────────────────────────────────────────

  const handleDragStart = useCallback((path: string, e: React.DragEvent) => {
    setDraggedPath(path);
    e.dataTransfer.setData('text/plain', path);
    e.dataTransfer.effectAllowed = 'copyMove';
  }, []);

  const handleDragOver = useCallback((path: string, e: React.DragEvent) => {
    if (!draggedPath || path === draggedPath) return;
    if (path.startsWith(draggedPath + '/')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
    setDragOverPath(path);
  }, [draggedPath]);

  const handleDrop = useCallback(async (targetPath: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPath(null);
    if (!draggedPath || draggedPath === targetPath) return;
    setDraggedPath(null);

    try {
      if (e.ctrlKey) {
        await copyTreePath(treeBase, draggedPath, targetPath, false);
      } else {
        await moveTreePath(treeBase, draggedPath, targetPath, e.shiftKey);
      }
      onRefresh();
    } catch (err) {
      alert(`Drop failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [draggedPath, treeBase, onRefresh]);

  // ── Context menu actions ───────────────────────────────

  const handleAction = useCallback(async (action: string, path: string) => {
    setCtxMenu(null);
    try {
      switch (action) {
        case 'insert': {
          const name = prompt('Enter new folder name:');
          if (!name) return;
          const fullPath = path === '/' ? `/${name}` : `${path}/${name}`;
          await insertTreePath(treeBase, fullPath);
          onRefresh();
          break;
        }
        case 'rename': {
          if (!tree) return;
          const node = findNode(tree, path);
          if (!node) return;
          const newName = prompt('Enter new name:', node.name);
          if (!newName || newName === node.name) return;
          await renameLayer(workspace.name, node.id, newName);
          onRefresh();
          break;
        }
        case 'copy':
          setClipboard({ mode: 'copy', path });
          break;
        case 'cut':
          setClipboard({ mode: 'cut', path });
          break;
        case 'paste': {
          if (!clipboard) return;
          if (clipboard.mode === 'cut') {
            await moveTreePath(treeBase, clipboard.path, path, false);
            setClipboard(null);
          } else {
            await copyTreePath(treeBase, clipboard.path, path, false);
          }
          onRefresh();
          break;
        }
        case 'remove':
          if (!confirm(`Remove "${path}"?`)) return;
          await removeTreePath(treeBase, path, false);
          onRefresh();
          break;
        case 'remove-recursive':
          if (!confirm(`Recursively remove "${path}" and all children?`)) return;
          await removeTreePath(treeBase, path, true);
          onRefresh();
          break;
      }
    } catch (err) {
      alert(`${action} failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [clipboard, tree, treeBase, workspace.name, onRefresh]);

  // ── Keyboard shortcuts ─────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!rootRef.current?.contains(document.activeElement) && document.activeElement !== rootRef.current) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'c') { e.preventDefault(); setClipboard({ mode: 'copy', path: selectedPath }); }
      else if (key === 'x') { e.preventDefault(); setClipboard({ mode: 'cut', path: selectedPath }); }
      else if (key === 'v') { e.preventDefault(); void handleAction('paste', selectedPath); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedPath, handleAction]);

  // ── Render ─────────────────────────────────────────────

  const modeLabel = mode === 'bound' ? `Context: ${context?.name || context?.id || '?'}` : 'Explorer';
  const modeDotColor = mode === 'bound' ? '#22c55e' : '#3b82f6';

  return (
    <div className="flex h-full flex-col" ref={rootRef} tabIndex={0}>
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="rounded-md p-1 hover:bg-accent" title="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: modeDotColor }} />
              <span className="truncate text-xs font-medium text-muted-foreground">{modeLabel}</span>
            </div>
            <div className="truncate text-sm font-semibold">{workspace.label || workspace.name}</div>
          </div>
        </div>

        <div className="mt-3 flex rounded-md border border-border bg-muted p-0.5">
          <button
            onClick={() => setActiveTab('context')}
            className={`flex-1 rounded-sm px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === 'context' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Context Tree
          </button>
          <button
            disabled
            className="flex-1 cursor-not-allowed rounded-sm px-3 py-1 text-xs font-medium text-muted-foreground/50"
            title="Not available yet"
          >
            Directory Tree
          </button>
        </div>

        <div className="mt-2 truncate rounded-sm bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
          {mode === 'bound' ? pathToContextUrl(workspace.name, selectedPath) : selectedPath}
        </div>
      </div>

      {/* Tree */}
      <div
        className="flex-1 overflow-y-auto py-1"
        onDragLeave={() => setDragOverPath(null)}
      >
        {loading && <div className="p-4 text-center text-sm text-muted-foreground">Loading tree...</div>}
        {error && <div className="mx-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        {!loading && !error && tree && (
          <div className="space-y-0.5 px-1">
            {/* Root */}
            <div
              className={`group flex cursor-pointer items-center rounded-sm px-2 py-1 text-sm transition-colors ${
                selectedPath === '/' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              } ${dragOverPath === '/' ? 'ring-2 ring-blue-400' : ''}`}
              style={{ paddingLeft: '8px' }}
              onClick={() => handleSelect('/')}
              onContextMenu={(e) => handleContextMenu(e, '/')}
              onDragOver={(e) => handleDragOver('/', e)}
              onDrop={(e) => handleDrop('/', e)}
            >
              <span className="mr-1 flex h-4 w-4 items-center justify-center" />
              <FolderOpen />
              <span className="font-medium">/</span>
              <button
                className="ml-auto rounded-sm p-0.5 opacity-0 hover:bg-muted group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); handleContextMenu(e, '/'); }}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              </button>
            </div>

            {tree.children?.map((child) => (
              <TreeNodeRow
                key={child.id || child.name}
                node={child}
                level={1}
                parentPath="/"
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                dragOverPath={dragOverPath}
                onSelect={handleSelect}
                onToggle={handleToggle}
                onContextMenu={handleContextMenu}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <TreeContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          path={ctxMenu.path}
          clipboard={clipboard}
          onAction={handleAction}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}
