import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'

import "/src/styles/editor.css";

import { files as mdFiles } from 'virtual:subcategory-files'

// ─── DEV TOGGLE ──────────────────────────────────────────────────────────────
// true  → carga directamente el archivo indicado (sin selector)
// false → muestra el selector con todos los .md disponibles
const HARDCODED_MODE = true
const HARDCODED_FILE = 'c3_disposición_de_residuos_solidos.md'
// ─────────────────────────────────────────────────────────────────────────────

import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  ListsToggle,
  UndoRedo,
  CreateLink
} from '@mdxeditor/editor'

function formatLabel(filename) {
  return filename.replace(/\.md$/, '').replace(/_/g, ' ')
}

export default function Editor() {
  const [content, setContent] = useState('Loading...')
  const [editorKey, setEditorKey] = useState(0)
  const [selectedFile, setSelectedFile] = useState(HARDCODED_MODE ? HARDCODED_FILE : mdFiles[0])

  function loadMarkdown(filename) {
    fetch(`/subcategories/${filename}`)
      .then(res => res.text())
      .then(text => {
        setContent(text)
        setEditorKey(prev => prev + 1)
      })
      .catch(() => setContent('# Error loading file'))
  }

  function handleFileChange(e) {
    const filename = e.target.value
    setSelectedFile(filename)
    loadMarkdown(filename)
  }

  useEffect(() => {
    loadMarkdown(selectedFile)
  }, [])

  return (
    <div className="editor-page">
      <div className="editor-container">

        <header className="editor-header">
          <h1>Editor con MDX package</h1>
        </header>

        {!HARDCODED_MODE && (
          <div className="file-selector">
            <label htmlFor="md-select">Archivo:</label>
            <select id="md-select" value={selectedFile} onChange={handleFileChange}>
              {mdFiles.map(file => (
                <option key={file} value={file}>{formatLabel(file)}</option>
              ))}
            </select>
          </div>
        )}

        <div className="editor-split">

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
                linkPlugin({
                  openLinkDialogOnCreate: true
                }),
                toolbarPlugin({
                  toolbarContents: () => (
                    <>
                      <UndoRedo />
                      <BlockTypeSelect />
                      <BoldItalicUnderlineToggles />
                      <ListsToggle />
                      <CreateLink />
                    </>
                  )
                })
              ]}
            />
          </div>

          <div className="preview-panel">
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
            >
              {content}
            </ReactMarkdown>
          </div>

        </div>

        <div className="editor-footer">
          <button onClick={() => loadMarkdown(selectedFile)} className="reload-btn">
            Load file
          </button>
        </div>

      </div>
    </div>
  )
}
