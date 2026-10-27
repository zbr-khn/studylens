import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  UploadCloud,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileImage,
  FolderArchive,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CourseDocument, DocumentChunk } from '../../shared/types';

export const KnowledgeView: React.FC = () => {
  const { activeCourse, documents, uploadFiles, deleteDocument } = useApp();
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!activeCourse) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Read files into buffers and send to main process
    const filePayloads: Array<{ name: string; buffer: Uint8Array }> = [];
    for (const f of files) {
      const arrayBuf = await f.arrayBuffer();
      filePayloads.push({
        name: f.name,
        buffer: new Uint8Array(arrayBuf),
      });
    }

    await window.api.uploadFileBuffers(activeCourse.id, filePayloads);
    const updated = await window.api.getDocuments(activeCourse.id);
    // Trigger refresh in context
    uploadFiles();
  };

  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !activeCourse) return;
    setIsSearching(true);
    try {
      const res = await window.api.searchKnowledge(activeCourse.id, searchQuery.trim(), 4);
      setSearchResults(res.chunks);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const getFileIcon = (type: CourseDocument['fileType']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-400" />;
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-400" />;
      case 'pptx':
        return <FileSpreadsheet className="w-5 h-5 text-amber-400" />;
      case 'image':
        return <FileImage className="w-5 h-5 text-purple-400" />;
      case 'zip':
        return <FolderArchive className="w-5 h-5 text-emerald-400" />;
      default:
        return <FileCode className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Course Knowledge Base</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-light border border-accent/30 font-medium">
              {activeCourse?.name}
            </span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Upload syllabi, lecture slides, handbooks, notes, or code. The AI indexes and prioritizes this material.
          </p>
        </div>

        {/* Prominent Upload Course Material Button (Requirement 3) */}
        <button
          onClick={uploadFiles}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent-dark text-white text-xs font-semibold shadow-glow transition-all active:scale-95"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Course Material</span>
        </button>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={uploadFiles}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-accent bg-accent/10 scale-[1.01]'
            : 'border-surface-border bg-surface/40 hover:bg-surface/70 hover:border-accent/50'
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-accent-light mb-3">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div className="text-sm font-semibold text-text">Drag and drop course material here</div>
        <div className="text-xs text-muted mt-1">
          Supports <span className="text-text font-medium">PDF, DOCX, TXT, Markdown, PPTX, Images, and ZIP</span> archives
        </div>
        <div className="mt-3 inline-block px-3 py-1 rounded-lg bg-secondary text-[11px] font-medium text-accent-light border border-surface-border">
          + Add files to {activeCourse?.name || 'Workspace'}
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div className="bg-surface/50 border border-surface-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-light" />
            <span>Indexed Documents ({documents.length})</span>
          </div>
          <span className="text-[11px] text-muted">
            {documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0)} semantic chunks available
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted">
            No course documents uploaded yet for this course. Click "Upload Course Material" above to start.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/60 border border-surface-border hover:border-accent/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-surface border border-surface-border">
                    {getFileIcon(doc.fileType)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text truncate max-w-[200px]" title={doc.name}>
                      {doc.name}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted mt-0.5">
                      <span>{(doc.size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{doc.chunkCount} chunks</span>
                      <span>•</span>
                      {doc.status === 'indexed' ? (
                        <span className="flex items-center gap-0.5 text-emerald-400">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Indexed</span>
                        </span>
                      ) : doc.status === 'indexing' ? (
                        <span className="flex items-center gap-0.5 text-amber-400">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>Processing...</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-danger">
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>Error</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDocument(doc.id);
                  }}
                  className="p-1.5 rounded-lg hover:bg-danger/20 text-muted hover:text-danger transition-colors"
                  title="Remove document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Semantic Knowledge Retrieval Inspector */}
      <div className="bg-surface/50 border border-surface-border rounded-2xl p-5 space-y-4">
        <div>
          <div className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-light" />
            <span>Semantic Context Retrieval Inspector</span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Test how the vector and structural search engine matches academic queries against your course material.
          </p>
        </div>

        <form onSubmit={handleTestSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
            <input
              type="text"
              placeholder="e.g. What is the difference between Type 1 and Type 2 grammars?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary text-xs rounded-xl border border-surface-border text-white placeholder-muted focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-secondary hover:bg-tertiary text-text border border-surface-border hover:border-accent/40 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Inspect Chunks</span>
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-semibold text-accent-light uppercase tracking-wider">
              Top Retrieved Chunks Prioritized for OpenAI:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((chunk, idx) => (
                <div
                  key={chunk.id || idx}
                  className="p-3.5 rounded-xl bg-secondary/70 border border-surface-border text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-accent-light truncate max-w-[200px]">
                      {chunk.docName}
                    </span>
                    {chunk.pageNumber && (
                      <span className="text-muted">Page {chunk.pageNumber}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted font-medium">{chunk.heading}</div>
                  <div className="p-2 rounded bg-[#0F1115] text-gray-300 font-mono text-[11px] leading-relaxed max-h-32 overflow-y-auto">
                    {chunk.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
