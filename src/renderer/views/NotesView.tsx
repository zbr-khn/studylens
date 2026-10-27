import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Tag,
  Eye,
  Edit3,
  Calendar,
} from 'lucide-react';
import { NoteItem } from '../../shared/types';

export const NotesView: React.FC = () => {
  const { activeCourse } = useApp();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeNote, setActiveNote] = useState<NoteItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (activeCourse) {
      loadNotes();
    }
  }, [activeCourse]);

  const loadNotes = async () => {
    if (!activeCourse) return;
    const items = await window.api.getNotes(activeCourse.id);
    setNotes(items);
    if (items.length > 0) {
      selectNote(items[0]);
    } else {
      handleCreateNew();
    }
  };

  const selectNote = (n: NoteItem) => {
    setActiveNote(n);
    setTitle(n.title);
    setContent(n.content);
    setTags(n.tags || []);
    setIsSaved(false);
  };

  const handleCreateNew = () => {
    setActiveNote(null);
    setTitle('New Study Note');
    setContent(
      `# Study Note\n\n### Summary\n- Context: \n\n### Theoretical Formulation\n$$\\det(A - \\lambda I) = 0$$\n\n### Code or Pseudo-code\n\`\`\`python\ndef example():\n    return True\n\`\`\`\n`
    );
    setTags(['revision']);
    setIsSaved(false);
  };

  const handleSave = async () => {
    if (!activeCourse || !title.trim()) return;
    const saved = await window.api.saveNote({
      id: activeNote?.id,
      courseId: activeCourse.id,
      title: title.trim(),
      content,
      tags,
    });
    setActiveNote(saved);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    const updated = await window.api.getNotes(activeCourse.id);
    setNotes(updated);
  };

  const handleDelete = async (id: string) => {
    await window.api.deleteNote(id);
    if (activeCourse) {
      const remaining = await window.api.getNotes(activeCourse.id);
      setNotes(remaining);
      if (remaining.length > 0) {
        selectNote(remaining[0]);
      } else {
        handleCreateNew();
      }
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Notes List Sidebar */}
      <div className="w-64 border-r border-surface-border bg-surface/50 flex flex-col justify-between">
        <div className="p-3 border-b border-surface-border flex items-center justify-between">
          <div className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-accent-light" />
            <span>Course Notes ({notes.length})</span>
          </div>
          <button
            onClick={handleCreateNew}
            className="p-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent-light transition-colors"
            title="Create new note"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes.map((n) => (
            <div
              key={n.id}
              onClick={() => selectNote(n)}
              className={`p-2.5 rounded-xl cursor-pointer text-xs transition-colors flex items-center justify-between group ${
                activeNote?.id === n.id
                  ? 'bg-accent/15 text-accent-light border border-accent/30 font-medium'
                  : 'text-text hover:bg-secondary/60 border border-transparent'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="truncate font-semibold">{n.title}</div>
                <div className="text-[10px] text-muted truncate mt-0.5">
                  {new Date(n.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(n.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-danger/20 hover:text-danger rounded text-muted transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Editor & Preview Pane */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Note Toolbar */}
        <div className="px-5 py-3 border-b border-surface-border bg-surface/40 flex items-center justify-between">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="bg-transparent text-sm font-bold text-white focus:outline-none flex-1 mr-4"
          />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                isPreview
                  ? 'bg-accent text-white border-accent'
                  : 'bg-secondary text-muted hover:text-text border-surface-border'
              }`}
            >
              {isPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isPreview ? 'Edit' : 'Preview'}</span>
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-glow flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaved ? 'Saved!' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Tags bar */}
        <div className="px-5 py-2 border-b border-surface-border bg-secondary/20 flex items-center gap-2 flex-wrap">
          <Tag className="w-3.5 h-3.5 text-muted" />
          {tags.map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 rounded bg-surface border border-surface-border text-[10px] text-accent-light flex items-center gap-1"
            >
              <span>{t}</span>
              <button
                onClick={() => handleRemoveTag(t)}
                className="hover:text-danger text-muted ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder="Add tag and press Enter..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            className="bg-transparent text-[11px] text-text placeholder-muted/60 focus:outline-none"
          />
        </div>

        {/* Editor Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {isPreview ? (
            <div className="p-4 rounded-xl bg-surface/50 border border-surface-border max-w-3xl">
              <MarkdownRenderer content={content} />
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your academic notes here using Markdown, equations ($...$), and code blocks..."
              className="w-full h-full bg-transparent text-xs text-text font-mono leading-relaxed resize-none focus:outline-none"
            />
          )}
        </div>
      </div>
    </div>
  );
};
