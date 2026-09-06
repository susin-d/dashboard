import { Box, ChevronDown, Download, FolderOpen, Redo2, Save, Undo2, Upload } from 'lucide-react'

export function StudioTopBar({ project, projects, onOpen, onSave, onImport, onExport, onCreatePrimitive, onUndo, onRedo, canUndo, canRedo }) {
  return (
    <header className="modeling-topbar">
      <div className="modeling-brand-mark" aria-hidden="true">A</div>
      <div className="modeling-brand-copy">
        <strong>Avatar Studio</strong>
        <span>{project.name}{project.dirty ? ' · Unsaved changes' : ''}</span>
      </div>
      <nav className="modeling-menu" aria-label="Studio menu">
        {['File', 'Edit', 'View', 'Create', 'Modeling', 'Sculpting', 'UV Editing', 'Texture Paint', 'Shading', 'Animation', 'Rendering'].map((item) => (
          <button type="button" key={item} className="modeling-menu-item">{item}<ChevronDown size={11} /></button>
        ))}
      </nav>
      <div className="modeling-top-actions">
        <label className="modeling-action-button" title="Import model">
          <Upload size={15} /> Import
          <input type="file" accept=".vrm,.glb,.gltf,.bin,.png,.jpg,.jpeg,.webp" multiple onChange={onImport} hidden />
        </label>
        <button type="button" className="modeling-action-button" onClick={onCreatePrimitive}><Box size={15} /> Add cube</button>
        <button type="button" className="modeling-icon-button" onClick={onUndo} disabled={!canUndo} aria-label="Undo"><Undo2 size={15} /></button>
        <button type="button" className="modeling-icon-button" onClick={onRedo} disabled={!canRedo} aria-label="Redo"><Redo2 size={15} /></button>
        <button type="button" className="modeling-action-button is-primary" onClick={onSave}><Save size={15} /> Save</button>
        <div className="modeling-export-menu">
          <button type="button" className="modeling-action-button" onClick={() => onExport('glb')}><Download size={15} /> Export</button>
          <div className="modeling-export-options">
            <button type="button" onClick={() => onExport('glb')}>Export GLB</button>
            <button type="button" onClick={() => onExport('gltf')}>Export GLTF</button>
            <button type="button" onClick={() => onExport('vrm')}>Export VRM</button>
          </div>
        </div>
        <label className="modeling-project-picker">
          <FolderOpen size={14} />
          <select value={project.id || ''} onChange={(event) => onOpen(event.target.value)} aria-label="Open modeling project">
            <option value="">Local scene</option>
            {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>
    </header>
  )
}
