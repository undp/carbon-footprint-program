import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'

import "/src/styles/editor.css";


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

export default function Editor() {
  const [content, setContent] = useState('Loading...')
  const [editorKey, setEditorKey] = useState(0)

  function loadMarkdown() {
    fetch('/subcategories/general_structure.md')
      .then(res => res.text())
      .then(text => {
        setContent(text)
        setEditorKey(prev => prev + 1)
      })
      .catch(() => setContent('# Error loading file'))
  }

  useEffect(() => {
    loadMarkdown()
  }, [])

  return (
    <div className="editor-page">
      <div className="editor-container">

        <header className="editor-header">
          <h1>Editor con MDX package</h1>
        </header>

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
          <button onClick={loadMarkdown} className="reload-btn">
            Load file
          </button>
        </div>

      </div>
    </div>
  )
}
