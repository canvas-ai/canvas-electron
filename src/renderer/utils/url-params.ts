/**
 * Utilities for handling URL parameters for features and filters
 */

/**
 * Sanitize URL path by removing duplicate slashes and ensuring proper format
 */
export function sanitizeUrlPath(path: string): string {
  if (!path) return '/';

  // Replace multiple consecutive slashes with single slash
  const sanitized = path.replace(/\/+/g, '/');

  // Ensure path starts with slash
  return sanitized.startsWith('/') ? sanitized : `/${sanitized}`;
}

export interface UrlFilters {
  features: string[];
  filters: string[];
}

/**
 * Parse URL search parameters for features and filters
 */
export function parseUrlFilters(searchParams: URLSearchParams): UrlFilters {
  const features = searchParams.getAll('feature');
  const filters = searchParams.getAll('filter');

  return {
    features,
    filters
  };
}

/**
 * Convert filters object to URL search parameters
 */
export function filtersToUrlParams(filters: UrlFilters): URLSearchParams {
  const params = new URLSearchParams();

  filters.features.forEach(feature => {
    params.append('feature', feature);
  });

  filters.filters.forEach(filter => {
    params.append('filter', filter);
  });

  return params;
}

/**
 * Extract workspace path from URL pathname
 * e.g., /workspaces/myworkspace/foo/bar/baz -> /foo/bar/baz
 */
export function extractWorkspacePath(pathname: string, workspaceName: string): string {
  const prefix = `/workspaces/${workspaceName}`;
  if (pathname.startsWith(prefix)) {
    const remainingPath = pathname.slice(prefix.length);
    return sanitizeUrlPath(remainingPath || '/');
  }
  return '/';
}

/**
 * Build workspace URL with path and filters
 */
export function buildWorkspaceUrl(workspaceName: string, path: string, filters?: UrlFilters): string {
  const sanitizedPath = sanitizeUrlPath(path);
  const basePath = `/workspaces/${workspaceName}${sanitizedPath === '/' ? '' : sanitizedPath}`;

  if (!filters || (filters.features.length === 0 && filters.filters.length === 0)) {
    return basePath;
  }

  const params = filtersToUrlParams(filters);
  return `${basePath}?${params.toString()}`;
}

/**
 * Build context URL with filters
 */
export function buildContextUrl(contextId: string, userId?: string, filters?: UrlFilters): string {
  const basePath = userId ? `/users/${userId}/contexts/${contextId}` : `/contexts/${contextId}`;

  if (!filters || (filters.features.length === 0 && filters.filters.length === 0)) {
    return basePath;
  }

  const params = filtersToUrlParams(filters);
  return `${basePath}?${params.toString()}`;
}

/**
 * Parse feature filters for context toolbox
 */
export function parseFeatureFilters(features: string[]): {
  tabs: boolean;
  notes: boolean;
  todo: boolean;
  customBitmaps: string[];
} {
  const result = {
    tabs: false,
    notes: false,
    todo: false,
    customBitmaps: [] as string[]
  };

  features.forEach(feature => {
    switch (feature) {
      case 'data/abstraction/tab':
        result.tabs = true;
        break;
      case 'data/abstraction/note':
        result.notes = true;
        break;
      case 'data/abstraction/todo':
        result.todo = true;
        break;
      default:
        // Custom bitmap
        result.customBitmaps.push(feature);
        break;
    }
  });

  return result;
}

/**
 * Convert feature filters back to features array
 */
export function featureFiltersToArray(filters: {
  tabs: boolean;
  notes: boolean;
  todo: boolean;
  customBitmaps: string[];
}): string[] {
  const features: string[] = [];

  if (filters.tabs) features.push('data/abstraction/tab');
  if (filters.notes) features.push('data/abstraction/note');
  if (filters.todo) features.push('data/abstraction/todo');

  features.push(...filters.customBitmaps);

  return features;
}
