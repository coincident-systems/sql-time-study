'use client';

import { useRef, useCallback } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * SQL Editor component using Monaco Editor.
 * Supports Ctrl/Cmd+Enter to run queries.
 */
export function SqlEditor({
  value,
  onChange,
  onRun,
  disabled = false,
  className = '',
}: SqlEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      // Add Ctrl/Cmd+Enter keybinding to run query
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        if (onRun && !disabled) {
          onRun();
        }
      });

      // Focus editor
      editor.focus();
    },
    [onRun, disabled]
  );

  const handleChange: OnChange = useCallback(
    (value) => {
      onChange(value || '');
    },
    [onChange]
  );

  return (
    <div className={`border border-border rounded-lg overflow-hidden ${className}`}>
      <Editor
        height="200px"
        language="sql"
        theme="vs-dark"
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          readOnly: disabled,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'line',
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
          },
        }}
      />
    </div>
  );
}
