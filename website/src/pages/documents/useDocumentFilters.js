import { useMemo } from 'react'

export function useDocumentFilters({ documents, query, driveFiles, driveQuery }) {
  const visibleDocuments = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return documents
    return documents.filter((document) =>
      document.name.toLowerCase().includes(search) ||
      (document.description ?? '').toLowerCase().includes(search) ||
      (document.category ?? '').toLowerCase().includes(search) ||
      (document.tags ?? []).some((tag) => tag.toLowerCase().includes(search)),
    )
  }, [documents, query])

  const filteredDriveFiles = useMemo(() => {
    const search = driveQuery.trim().toLowerCase()
    if (!search) return driveFiles
    return driveFiles.filter(
      (file) =>
        file.name.toLowerCase().includes(search) ||
        file.mimeType.toLowerCase().includes(search),
    )
  }, [driveFiles, driveQuery])

  return { visibleDocuments, filteredDriveFiles }
}
