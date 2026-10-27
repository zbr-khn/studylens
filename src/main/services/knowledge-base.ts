import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { CourseDocument, DocumentChunk, SearchContextResult } from '../../shared/types';
import { StorageService } from './storage';
import { GeminiService } from './gemini';

export class KnowledgeBaseService {
  private storage: StorageService;
  private gemini: GeminiService;

  constructor(storage: StorageService, gemini: GeminiService) {
    this.storage = storage;
    this.gemini = gemini;
  }

  public async processFile(
    courseId: string,
    fileName: string,
    buffer: Buffer
  ): Promise<CourseDocument> {
    const ext = path.extname(fileName).toLowerCase().replace('.', '');
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    let fileType: CourseDocument['fileType'] = 'txt';
    if (ext === 'pdf') fileType = 'pdf';
    else if (['doc', 'docx'].includes(ext)) fileType = 'docx';
    else if (['txt'].includes(ext)) fileType = 'txt';
    else if (['md', 'markdown'].includes(ext)) fileType = 'md';
    else if (['ppt', 'pptx'].includes(ext)) fileType = 'pptx';
    else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) fileType = 'image';
    else if (ext === 'zip') fileType = 'zip';

    const courseDoc: CourseDocument = {
      id: docId,
      courseId,
      name: fileName,
      fileType,
      size: buffer.length,
      uploadedAt: Date.now(),
      chunkCount: 0,
      status: 'indexing',
    };

    this.storage.saveDocument(courseDoc);

    try {
      if (fileType === 'zip') {
        // Extract ZIP and process each file
        const zip = await JSZip.loadAsync(buffer);
        let totalSubChunks = 0;
        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
          if (!zipEntry.dir && !relativePath.startsWith('__MACOSX/')) {
            const subBuf = await zipEntry.async('nodebuffer');
            const subDoc = await this.processFile(courseId, path.basename(relativePath), subBuf);
            totalSubChunks += subDoc.chunkCount;
          }
        }
        courseDoc.status = 'indexed';
        courseDoc.chunkCount = totalSubChunks;
        this.storage.saveDocument(courseDoc);
        return courseDoc;
      }

      // Extract raw text and structural sections
      const extracted = await this.extractContent(fileType, buffer, fileName);
      const chunks = this.createChunks(docId, courseId, fileName, extracted);

      // Compute embeddings if key is present
      const hasKey = this.storage.getSettings().hasApiKey;
      if (hasKey) {
        for (const chunk of chunks) {
          try {
            chunk.embedding = await this.gemini.createEmbedding(
              `${chunk.docName} - ${chunk.heading}\n${chunk.content}`
            );
          } catch (e) {
            console.warn('Embedding generation skipped for chunk:', e);
          }
        }
      }

      this.storage.saveChunks(chunks);

      courseDoc.status = 'indexed';
      courseDoc.chunkCount = chunks.length;
      this.storage.saveDocument(courseDoc);
      return courseDoc;
    } catch (err: any) {
      console.error(`Error processing file ${fileName}:`, err);
      courseDoc.status = 'error';
      courseDoc.errorMessage = err.message || 'Failed to process document';
      this.storage.saveDocument(courseDoc);
      return courseDoc;
    }
  }

  private async extractContent(
    fileType: CourseDocument['fileType'],
    buffer: Buffer,
    fileName: string
  ): Promise<Array<{ heading: string; content: string; page?: number }>> {
    const results: Array<{ heading: string; content: string; page?: number }> = [];

    switch (fileType) {
      case 'pdf': {
        const data = await pdfParse(buffer);
        const text = data.text || '';
        // Split by page marker or double newlines
        const pages = text.split(/\f|\n\s*\n\s*Page \d+/i);
        if (pages.length > 1) {
          pages.forEach((pageText, idx) => {
            const trimmed = pageText.trim();
            if (trimmed.length > 20) {
              const heading = this.detectHeading(trimmed) || `Page ${idx + 1}`;
              results.push({ heading: `${fileName} - ${heading}`, content: trimmed, page: idx + 1 });
            }
          });
        } else {
          // Chunk by headings/paragraphs
          results.push(...this.splitByHeadings(fileName, text));
        }
        break;
      }

      case 'docx': {
        const res = await mammoth.extractRawText({ buffer });
        const text = res.value || '';
        results.push(...this.splitByHeadings(fileName, text));
        break;
      }

      case 'pptx': {
        const zip = await JSZip.loadAsync(buffer);
        let slideIndex = 1;
        while (true) {
          const slideFile = zip.file(`ppt/slides/slide${slideIndex}.xml`);
          if (!slideFile) break;
          const slideXml = await slideFile.async('text');
          // Extract text inside <a:t> tags
          const textMatches = slideXml.match(/<a:t>([^<]+)<\/a:t>/g);
          if (textMatches && textMatches.length > 0) {
            const slideText = textMatches
              .map((tag) => tag.replace(/<\/?a:t>/g, ''))
              .join(' ')
              .trim();
            if (slideText.length > 10) {
              results.push({
                heading: `${fileName} - Slide ${slideIndex}`,
                content: slideText,
                page: slideIndex,
              });
            }
          }
          slideIndex++;
        }
        if (results.length === 0) {
          results.push({ heading: `${fileName} - Slides`, content: 'Presentation slides indexed.' });
        }
        break;
      }

      case 'image': {
        results.push({
          heading: `${fileName} - Image Resource`,
          content: `Visual material file: ${fileName}. Use screenshot or vision mode to inspect visual diagrams.`,
        });
        break;
      }

      case 'txt':
      case 'md':
      default: {
        const text = buffer.toString('utf-8');
        results.push(...this.splitByHeadings(fileName, text));
        break;
      }
    }

    if (results.length === 0) {
      results.push({ heading: `${fileName} - Overview`, content: buffer.toString('utf-8').slice(0, 1000) });
    }

    return results;
  }

  private splitByHeadings(
    fileName: string,
    rawText: string
  ): Array<{ heading: string; content: string }> {
    const lines = rawText.split('\n');
    const sections: Array<{ heading: string; content: string }> = [];

    let currentHeading = `${fileName} - Introduction`;
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const isHeader =
        /^#{1,4}\s+(.+)$/.test(trimmed) ||
        /^(Unit|Chapter|Section|Lecture|Topic)\s+\d+[:\s\-]*(.+)?$/i.test(trimmed) ||
        /^[A-Z0-9\s]{4,40}:$/.test(trimmed);

      if (isHeader) {
        if (currentContent.join('\n').trim().length > 30) {
          sections.push({
            heading: currentHeading,
            content: currentContent.join('\n').trim(),
          });
          currentContent = [];
        }
        currentHeading = `${fileName} → ${trimmed.replace(/^#+\s*/, '')}`;
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.join('\n').trim().length > 0) {
      sections.push({
        heading: currentHeading,
        content: currentContent.join('\n').trim(),
      });
    }

    return sections;
  }

  private detectHeading(text: string): string | null {
    const firstLines = text.split('\n').slice(0, 3);
    for (const line of firstLines) {
      const trimmed = line.trim();
      if (trimmed.length > 3 && trimmed.length < 80 && !trimmed.endsWith('.')) {
        return trimmed;
      }
    }
    return null;
  }

  private createChunks(
    documentId: string,
    courseId: string,
    docName: string,
    sections: Array<{ heading: string; content: string; page?: number }>
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const MAX_CHUNK_CHAR = 800;
    const OVERLAP = 120;

    for (const sec of sections) {
      const text = sec.content;
      if (text.length <= MAX_CHUNK_CHAR) {
        chunks.push({
          id: `chunk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          documentId,
          courseId,
          docName,
          heading: sec.heading,
          pageNumber: sec.page,
          content: text,
        });
      } else {
        let start = 0;
        let part = 1;
        while (start < text.length) {
          const end = Math.min(start + MAX_CHUNK_CHAR, text.length);
          const slice = text.substring(start, end).trim();
          if (slice.length > 20) {
            chunks.push({
              id: `chunk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              documentId,
              courseId,
              docName,
              heading: `${sec.heading} (Part ${part})`,
              pageNumber: sec.page,
              content: slice,
            });
            part++;
          }
          if (end >= text.length) break;
          start += MAX_CHUNK_CHAR - OVERLAP;
        }
      }
    }

    return chunks;
  }

  public async search(
    courseId: string,
    query: string,
    topK: number = 4
  ): Promise<SearchContextResult> {
    const allChunks = this.storage.getChunks(courseId);
    if (allChunks.length === 0) {
      return { chunks: [], contextFormatted: '', hasMatch: false };
    }

    const hasKey = this.storage.getSettings().hasApiKey;
    let scored: Array<{ chunk: DocumentChunk; score: number }> = [];

    if (hasKey) {
      try {
        const queryEmbedding = await this.gemini.createEmbedding(query);
        for (const chunk of allChunks) {
          if (chunk.embedding && chunk.embedding.length > 0) {
            const sim = this.cosineSimilarity(queryEmbedding, chunk.embedding);
            scored.push({ chunk, score: sim });
          } else {
            // BM25 / Keyword fallback score
            const kwScore = this.computeKeywordScore(query, chunk);
            scored.push({ chunk, score: kwScore });
          }
        }
      } catch (err) {
        console.warn('Vector embedding search failed, falling back to keyword search:', err);
        scored = allChunks.map((chunk) => ({
          chunk,
          score: this.computeKeywordScore(query, chunk),
        }));
      }
    } else {
      scored = allChunks.map((chunk) => ({
        chunk,
        score: this.computeKeywordScore(query, chunk),
      }));
    }

    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, topK).filter((item) => item.score > 0.12).map((item) => item.chunk);

    if (topChunks.length === 0) {
      return { chunks: [], contextFormatted: '', hasMatch: false };
    }

    const contextFormatted = topChunks
      .map(
        (c) =>
          `[Source Document: ${c.docName} | Section: ${c.heading}${c.pageNumber ? ` | Page: ${c.pageNumber}` : ''}]\n${c.content}`
      )
      .join('\n\n---\n\n');

    return {
      chunks: topChunks,
      contextFormatted,
      hasMatch: true,
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private computeKeywordScore(query: string, chunk: DocumentChunk): number {
    const terms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (terms.length === 0) return 0;

    const contentLower = `${chunk.docName} ${chunk.heading} ${chunk.content}`.toLowerCase();
    let hits = 0;
    for (const term of terms) {
      if (contentLower.includes(term)) {
        hits++;
        // Boost if present in heading or doc name
        if (chunk.heading.toLowerCase().includes(term)) hits += 1.5;
        if (chunk.docName.toLowerCase().includes(term)) hits += 1;
      }
    }

    return hits / (terms.length * 2);
  }
}
