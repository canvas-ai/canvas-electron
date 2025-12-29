import { useEffect, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-container';
import { Save, Share, X, Plus, Settings, Info, Sidebar } from 'lucide-react';
import { ContextTokenManager } from '@/components/context/token-manager';
import { getContext, getSharedContext, updateContextUrl, grantContextAccess, revokeContextAccess, getContextTree, getContextDocuments, getSharedContextDocuments, removeDocumentsFromContext, deleteDocumentsFromContext, pasteDocumentsToContext, importDocumentsToContext } from '@/services/context';
import { renameWorkspaceLayer } from '@/services/workspace';
import socketService from '@/lib/socket';
import { getCurrentUserFromToken } from '@/services/auth';
import { TreeView } from '@/components/common/tree-view';
import { useTreeOperations } from '@/hooks/useTreeOperations';
import { DocumentDetailModal } from '@/components/context/document-detail-modal';
import { DocumentList } from '@/components/common/document-list';
import { TreeNode, Document as WorkspaceDocument } from '@/types/workspace';
import { parseUrlFilters, buildContextUrl, parseFeatureFilters, featureFiltersToArray, UrlFilters } from '@/utils/url-params';
import { adminUserService } from '@/services/admin';

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
  workspaceName: string;
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
  const location = useLocation();
  const navigate = useNavigate();
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

  // Map userId -> email for rendering ACL entries
  const [aclUserMap, setAclUserMap] = useState<Record<string, string>>({});

  // Sharing state
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<string>('documentRead');
  const [isSharing, setIsSharing] = useState(false);

  // Document detail modal state
  const [selectedDocument, setSelectedDocument] = useState<ContextDocument | null>(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);

  // Document copy/paste state
  const [copiedDocuments, setCopiedDocuments] = useState<number[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // URL-based filters
  const [urlFilters, setUrlFilters] = useState<UrlFilters>({ features: [], filters: [] });

  // Get current user to check if they're the owner
  const currentUser = getCurrentUserFromToken();
  const isOwner = currentUser && context && currentUser.id === context.userId;

  // Check if this is a shared context route
  const isSharedContext = Boolean(userId);

  // Initialize filters from URL and sync changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const parsedFilters = parseUrlFilters(searchParams);
    setUrlFilters(parsedFilters);

    // Parse features and update toolbox state
    const featureFilters = parseFeatureFilters(parsedFilters.features);
    setActiveFilters({
      tabs: featureFilters.tabs,
      notes: featureFilters.notes,
      todo: featureFilters.todo
    });
    setCustomBitmaps(featureFilters.customBitmaps);
  }, [location.search]);

  // Update URL when filters change
  const updateUrl = (newFilters?: UrlFilters) => {
    if (!contextId) return;

    const filters = newFilters || urlFilters;
    const newUrl = buildContextUrl(contextId, userId, filters);

    // Only navigate if URL is different
    if (newUrl !== location.pathname + location.search) {
      navigate(newUrl, { replace: true });
    }
  };

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

      const workspaceKey = context.workspaceName || context.workspaceId
      await renameWorkspaceLayer(workspaceKey, node.id, newName)

      // Refresh tree (keep TreeView mounted so expansion state survives)
      await fetchContextTree()

      // If selection is inside renamed subtree, update it to the new path
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

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Fetch documents with feature filters
  const fetchDocuments = useCallback(async () => {
    if (!contextId) return;

    setIsLoadingDocuments(true);
    try {
      // Combine activeFilters, customBitmaps, and URL features
      const featureArray = [...urlFilters.features];

      // Also include UI state for immediate feedback (before URL updates)
      if (activeFilters.tabs && !featureArray.includes('data/abstraction/tab')) {
        featureArray.push('data/abstraction/tab');
      }
      if (activeFilters.notes && !featureArray.includes('data/abstraction/note')) {
        featureArray.push('data/abstraction/note');
      }
      if (activeFilters.todo && !featureArray.includes('data/abstraction/todo')) {
        featureArray.push('data/abstraction/todo');
      }

      // Add custom bitmaps that aren't already in URL features
      customBitmaps.forEach(bitmap => {
        if (!featureArray.includes(bitmap)) {
          featureArray.push(bitmap);
        }
      });

      // Use REST API to get documents with filters and pagination
      const documentsData = isSharedContext && userId
        ? await getSharedContextDocuments(userId, contextId, featureArray, [], {
            limit: pageSize,
            page: currentPage
          })
        : await getContextDocuments(contextId, featureArray, [], {
            limit: pageSize,
            page: currentPage
          });

      setWorkspaceDocuments(convertToWorkspaceDocuments(documentsData));
      setDocumentsTotalCount(documentsData.totalCount || documentsData.count || documentsData.length);
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
  }, [contextId, activeFilters, customBitmaps, urlFilters, userId, isSharedContext, currentPage, pageSize]);

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
        workspaceId: fetchedContext.workspaceId || fetchedContext.workspace,
        workspaceName: fetchedContext.workspaceName || fetchedContext.workspace,
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

      // Check if it's a workspace activation error
      const isWorkspaceInactive = message.includes('not active') || message.includes('Database not initialized');

      showToast({
        title: 'Error',
        description: isWorkspaceInactive
          ? `${message}\n\nGo to Workspaces and start the workspace before accessing this context.`
          : message,
        variant: 'destructive'
      });
    }
    setIsLoading(false);
  }, [contextId, userId, isSharedContext]);
  // Resolve user IDs in ACL to emails for display (best effort)
  useEffect(() => {
    const resolveAclEmails = async () => {
      if (!context || !context.acl) return;

      // Extract user IDs from both old and new ACL formats
      const unresolvedIds: string[] = [];

      // New format: acl.users[email] (already has emails, no need to resolve)
      // Old format: acl[userId] = accessLevel (need to resolve userId to email)
      Object.entries(context.acl).forEach(([key, value]) => {
        // Skip the nested 'users' object from new format
        if (key === 'users') return;

        // Only try to resolve if it's not an email and not already resolved
        if (typeof key === 'string' && !key.includes('@') && !aclUserMap[key] && typeof value === 'string') {
          unresolvedIds.push(key);
        }
      });

      if (unresolvedIds.length === 0) return;

      const updates: Record<string, string> = {};
      await Promise.all(unresolvedIds.map(async (uid) => {
        try {
          const user = await adminUserService.getUser(uid);
          if (user?.email) updates[uid] = user.email;
        } catch (_) { /* ignore, non-admins may not resolve */ }
      }));

      if (Object.keys(updates).length > 0) {
        setAclUserMap((prev) => ({ ...prev, ...updates }));
      }
    };
    resolveAclEmails();
  }, [context?.acl]);


  // Initial data fetch
  useEffect(() => {
    fetchContextDetails();
  }, [fetchContextDetails]);

  // Fetch documents when context is available and filters change
  useEffect(() => {
    if (!context || !contextId) return;
    fetchDocuments();
  }, [context?.id, activeFilters, customBitmaps, contextId, userId, isSharedContext, fetchDocuments]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilters, customBitmaps, urlFilters]);

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
    socketService.emit('subscribe', { channel: `context:${contextId}` });

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
      socketService.emit('unsubscribe', { channel: `context:${contextId}` });

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

  // Handle document copy
  const handleCopyDocuments = (documentIds: number[]) => {
    setCopiedDocuments(documentIds);
    showToast({
      title: 'Success',
      description: `${documentIds.length} document(s) copied to clipboard`
    });
  };

  // Handle multiple document removal from context
  const handleRemoveDocuments = async (documentIds: number[]) => {
    if (!context) return;
    try {
      await removeDocumentsFromContext(context.id, documentIds);
      // Update local state
      setWorkspaceDocuments(prev => prev.filter(doc => !documentIds.includes(doc.id)));
      setDocumentsTotalCount(prev => Math.max(0, prev - documentIds.length));
      showToast({
        title: 'Success',
        description: `${documentIds.length} document(s) removed from context successfully.`
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove documents';
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
    }
  };

  // Handle multiple document deletion from context
  const handleDeleteDocuments = async (documentIds: number[]) => {
    if (!context) return;
    try {
      await deleteDocumentsFromContext(context.id, documentIds);
      // Update local state
      setWorkspaceDocuments(prev => prev.filter(doc => !documentIds.includes(doc.id)));
      setDocumentsTotalCount(prev => Math.max(0, prev - documentIds.length));
      showToast({
        title: 'Success',
        description: `${documentIds.length} document(s) deleted from database successfully.`
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete documents';
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
    }
  };

  // Handle document paste to path
  const handlePasteDocuments = async (path: string, documentIds: number[]): Promise<boolean> => {
    if (!context) return false;
    try {
      const success = await pasteDocumentsToContext(context.id, path, documentIds);
      if (success) {
        await fetchDocuments(); // Refresh documents
        setCopiedDocuments([]); // Clear copied documents
        showToast({
          title: 'Success',
          description: `${documentIds.length} document(s) pasted to "${path}"`
        });
      }
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to paste documents';
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      return false;
    }
  };

  // Handle document import to path
  const handleImportDocuments = async (documents: any[], contextPath: string): Promise<boolean> => {
    if (!context) return false;
    try {
      const success = await importDocumentsToContext(context.workspaceId, contextPath, documents);
      if (success) {
        await fetchDocuments(); // Refresh documents
        showToast({
          title: 'Success',
          description: `Imported ${documents.length} document(s) to "${contextPath}"`
        });
      }
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import documents';
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      return false;
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

  // Handle tree path selection for navigation/display and populate input
  const handlePathSelect = (path: string) => {
    setSelectedPath(path);
    // Update the editable URL input with the selected path in workspace.name://path format
    if (context) {
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      const newUrl = `${context.workspaceName}://${cleanPath}`;
      setEditableUrl(newUrl);
    }
  };

  // Handle toolbox filter changes
  const handleFilterToggle = (filter: keyof typeof activeFilters) => {
    const newActiveFilters = {
      ...activeFilters,
      [filter]: !activeFilters[filter]
    };
    setActiveFilters(newActiveFilters);

    // Update URL with new filters
    const features = featureFiltersToArray({
      ...newActiveFilters,
      customBitmaps
    });
    const newFilters = { features, filters: urlFilters.filters };
    setUrlFilters(newFilters);
    updateUrl(newFilters);
  };

  // Handle custom bitmap addition
  const handleAddCustomBitmap = () => {
    if (newBitmapInput.trim() && !customBitmaps.includes(newBitmapInput.trim())) {
      const newCustomBitmaps = [...customBitmaps, newBitmapInput.trim()];
      setCustomBitmaps(newCustomBitmaps);
      setNewBitmapInput('');

      // Update URL with new filters
      const features = featureFiltersToArray({
        ...activeFilters,
        customBitmaps: newCustomBitmaps
      });
      const newFilters = { features, filters: urlFilters.filters };
      setUrlFilters(newFilters);
      updateUrl(newFilters);
    }
  };

  // Handle custom bitmap removal
  const handleRemoveCustomBitmap = (bitmap: string) => {
    const newCustomBitmaps = customBitmaps.filter(b => b !== bitmap);
    setCustomBitmaps(newCustomBitmaps);

    // Update URL with new filters
    const features = featureFiltersToArray({
      ...activeFilters,
      customBitmaps: newCustomBitmaps
    });
    const newFilters = { features, filters: urlFilters.filters };
    setUrlFilters(newFilters);
    updateUrl(newFilters);
  };

  // Handle grant access
  const handleGrantAccess = async () => {
    if (!context || !shareEmail.trim()) return;

    setIsSharing(true);
    try {
      await grantContextAccess(context.userId, context.id, shareEmail.trim(), sharePermission);

      // Update state with new ACL format
      setContext(prev => {
        if (!prev) return null;

        const newAcl = { ...prev.acl };

        // Ensure users object exists
        if (!newAcl.users) {
          newAcl.users = {};
        }

        // Add new share in new format
        newAcl.users[shareEmail.trim()] = {
          accessLevel: sharePermission,
          userId: '', // Will be filled by backend
          grantedAt: new Date().toISOString(),
          grantedBy: context.userId
        };

        return {
          ...prev,
          acl: newAcl
        };
      });

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

        // Handle both old and new ACL formats
        if (newAcl.users && newAcl.users[userEmail]) {
          // New format: remove from nested users object
          delete newAcl.users[userEmail];
        } else {
          // Old format: remove from flat structure
          delete newAcl[userEmail];
        }

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
                defaultExpanded={false}
                expandedPath={selectedPath !== '/' ? selectedPath : undefined}
                onInsertPath={!isSharedContext ? treeOperations.insertPath : undefined}
                onRemovePath={!isSharedContext ? treeOperations.removePath : undefined}
                onRenamePath={!isSharedContext ? handleRenamePath : undefined}
                onMovePath={!isSharedContext ? treeOperations.movePath : undefined}
                onCopyPath={!isSharedContext ? treeOperations.copyPath : undefined}
                onMergeLayer={!isSharedContext ? treeOperations.mergeLayer : undefined}
                onSubtractLayer={!isSharedContext ? treeOperations.subtractLayer : undefined}
                onPasteDocuments={!isSharedContext ? handlePasteDocuments : undefined}
                pastedDocumentIds={copiedDocuments}
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
        <div className="flex flex-col gap-6 p-6 h-full">
          {/* Page Header */}
          <div className="border-b pb-4 flex-shrink-0">
            <h1 className="text-3xl font-bold tracking-tight">
              Context: {isSharedContext ? `${context.userId}/${context.id}` : context.id}
            </h1>
            <p className="text-muted-foreground mt-2">{context.description || 'No description available'}</p>
          </div>

          {/* Documents Section using DocumentList component */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-xl font-semibold">Documents</h2>
              <div className="text-sm text-muted-foreground">
                {Object.values(activeFilters).some(Boolean) || customBitmaps.length > 0 ? ' (filtered)' : ''}
              </div>
            </div>

            {/* Use the DocumentList component for consistency with action handlers */}
            <div className="flex-1 border rounded-lg p-4 bg-card flex flex-col min-h-0">
              <DocumentList
                documents={workspaceDocuments}
                isLoading={isLoadingDocuments}
                contextPath={selectedPath}
                totalCount={documentsTotalCount}
                viewMode="table"
                onRemoveDocument={selectedPath !== '/' ? handleRemoveDocument : undefined}
                onDeleteDocument={handleDeleteDocument}
                onRemoveDocuments={selectedPath !== '/' ? handleRemoveDocuments : undefined}
                onDeleteDocuments={handleDeleteDocuments}
                onCopyDocuments={handleCopyDocuments}
                onPasteDocuments={handlePasteDocuments}
                onImportDocuments={!isSharedContext ? handleImportDocuments : undefined}
                pastedDocumentIds={copiedDocuments}
                activeContextUrl={editableUrl}
                currentContextUrl={context.url}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - same as before but with updated content */}
      {anyRightSidebarOpen && (
        <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg overflow-y-auto z-50">
          {/* Sidebar Header */}
          <div className="flex border-b mb-4">
            <button
              className={`flex-1 py-2 text-sm font-medium ${isDetailsOpen ? 'border-b-2 border-primary' : ''}`}
              onClick={() => toggleSidebar('details')}
            >
              Details
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${isShareOpen ? 'border-b-2 border-primary' : ''}`}
              onClick={() => toggleSidebar('share')}
            >
              Share
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${isToolboxOpen ? 'border-b-2 border-primary' : ''}`}
              onClick={() => toggleSidebar('toolbox')}
            >
              Filter
            </button>
            <Button
              onClick={closeAllRightSidebars}
              variant="ghost"
              size="sm"
              className="p-2"
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
                          <div className="text-sm font-medium">{(isOwner && (currentUser?.email)) || ((userId && userId.includes('@')) ? userId : context.userId)}</div>
                          <div className="text-xs text-muted-foreground">Owner</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">Full Access</div>
                    </div>

                    {/* Shared Users */}
                    {(() => {
                      // Handle both old and new ACL formats
                      const aclEntries: Array<[string, string]> = [];

                      if (context.acl) {
                        // Check for new format (acl.users)
                        if (context.acl.users && typeof context.acl.users === 'object') {
                          Object.entries(context.acl.users).forEach(([email, shareData]: [string, any]) => {
                            const accessLevel = shareData.accessLevel || shareData;
                            aclEntries.push([email, accessLevel]);
                          });
                        } else {
                          // Old format: flat structure with userId/email as key
                          Object.entries(context.acl).forEach(([key, value]) => {
                            // Skip nested objects (like 'users' key)
                            if (typeof value === 'string') {
                              aclEntries.push([key, value]);
                            }
                          });
                        }
                      }

                      return aclEntries.map(([aclKey, permission]) => {
                        const displayEmail = aclKey.includes('@') ? aclKey : (aclUserMap[aclKey] || aclKey);
                        return (
                          <div key={aclKey} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center">
                                <span className="text-xs font-medium">
                                  {displayEmail.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium">{displayEmail}</div>
                                <div className="text-xs text-muted-foreground">
                                  {permission === 'documentRead' && 'Read Only'}
                                  {permission === 'documentWrite' && 'Read + Append'}
                                  {permission === 'documentReadWrite' && 'Full Access'}
                                </div>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleRevokeAccess(displayEmail)}
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      });
                    })()}

                    {(() => {
                      // Check if there are any ACL entries (handle both formats)
                      const hasEntries = context.acl && (
                        (context.acl.users && Object.keys(context.acl.users).length > 0) ||
                        Object.entries(context.acl).some(([_key, value]) => typeof value === 'string')
                      );

                      if (!hasEntries) {
                        return (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            No users have been granted access to this context.
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Token-based sharing */}
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Token-based Sharing</h4>
                  <ContextTokenManager contextId={context.id} />
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
