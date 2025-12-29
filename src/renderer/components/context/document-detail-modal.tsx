import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Document {
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

interface DocumentDetailModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentDetailModal({ document, isOpen, onClose }: DocumentDetailModalProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  if (!isOpen || !document) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Document Details</h2>
              <p className="text-muted-foreground">ID: {document.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowRawJson(v => !v)}
                variant="outline"
                size="sm"
                title="Toggle raw JSON view"
              >
                {showRawJson ? 'View Data' : 'View Raw JSON'}
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="p-2"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="font-semibold mb-3">Basic Information</h3>
              <div className="grid gap-3 text-sm">
                <div>
                  <span className="font-medium">Schema:</span>
                  <span className="ml-2 font-mono">{document.schema}</span>
                </div>
                <div>
                  <span className="font-medium">Version:</span>
                  <span className="ml-2">{document.versionNumber} / {document.latestVersion}</span>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <span className="ml-2">{formatDate(document.createdAt)}</span>
                </div>
                <div>
                  <span className="font-medium">Updated:</span>
                  <span className="ml-2">{formatDate(document.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Document Data */}
            <div>
              <h3 className="font-semibold mb-3">{showRawJson ? 'Raw Document JSON' : 'Document Data'}</h3>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                {JSON.stringify(showRawJson ? document : document.data, null, 2)}
              </pre>
            </div>

            {/* Metadata */}
            <div>
              <h3 className="font-semibold mb-3">Metadata</h3>
              <div className="grid gap-3 text-sm">
                <div>
                  <span className="font-medium">Content Type:</span>
                  <span className="ml-2">{document.metadata.contentType}</span>
                </div>
                <div>
                  <span className="font-medium">Content Encoding:</span>
                  <span className="ml-2">{document.metadata.contentEncoding}</span>
                </div>
                {document.metadata.dataPaths.length > 0 && (
                  <div>
                    <span className="font-medium">Data Paths:</span>
                    <div className="ml-2 mt-1">
                      {document.metadata.dataPaths.map((path, index) => (
                        <div key={index} className="font-mono text-xs">{path}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Checksums */}
            {document.checksumArray.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Checksums</h3>
                <div className="space-y-2">
                  {document.checksumArray.map((checksum, index) => {
                    const [algo, hash] = checksum.split('/');
                    return (
                      <div key={index} className="flex items-center gap-2 text-sm font-mono">
                        <span className="font-medium">{algo}:</span>
                        <span className="text-muted-foreground">{hash}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Index Options */}
            <div>
              <h3 className="font-semibold mb-3">Index Options</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Primary Checksum Algorithm:</span>
                  <span className="ml-2">{document.indexOptions.primaryChecksumAlgorithm}</span>
                </div>
                <div>
                  <span className="font-medium">FTS Search Fields:</span>
                  <div className="ml-2 mt-1">
                    {document.indexOptions.ftsSearchFields.map((field, index) => (
                      <span key={index} className="inline-block bg-muted px-2 py-1 rounded text-xs mr-2 mb-1">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Vector Embedding Fields:</span>
                  <div className="ml-2 mt-1">
                    {document.indexOptions.vectorEmbeddingFields.map((field, index) => (
                      <span key={index} className="inline-block bg-muted px-2 py-1 rounded text-xs mr-2 mb-1">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t flex justify-end">
            <Button
              onClick={onClose}
              className="px-4 py-2"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
