// Workspace tree node structure
export interface TreeNode {
  id: string
  type: string
  name: string
  label: string
  description: string
  color: string | null
  children: TreeNode[]
}

// Document structure from API
export interface Document {
  id: number
  schema: string
  schemaVersion: string
  data: Record<string, any>
  metadata: {
    contentType: string
    contentEncoding: string
    dataPaths: string[]
  }
  indexOptions: {
    checksumAlgorithms: string[]
    primaryChecksumAlgorithm: string
    checksumFields: string[]
    ftsSearchFields: string[]
    vectorEmbeddingFields: string[]
    embeddingOptions: {
      embeddingModel: string
      embeddingDimensions: number
      embeddingProvider: string
      embeddingProviderOptions: Record<string, any>
      chunking: {
        type: string
        chunkSize: number
        chunkOverlap: number
      }
    }
  }
  createdAt: string
  updatedAt: string
  checksumArray: string[]
  embeddingsArray: any[]
  parentId: number | null
  versions: any[]
  versionNumber: number
  latestVersion: number
}

// API response structure for documents
export interface DocumentsResponse {
  data: Document[]
  count: number
  totalCount?: number
  error: string | null
}

// API response structure for tree
export interface TreeResponse {
  payload: TreeNode
}

// API response structure for documents
export interface DocumentsApiResponse {
  status: string
  statusCode: number
  message: string
  payload: DocumentsResponse
  count: number | null
}
