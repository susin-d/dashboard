import { ChevronDown, Eye, EyeOff, GitBranch, Layers3, Search } from 'lucide-react'
import { useState } from 'react'

export function StudioOutliner({ nodes, selectedNodeId, onSelect, onToggleVisibility }) {
  const [query, setQuery] = useState('')
  const filteredNodes = nodes.filter((node) => node.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <section className="modeling-outliner" aria-label="Scene outliner">
      <div className="modeling-panel-heading compact"><div><span className="modeling-panel-kicker">Scene</span><h2>Outliner</h2></div><Layers3 size={16} /></div>
      <label className="modeling-search-field"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search objects" aria-label="Search scene objects" /></label>
      <div className="modeling-outliner-tree">
        {filteredNodes.map((node) => <button type="button" key={node.id} className={`modeling-outliner-node ${selectedNodeId === node.id ? 'is-selected' : ''}`} onClick={() => onSelect(node.id)}>
          <ChevronDown size={12} className="modeling-node-chevron" /><GitBranch size={13} /><span>{node.name}</span>
          <span role="button" tabIndex={0} className="modeling-node-visibility" onClick={(event) => { event.stopPropagation(); onToggleVisibility(node) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onToggleVisibility(node) } }} aria-label={`${node.visible === false ? 'Show' : 'Hide'} ${node.name}`}>{node.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}</span>
        </button>)}
        {filteredNodes.length === 0 && <p className="modeling-muted-copy">Load a model to inspect its scene.</p>}
      </div>
    </section>
  )
}
