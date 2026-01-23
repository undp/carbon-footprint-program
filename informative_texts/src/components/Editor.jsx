import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  ListsToggle,
  UndoRedo
} from '@mdxeditor/editor'

export default function Editor() {
  const [content, setContent] = useState('Cargando...')
  const [editorKey, setEditorKey] = useState(0)

  function loadMarkdown() {
    fetch('/default.md')
      .then(res => res.text())
      .then(text => {
        setContent(text)
        setEditorKey(prev => prev + 1) // 🔥 recarga controlada
      })
      .catch(() => setContent('# Error cargando archivo'))
  }

  useEffect(() => {
    loadMarkdown()
  }, [])

  return (
    <div className="editor-page">
      <div className="editor-container">

        {/* HEADER */}
        <header className="editor-header">
          <h1>MDX Editor</h1>
          <p>Editor con soporte matemático y preview</p>
        </header>

        {/* SPLIT VIEW */}
        <div className="editor-split">

          {/* EDITOR */}
          <div className="editor-panel">
            <MDXEditor
              key={editorKey}
              markdown={content}
              onChange={setContent}
              plugins={[
                headingsPlugin(),
                listsPlugin(),
                quotePlugin(),
                thematicBreakPlugin(),
                markdownShortcutPlugin(),
                toolbarPlugin({
                  toolbarContents: () => (
                    <>
                      <UndoRedo />
                      <BlockTypeSelect />
                      <BoldItalicUnderlineToggles />
                      <ListsToggle />
                    </>
                  )
                })
              ]}
            />
          </div>

          {/* PREVIEW */}
          <div className="preview-panel">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {content}
            </ReactMarkdown>
          </div>

        </div>

        {/* FOOTER */}
        <div className="editor-footer">
          <button onClick={loadMarkdown} className="reload-btn">
            🔄 Recargar archivo .md
          </button>
        </div>

      </div>
    </div>
  )
}
