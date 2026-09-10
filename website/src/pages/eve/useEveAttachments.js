import { useState } from 'react'

export function useEveAttachments({ composerRef }) {
  const [attachments, setAttachments] = useState([])

  const processFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return

    const readPromises = files.map((file) => {
      return new Promise((resolve) => {
        const isImage = file.type.startsWith('image/')
        const isText =
          file.type.startsWith('text/') ||
          /\.(txt|md|json|js|jsx|ts|tsx|html|css|py|csv|xml|yaml|yml|sql|sh|env|log|rs|go|java|c|cpp|h)$/i.test(file.name)

        const fileMeta = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          isImage,
        }

        if (isImage) {
          const reader = new FileReader()
          reader.onload = (e) => resolve({ ...fileMeta, dataUrl: e.target.result })
          reader.onerror = () => resolve(fileMeta)
          reader.readAsDataURL(file)
        } else if (isText || file.size < 500000) {
          const reader = new FileReader()
          reader.onload = (e) => {
            const text = String(e.target.result || '')
            const truncated = text.length > 40000 ? `${text.slice(0, 40000)}\n\n[...truncated]` : text
            resolve({ ...fileMeta, textContent: truncated })
          }
          reader.onerror = () => resolve(fileMeta)
          reader.readAsText(file)
        } else {
          resolve(fileMeta)
        }
      })
    })

    const loaded = await Promise.all(readPromises)
    setAttachments((prev) => [...prev, ...loaded])
    composerRef.current?.focus()
  }

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const clearAttachments = () => setAttachments([])

  return { attachments, processFiles, removeAttachment, clearAttachments, setAttachments }
}
