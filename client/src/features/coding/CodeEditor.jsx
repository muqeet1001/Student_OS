import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';

const editorTheme = EditorView.theme({
  '&': { fontSize: '13px', height: '100%', backgroundColor: 'transparent' },
  '.cm-scroller': { fontFamily: '"JetBrains Mono", ui-monospace, monospace', lineHeight: '1.6' },
  '.cm-gutters': { backgroundColor: 'rgba(0,0,0,0.3)', border: 'none' },
  '.cm-content': { caretColor: '#ff784e' },
  '&.cm-focused': { outline: 'none' },
});

export default function CodeEditor({ value, onChange, readOnly = false }) {
  const extensions = useMemo(
    () => [javascript(), editorTheme, EditorView.lineWrapping],
    [],
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={oneDark}
      extensions={extensions}
      readOnly={readOnly}
      height="100%"
      style={{ height: '100%' }}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        foldGutter: false,
      }}
    />
  );
}
