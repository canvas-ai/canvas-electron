import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-container';
import { Save, Share, X, Plus, Settings, Info, Sidebar } from 'lucide-react';
import { getContext, getSharedContext, updateContextUrl, grantContextAccess, revokeContextAccess, getContextTree, getContextDocuments, getSharedContextDocuments, removeDocumentsFromContext, deleteDocumentsFromContext } from '@/services/context';
import socketService from '@/lib/socket';
import { getCurrentUserFromToken } from '@/services/auth';
import { TreeView } from '@/components/common/tree-view';
import { useTreeOperations } from '@/hooks/useTreeOperations';
import { DocumentDetailModal } from '@/components/context/document-detail-modal';
import { DocumentList } from '@/components/workspace/document-list';
import { TreeNode, Document as WorkspaceDocument } from '@/types/workspace';
import { renameWorkspaceLayer } from '@/services/workspace';

// Simple debounce utility function
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Interface based on the GET /contexts and GET /contexts/:id API payloads
interface ContextData {
  id: string;
  userId: string;
  url: string;
  baseUrl: string | null;
  path: string | null;
  pathArray: string[];
  workspaceId: string;
  acl: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  locked: boolean;
  serverContextArray: string[];
  clientContextArray: string[];
  contextBitmapArray: string[];
  featureBitmapArray: string[];
  filterArray: string[];
  pendingUrl: string | null;
  description?: string | null;
}

// Document interface - matches the actual API response structure for context documents
interface ContextDocument {
  id: number;
  schema: string;
  schemaVersion: string;
  data: any;
  metadata: {
    contentType: string;
    contentEncoding: string;
    dataPaths: string[];
  };
  indexOptions: {
    checksumAlgorithms: string[];
    primaryChecksumAlgorithm: string;
    checksumFields: string[];
    ftsSearchFields: string[];
    vectorEmbeddingFields: string[];
    embeddingOptions: {
      embeddingModel: string;
      embeddingDimensions: number;
      embeddingProvider: string;
      embeddingProviderOptions: Record<string, any>;
      chunking: {
        type: string;
        chunkSize: number;
        chunkOverlap: number;
      };
    };
  };
  createdAt: string;
  updatedAt: string;
  checksumArray: string[];
  embeddingsArray: any[];
  parentId: string | null;
  versions: any[];
  versionNumber: number;
  latestVersion: number;
}

export default function ContextDetailPage() {
  const { contextId, userId } = useParams<{ contextId: string; userId?: string }>();
  const [context, setContext] = useState<ContextData | null>(null);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [workspaceDocuments, setWorkspaceDocuments] = useState<WorkspaceDocument[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('/');
  const [editableUrl, setEditableUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [documentsTotalCount, setDocumentsTotalCount] = useState(0);
  const { showToast } = useToast();

  // Sidebar states
  const [isTreeViewOpen, setIsTreeViewOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);

  // Toolbox state
  const [activeFilters, setActiveFilters] = useState({
    tabs: false,
    notes: false,
    todo: false
  });
  const [customBitmaps, setCustomBitmaps] = useState<string[]>([]);
  const [newBitmapInput, setNewBitmapInput] = useState('');

  // Sharing state
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<string>('documentRead');
  const [isSharing, setIsSharing] = useState(false);

  // Document detail modal state
  const [selectedDocument, setSelectedDocument] = useState<ContextDocument | null>(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);

  // Get current user to check if they're the owner
  const currentUser = getCurrentUserFromToken();
  const isOwner = currentUser && context && currentUser.id === context.userId;

  // Check if this is a shared context route
  const isSharedContext = Boolean(userId);

  // Close all right sidebars
  const closeAllRightSidebars = () => {
    setIsDetailsOpen(false);
    setIsShareOpen(false);
    setIsToolboxOpen(false);
  };

  // Toggle specific sidebar
  const toggleSidebar = (sidebarName: 'tree' | 'details' | 'share' | 'toolbox') => {
    switch (sidebarName) {
      case 'tree':
        // Tree view is on the left, just toggle it
        setIsTreeViewOpen(!isTreeViewOpen);
        break;
      case 'details':
        closeAllRightSidebars();
        setIsDetailsOpen(true);
        break;
      case 'share':
        closeAllRightSidebars();
        setIsShareOpen(true);
        break;
      case 'toolbox':
        closeAllRightSidebars();
        setIsToolboxOpen(true);
        break;
    }
  };

  // Fetch context tree
  const fetchContextTree = useCallback(async () => {
    if (!contextId) return;

    setIsLoadingTree(true);
    try {
      console.log(`Fetching context tree for contextId: ${contextId}`);
      const treeData = await getContextTree(contextId);
      console.log('Context tree fetched:', treeData);

      if (treeData) {
        setTree(treeData);
      } else {
        console.warn('No tree data received from API');
        setTree(null);
      }
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch context tree';
      console.error('Context tree fetch error:', err);
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      setTree(null);
    } finally {
      setIsLoadingTree(false);
    }
  }, [contextId, showToast]);

  const findTreeNodeByPath = useCallback((root: TreeNode, path: string): TreeNode | null => {
    if (!path || path === '/') return root
    const parts = path.split('/').filter(Boolean)
    let node: TreeNode = root
    for (const part of parts) {
      const next = node.children?.find((c) => c.name === part)
      if (!next) return null
      node = next
    }
    return node
  }, [])

  const handleRenamePath = useCallback(async (fromPath: string, newName: string): Promise<boolean> => {
    if (!context || !tree) return false
    if (fromPath === '/') {
      showToast({ title: 'Error', description: 'Cannot rename root layer', variant: 'destructive' })
      return false
    }

    try {
      const node = findTreeNodeByPath(tree, fromPath)
      if (!node) throw new Error(`Path not found: ${fromPath}`)

      await renameWorkspaceLayer(context.workspaceId, node.id, newName)
      await fetchContextTree()

      const parts = fromPath.split('/').filter(Boolean)
      parts[parts.length - 1] = newName
      const newPath = '/' + parts.join('/')

      if (selectedPath === fromPath) {
        setSelectedPath(newPath)
      } else if (selectedPath.startsWith(fromPath + '/')) {
        setSelectedPath(newPath + selectedPath.slice(fromPath.length))
      }

      showToast({ title: 'Success', description: `Layer renamed to "${newName}"` })
      return true
    } catch (err) {
      showToast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to rename layer',
        variant: 'destructive'
      })
      return false
    }
  }, [context, tree, findTreeNodeByPath, fetchContextTree, selectedPath, showToast])

  // Initialize tree operations hook for context tree management
  const treeOperations = useTreeOperations({
    contextId: contextId || '',
    onRefresh: fetchContextTree
  });

  // Convert ContextDocument to WorkspaceDocument for compatibility with DocumentList
  const convertToWorkspaceDocuments = (contextDocs: ContextDocument[]): WorkspaceDocument[] => {
    return contextDocs.map(doc => ({
      ...doc,
      parentId: doc.parentId ? parseInt(doc.parentId as string) : null
    }));
  };

  // Fetch documents with feature filters
  const fetchDocuments = useCallback(async () => {
    if (!contextId) return;

    setIsLoadingDocuments(true);
    try {
      const featureArray = [];

      // Add feature filters based on toolbox settings
      if (activeFilters.tabs) featureArray.push('data/abstraction/tab');
      if (activeFilters.notes) featureArray.push('data/abstraction/note');
      if (activeFilters.todo) featureArray.push('data/abstraction/todo');

      // Add custom bitmaps
      featureArray.push(...customBitmaps);

      // Use REST API to get documents with filters
      const documentsData = isSharedContext && userId
        ? await getSharedContextDocuments(userId, contextId, featureArray, [], {})
        : await getContextDocuments(contextId, featureArray, [], {});

      setWorkspaceDocuments(convertToWorkspaceDocuments(documentsData));
      setDocumentsTotalCount(documentsData.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch documents';
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      setWorkspaceDocuments([]);
      setDocumentsTotalCount(0);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [contextId, activeFilters, customBitmaps, userId, isSharedContext]);

  // Fetch context details
  const fetchContextDetails = useCallback(async () => {
    if (!contextId) return;
    setIsLoading(true);
    try {
      const fetchedContext = isSharedContext && userId
        ? await getSharedContext(userId, contextId)
        : await getContext(contextId);

      if (!fetchedContext) {
        throw new Error('No context data received from getContext service.');
      }

      if (typeof fetchedContext.id !== 'string' || typeof fetchedContext.url !== 'string') {
        throw new Error('Fetched context data is invalid, incomplete, or not of the expected type.');
      }

      // Log context data for debugging
      console.log('Fetched context data:', fetchedContext);
      console.log('Context workspace:', fetchedContext.workspace);
      console.log('Context URL:', fetchedContext.url);

      // Convert Context to ContextData format
      const contextData: ContextData = {
        id: fetchedContext.id,
        userId: fetchedContext.userId,
        url: fetchedContext.url,
        baseUrl: fetchedContext.baseUrl || null,
        path: fetchedContext.path || null,
        pathArray: fetchedContext.pathArray || [],
        workspaceId: fetchedContext.workspace,
        acl: (fetchedContext as any).acl || {},
        createdAt: fetchedContext.createdAt,
        updatedAt: fetchedContext.updatedAt,
        locked: fetchedContext.locked || false,
        serverContextArray: fetchedContext.serverContextArray || [],
        clientContextArray: fetchedContext.clientContextArray || [],
        contextBitmapArray: fetchedContext.contextBitmapArray || [],
        featureBitmapArray: fetchedContext.featureBitmapArray || [],
        filterArray: fetchedContext.filterArray || [],
        pendingUrl: fetchedContext.pendingUrl || null,
        description: fetchedContext.description || null
      };

      setContext(contextData);
      setEditableUrl(contextData.url);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to fetch context ${contextId}`;
      setError(message);
      setContext(null);
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
    }
    setIsLoading(false);
  }, [contextId, userId, isSharedContext]);

  // Initial data fetch
  useEffect(() => {
    fetchContextDetails();
  }, [fetchContextDetails]);

  // Fetch documents when context is available and filters change
  useEffect(() => {
    if (!context || !contextId) return;
    fetchDocuments();
  }, [context?.id, activeFilters, customBitmaps, contextId, userId, isSharedContext, fetchDocuments]);

  // Fetch tree when tree view opens
  useEffect(() => {
    if (isTreeViewOpen && !tree) {
      fetchContextTree();
    }
  }, [isTreeViewOpen, fetchContextTree, tree]);

  // WebSocket event handling - only for context updates
  useEffect(() => {
    if (!contextId) return;

    // Debug: Check socket connection status
    console.log(`🔍 DEBUG: WebSocket connection status:`, {
      isConnected: socketService.isConnected(),
      contextId: contextId
    });

    if (!socketService.isConnected()) {
      console.log('🔍 DEBUG: Socket not connected, attempting to reconnect...');
      socketService.reconnect();
      return;
    }

    console.log(`📡 Subscribing to context events for context ${contextId}`);
    socketService.emit('subscribe', { topic: 'context', id: contextId });

    // Add a debug listener to verify subscription worked
    socketService.on('subscription:confirmed', (data: any) => {
      console.log('🔍 DEBUG: Subscription confirmed:', data);
    });

    // Event deduplication - track recent events to prevent duplicates
    const recentEvents = new Map<string, number>();
    const EVENT_DEDUP_WINDOW = 1000; // 1 second window for deduplication

    // Debounced notification system to prevent spam
    const pendingNotifications = new Set<string>();
    const debouncedNotify = debounce((notification: { title: string; description: string; variant?: 'default' | 'destructive' }) => {
      const key = `${notification.title}:${notification.description}`;
      if (!pendingNotifications.has(key)) {
        pendingNotifications.add(key);
        showToast(notification);
        // Clear from pending after showing
        setTimeout(() => pendingNotifications.delete(key), 2000);
      }
    }, 500);

    // Helper function to check if event should be processed (deduplication)
    const shouldProcessEvent = (eventType: string, data: any): boolean => {
      const now = Date.now();

      // Create unique key for this event based on type and relevant identifiers
      let eventKey = `${eventType}:${data.contextId || contextId}`;
      if (data.documentId) eventKey += `:doc:${data.documentId}`;
      if (data.documentIds?.length) eventKey += `:docs:${data.documentIds.sort().join(',')}`;
      if (data.operation) eventKey += `:op:${data.operation}`;

      // Check if we've seen this event recently
      const lastEventTime = recentEvents.get(eventKey);
      if (lastEventTime && (now - lastEventTime) < EVENT_DEDUP_WINDOW) {
        console.log(`🚫 Skipping duplicate event: ${eventKey} (${now - lastEventTime}ms ago)`);
        return false;
      }

      // Record this event
      recentEvents.set(eventKey, now);

      // Clean up old events (keep map size reasonable)
      if (recentEvents.size > 50) {
        const cutoff = now - EVENT_DEDUP_WINDOW * 2;
        for (const [key, time] of recentEvents.entries()) {
          if (time < cutoff) recentEvents.delete(key);
        }
      }

      return true;
    };

    // Context-specific events
    const handleContextUpdateReceived = (data: { context: Partial<ContextData> }) => {
      if (data.context && data.context.id === contextId) {
        if (!shouldProcessEvent('context:updated', data.context)) return;

        console.log('Context update event received:', data);
        setContext(prev => prev ? { ...prev, ...data.context } as ContextData : null);
        if (data.context.url) {
          setEditableUrl(data.context.url);
        }
        // Context updates can affect document filtering, so refresh documents
        fetchDocuments();
      }
    };

    const handleContextUrlChanged = (data: { id: string; url: string }) => {
      if (data.id === contextId) {
        if (!shouldProcessEvent('context:url:changed', data)) return;

        console.log('Context URL changed event received:', data);
        setContext(prev => prev ? { ...prev, url: data.url } : null);
        setEditableUrl(data.url);
        // URL change affects document filtering, so refresh documents
        fetchDocuments();
      }
    };

    const handleContextLockStatusChanged = (data: { id: string; locked: boolean }) => {
      if (data.id === contextId) {
        if (!shouldProcessEvent('context:lock:changed', data)) return;

        console.log('Context lock status changed event received:', data);
        setContext(prev => prev ? { ...prev, locked: data.locked } : null);
      }
    };

    const handleContextDeleted = (data: { id: string } | { contextId: string }) => {
      const deletedId = ('id' in data) ? data.id : data.contextId;
      if (deletedId === contextId) {
        if (!shouldProcessEvent('context:deleted', data)) return;

        console.log('Context deleted event received:', data);
        setContext(null);
        setError('Context has been deleted.');
        showToast({
          title: 'Context Deleted',
          description: 'This context has been deleted.',
          variant: 'destructive'
        });
      }
    };

    const handleContextAclUpdated = (data: { id: string; acl: Record<string, any>; sharedWithUserId?: string; accessLevel?: string }) => {
      if (data.id === contextId) {
        if (!shouldProcessEvent('context:acl:updated', data)) return;

        console.log('Context ACL updated event received:', data);
        setContext(prev => prev ? { ...prev, acl: data.acl } : null);
        if (data.sharedWithUserId && data.accessLevel) {
          debouncedNotify({
            title: 'Access Granted',
            description: `${data.sharedWithUserId} was granted ${data.accessLevel} access to this context.`
          });
        }
      }
    };

    const handleContextAclRevoked = (data: { id: string; acl: Record<string, any>; revokedFromUserId?: string }) => {
      if (data.id === contextId) {
        if (!shouldProcessEvent('context:acl:revoked', data)) return;

        console.log('Context ACL revoked event received:', data);
        setContext(prev => prev ? { ...prev, acl: data.acl } : null);
        if (data.revokedFromUserId) {
          debouncedNotify({
            title: 'Access Revoked',
            description: `Access was revoked from ${data.revokedFromUserId} for this context.`
          });
        }
      }
    };

    // Register context events (support both dot & colon notations)
    const contextEventMap = [
      ['context.updated', 'context:updated', handleContextUpdateReceived],
      ['context.url.set', 'context:url:set', handleContextUrlChanged],
      ['context.locked', 'context:locked', handleContextLockStatusChanged],
      ['context.unlocked', 'context:unlocked', handleContextLockStatusChanged],
      ['context.deleted', 'context:deleted', handleContextDeleted],
      ['context.acl.updated', 'context:acl:updated', handleContextAclUpdated],
      ['context.acl.revoked', 'context:acl:revoked', handleContextAclRevoked]
    ] as const;

    contextEventMap.forEach(([dotEvent, colonEvent, handler]) => {
      socketService.on(dotEvent as string, handler as any);
      socketService.on(colonEvent as string, handler as any);
    });

    // Cleanup function
    return () => {
      console.log(`Unsubscribing from context events for context ${contextId}`);
      socketService.emit('unsubscribe', { topic: 'context', id: contextId });

      // Clean up context event listeners
      contextEventMap.forEach(([dotEvent, colonEvent, handler]) => {
        socketService.off(dotEvent as string, handler as any);
        socketService.off(colonEvent as string, handler as any);
      });
    };
  }, [contextId, fetchDocuments, showToast]);

  // Handle URL change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableUrl(e.target.value);
  };

  // Handle document removal from context
  const handleRemoveDocument = async (documentId: number) => {
    if (!context) return;

    try {
      await removeDocumentsFromContext(context.id, [documentId]);

      // Update local state instead of refetching
      setWorkspaceDocuments(prev => prev.filter(doc => doc.id !== documentId));
      setDocumentsTotalCount(prev => Math.max(0, prev - 1));

      showToast({
        title: 'Success',
        description: 'Document removed from context successfully.'
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove document';
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
    }
  };

  // Handle document deletion from database
  const handleDeleteDocument = async (documentId: number) => {
    if (!context) return;

    try {
      await deleteDocumentsFromContext(context.id, [documentId]);

      // Update local state instead of refetching
      setWorkspaceDocuments(prev => prev.filter(doc => doc.id !== documentId));
      setDocumentsTotalCount(prev => Math.max(0, prev - 1));

      showToast({
        title: 'Success',
        description: 'Document deleted from database successfully.'
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete document';
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
    }
  };

  // Handle set context URL (manual button click)
  const handleSetContextUrl = async () => {
    if (!context || editableUrl === context.url) return;

    setIsSaving(true);
    try {
      const response = await updateContextUrl(context.id, editableUrl);
      let updatedContextData: ContextData | null = null;

      if ((response as any)?.payload?.context?.id && typeof (response as any)?.payload?.context?.url === 'string') {
        updatedContextData = (response as any).payload.context as ContextData;
      } else if ((response as any)?.payload?.id && typeof (response as any)?.payload?.url === 'string') {
        updatedContextData = (response as any).payload as ContextData;
      } else if ((response as any)?.id && typeof (response as any)?.url === 'string') {
        updatedContextData = response as unknown as ContextData;
      } else if (response && typeof (response as any).url === 'string') {
        const newUpdatedAt = new Date().toISOString();
        updatedContextData = {
          ...(context as unknown as ContextData),
          url: (response as any).url,
          updatedAt: newUpdatedAt
        } as ContextData;
      } else {
        throw new Error('Unexpected response format from server when updating URL.');
      }

      if (updatedContextData) {
        setContext(updatedContextData);
        setEditableUrl(updatedContextData.url);
        // Only refetch documents if URL actually changed since this affects filtering
        fetchDocuments();
        showToast({
          title: 'Context Updated',
          description: `Context URL set to: ${updatedContextData.url}`
        });
      } else {
        throw new Error('Failed to process update response or response was empty.');
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set context URL';
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      if (context) {
        setEditableUrl(context.url);
      }
    }
    setIsSaving(false);
  };

  // Update context URL from tree path selection
  const handlePathSelect = (path: string) => {
    setSelectedPath(path);
    if (context && context.url) {
      // Extract workspace part from current URL and combine with new path
      let newUrl;
      if (context.url.includes('://')) {
        // Current URL has workspace format: workspaceName://currentPath
        const workspacePart = context.url.split('://')[0];
        const pathPart = path.startsWith('/') ? path.slice(1) : path;
        newUrl = `${workspacePart}://${pathPart}`;
      } else {
        // Current URL is just a path, keep it as a path
        newUrl = path;
      }

      console.log('Selected path:', path);
      console.log('Current URL:', context.url);
      console.log('New URL:', newUrl);

      setEditableUrl(newUrl);

      // Automatically set the context URL and fetch documents
      if (newUrl !== context.url) {
        handleSetContextUrl();
      }
    }
  };

  // Handle toolbox filter changes
  const handleFilterToggle = (filter: keyof typeof activeFilters) => {
    setActiveFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }));
  };

  // Handle custom bitmap addition
  const handleAddCustomBitmap = () => {
    if (newBitmapInput.trim() && !customBitmaps.includes(newBitmapInput.trim())) {
      setCustomBitmaps(prev => [...prev, newBitmapInput.trim()]);
      setNewBitmapInput('');
    }
  };

  // Handle custom bitmap removal
  const handleRemoveCustomBitmap = (bitmap: string) => {
    setCustomBitmaps(prev => prev.filter(b => b !== bitmap));
  };

  // Handle grant access
  const handleGrantAccess = async () => {
    if (!context || !shareEmail.trim()) return;

    setIsSharing(true);
    try {
      await grantContextAccess(context.userId, context.id, shareEmail.trim(), sharePermission);

      setContext(prev => prev ? {
        ...prev,
        acl: {
          ...prev.acl,
          [shareEmail.trim()]: sharePermission
        }
      } : null);

      setShareEmail('');

      showToast({
        title: 'Success',
        description: `Access granted to ${shareEmail.trim()} with ${sharePermission} permission.`
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to grant access';
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
    }
    setIsSharing(false);
  };

  // Handle revoke access
  const handleRevokeAccess = async (userEmail: string) => {
    if (!context) return;

    try {
      await revokeContextAccess(context.userId, context.id, userEmail);

      setContext(prev => {
        if (!prev) return null;
        const newAcl = { ...prev.acl };
        delete newAcl[userEmail];
        return {
          ...prev,
          acl: newAcl
        };
      });

      showToast({
        title: 'Success',
        description: `Access revoked from ${userEmail}.`
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke access';
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return <div className="text-center">Loading context details...</div>;
  }

  if (error && !context) {
    return <div className="text-center text-destructive">Error: {error}</div>;
  }

  if (!context) {
    return <div className="text-center">Context not found or has been deleted.</div>;
  }

  const anyRightSidebarOpen = isDetailsOpen || isShareOpen || isToolboxOpen;

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Tree View */}
      {isTreeViewOpen && (
        <div className="w-80 bg-background border-r shadow-lg overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Context Tree</h3>
            <Button
              onClick={() => setIsTreeViewOpen(false)}
              variant="ghost"
              size="sm"
              className="p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4">
            {isLoadingTree ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-xs text-muted-foreground">Loading tree...</p>
                </div>
              </div>
            ) : tree ? (
              <TreeView
                tree={tree}
                selectedPath={selectedPath}
                onPathSelect={handlePathSelect}
                readOnly={isSharedContext}
                title="Context Tree"
                subtitle={isSharedContext ? 'Read-only view (shared context)' : 'Right-click for context menu, drag to move/copy (Ctrl=copy, Shift=recursive)'}
                onInsertPath={!isSharedContext ? treeOperations.insertPath : undefined}
                onRemovePath={!isSharedContext ? treeOperations.removePath : undefined}
                onRenamePath={!isSharedContext ? handleRenamePath : undefined}
                onMovePath={!isSharedContext ? treeOperations.movePath : undefined}
                onCopyPath={!isSharedContext ? treeOperations.copyPath : undefined}
                onMergeUp={!isSharedContext ? treeOperations.mergeUp : undefined}
                onMergeDown={!isSharedContext ? treeOperations.mergeDown : undefined}
              />
            ) : (
              <div className="text-center text-muted-foreground text-sm">
                Failed to load context tree
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${anyRightSidebarOpen ? 'mr-96' : ''}`}>
        {/* Browser-like Toolbar */}
        <div className="flex items-center gap-2 p-2 border rounded-md shadow-sm bg-background">
          {/* Tree View Toggle */}
          <Button
            onClick={() => toggleSidebar('tree')}
            variant={isTreeViewOpen ? "default" : "outline"}
            size="sm"
            className="p-2"
            title="Toggle tree view"
          >
            <Sidebar className="h-4 w-4" />
          </Button>

          {/* Context URL Input */}
          <div className="flex items-center flex-grow">
            <span className="text-sm font-medium text-muted-foreground mr-2">
              ({context.id})
            </span>
            <Input
              id="contextUrlInput"
              type="text"
              value={editableUrl}
              onChange={handleUrlChange}
              className="font-mono h-10 flex-grow border-0 focus-visible:ring-0 focus-visible:ring-offset-0 !shadow-none"
              placeholder="workspaceID:/path/to/context"
              disabled={isSaving || context.locked || isSharedContext}
            />
          </div>

          {/* Set Context Button */}
          <Button
            onClick={handleSetContextUrl}
            disabled={isSaving || !context || editableUrl === context.url || context.locked || isSharedContext}
            size="sm"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Setting...' : 'Set Context'}
          </Button>

          {/* Context Details Button */}
          <Button
            onClick={() => toggleSidebar('details')}
            variant={isDetailsOpen ? "default" : "outline"}
            size="sm"
            className="p-2"
            title="Show context details"
          >
            <Info className="h-4 w-4" />
          </Button>

          {/* Share Button */}
          {isOwner && (
            <Button
              onClick={() => toggleSidebar('share')}
              variant={isShareOpen ? "default" : "outline"}
              size="sm"
              className="p-2"
              title="Share context"
            >
              <Share className="h-4 w-4" />
            </Button>
          )}

          {/* Toolbox Button */}
          <Button
            onClick={() => toggleSidebar('toolbox')}
            variant={isToolboxOpen ? "default" : "outline"}
            size="sm"
            className="p-2"
            title="Open toolbox"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Page Content */}
        <div className="space-y-6 p-6">
          {/* Page Header */}
          <div className="border-b pb-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Context: {isSharedContext ? `${context.userId}/${context.id}` : context.id}
            </h1>
            <p className="text-muted-foreground mt-2">{context.description || 'No description available'}</p>
          </div>

          {/* Documents Section using DocumentList component */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Documents</h2>
              <div className="text-sm text-muted-foreground">
                {Object.values(activeFilters).some(Boolean) || customBitmaps.length > 0 ? ' (filtered)' : ''}
              </div>
            </div>

            {/* Use the DocumentList component for consistency with action handlers */}
            <DocumentList
              documents={workspaceDocuments}
              isLoading={isLoadingDocuments}
              contextPath={selectedPath}
              totalCount={documentsTotalCount}
              onRemoveDocument={handleRemoveDocument}
              onDeleteDocument={handleDeleteDocument}
            />
          </div>
        </div>
      </div>

      {/* Right Sidebar - same as before but with updated content */}
      {anyRightSidebarOpen && (
        <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg overflow-y-auto z-50">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">
              {isDetailsOpen && 'Context Details'}
              {isShareOpen && 'Share Context'}
              {isToolboxOpen && 'Toolbox'}
            </h3>
            <Button
              onClick={closeAllRightSidebars}
              variant="ghost"
              size="sm"
              className="p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Sidebar Content */}
          <div className="p-4">

            {/* Context Details Content */}
            {isDetailsOpen && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">ID:</span>
                      <span className="ml-2 font-mono">{context.id}</span>
                    </div>
                    <div>
                      <span className="font-medium">User ID:</span>
                      <span className="ml-2 font-mono">{context.userId}</span>
                    </div>
                    <div>
                      <span className="font-medium">Workspace ID:</span>
                      <span className="ml-2 font-mono">{context.workspaceId}</span>
                    </div>
                    <div>
                      <span className="font-medium">Current URL:</span>
                      <span className="ml-2 font-mono text-xs break-all">{context.url}</span>
                    </div>
                    <div>
                      <span className="font-medium">Locked:</span>
                      <span className="ml-2">{context.locked ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>
                      <span className="ml-2">{new Date(context.createdAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span>
                      <span className="ml-2">{new Date(context.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Share Context Content */}
            {isShareOpen && isOwner && (
              <div className="space-y-4">
                {/* Share Form */}
                <div>
                  <h4 className="font-medium mb-3">Share with a user</h4>
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="shareEmail" className="block text-sm font-medium mb-1">
                        Email Address
                      </label>
                      <Input
                        id="shareEmail"
                        type="email"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        placeholder="user@example.com"
                        disabled={isSharing}
                      />
                    </div>
                    <div>
                      <label htmlFor="sharePermission" className="block text-sm font-medium mb-1">
                        Permission Level
                      </label>
                      <select
                        id="sharePermission"
                        value={sharePermission}
                        onChange={(e) => setSharePermission(e.target.value)}
                        disabled={isSharing}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="documentRead">Read Only</option>
                        <option value="documentWrite">Read + Append</option>
                        <option value="documentReadWrite">Full Access</option>
                      </select>
                    </div>
                    <Button
                      onClick={handleGrantAccess}
                      disabled={!shareEmail.trim() || isSharing}
                      size="sm"
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {isSharing ? 'Granting...' : 'Grant Access'}
                    </Button>
                  </div>
                </div>

                {/* Current Shares */}
                <div>
                  <h4 className="font-medium mb-3">Current Access</h4>
                  <div className="space-y-2">
                    {/* Owner */}
                    <div className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium">O</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium">{context.userId}</div>
                          <div className="text-xs text-muted-foreground">Owner</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">Full Access</div>
                    </div>

                    {/* Shared Users */}
                    {Object.entries(context.acl || {}).map(([userEmail, permission]) => (
                      <div key={userEmail} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {userEmail.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium">{userEmail}</div>
                            <div className="text-xs text-muted-foreground">
                              {permission === 'documentRead' && 'Read Only'}
                              {permission === 'documentWrite' && 'Read + Append'}
                              {permission === 'documentReadWrite' && 'Full Access'}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleRevokeAccess(userEmail)}
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {(!context.acl || Object.keys(context.acl).length === 0) && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No users have been granted access to this context.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Toolbox Content */}
            {isToolboxOpen && (
              <div className="space-y-4">
                {/* Filter Toggles */}
                <div>
                  <h4 className="font-medium mb-3">Data Type Filters</h4>
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleFilterToggle('tabs')}
                      variant={activeFilters.tabs ? "default" : "outline"}
                      size="sm"
                      className="w-full justify-start"
                    >
                      Tabs (data/abstraction/tab)
                    </Button>
                    <Button
                      onClick={() => handleFilterToggle('notes')}
                      variant={activeFilters.notes ? "default" : "outline"}
                      size="sm"
                      className="w-full justify-start"
                    >
                      Notes (data/abstraction/note)
                    </Button>
                    <Button
                      onClick={() => handleFilterToggle('todo')}
                      variant={activeFilters.todo ? "default" : "outline"}
                      size="sm"
                      className="w-full justify-start"
                    >
                      Todo (data/abstraction/todo)
                    </Button>
                  </div>
                </div>

                {/* Custom Bitmap Filters */}
                <div>
                  <h4 className="font-medium mb-3">Custom Bitmap Filters</h4>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newBitmapInput}
                        onChange={(e) => setNewBitmapInput(e.target.value)}
                        placeholder="Enter bitmap name"
                        className="flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddCustomBitmap()}
                      />
                      <Button
                        onClick={handleAddCustomBitmap}
                        disabled={!newBitmapInput.trim()}
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {customBitmaps.map((bitmap) => (
                      <div key={bitmap} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm font-mono">{bitmap}</span>
                        <Button
                          onClick={() => handleRemoveCustomBitmap(bitmap)}
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {customBitmaps.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No custom bitmap filters added.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      <DocumentDetailModal
        document={selectedDocument}
        isOpen={isDocumentModalOpen}
        onClose={() => {
          setIsDocumentModalOpen(false);
          setSelectedDocument(null);
        }}
      />
    </div>
  );
}
