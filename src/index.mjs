import { parseFragment } from 'parse5'
import { STRUCTURED_SURFACE_LIMITS, createStructuredSurface, normalizeHttpReference } from '@hathq/sem-lang-structured-surface'

const IGNORED = new Set(['script', 'style', 'template'])
const GROUPING = new Set(['article', 'li', 'tr', 'td', 'section', 'div', 'p'])
const STRUCTURAL_ATTRIBUTES = new Set(['itemprop', 'itemtype', 'itemscope', 'role', 'aria-label'])
const MAX_DEPTH = 64
const MAX_ATTRIBUTES = 32

function cleanText(value) { return String(value ?? '').replace(/\s+/gu, ' ').trim() }
function location(node) {
  const value = node.sourceCodeLocation
  return value && Number.isSafeInteger(value.startOffset) && Number.isSafeInteger(value.endOffset)
    ? { start: value.startOffset, end: value.endOffset } : undefined
}
function attribute(node, name) { return node.attrs?.find(item => item.name.toLocaleLowerCase() === name)?.value ?? null }
export function parseHtmlSurface(input) {
  if (!input || typeof input.source !== 'string' || typeof input.sourceRef !== 'string' || !input.sourceRef.trim()) {
    throw new TypeError('html-surface-invalid-input')
  }
  const bounded = input.source.slice(0, STRUCTURED_SURFACE_LIMITS.inputCharacters)
  let truncated = bounded.length !== input.source.length
  const root = parseFragment(bounded, { sourceCodeLocationInfo: true })
  const nodes = [{ id: 'document', kind: 'document', formatName: 'html-fragment', traits: [], attributes: {}, span: { start: 0, end: bounded.length } }]
  const relations = []
  let sequence = 0

  const add = (node, parent, kind, formatName, options = {}) => {
    if (nodes.length >= STRUCTURED_SURFACE_LIMITS.nodes || relations.length >= STRUCTURED_SURFACE_LIMITS.relations) { truncated = true; return null }
    const id = `html-${sequence++}`
    nodes.push({ id, kind, formatName, traits: options.traits ?? [], attributes: options.attributes ?? {},
      ...(options.value !== undefined ? { value: options.value } : {}),
      ...(options.valueType ? { valueType: options.valueType } : {}),
      ...(options.label ? { label: options.label } : {}),
      ...(options.span ? { span: options.span } : {}) })
    relations.push({ source: parent, target: id, kind: 'contains' })
    return id
  }

  const walkChildren = (children, parent, depth, inheritedTraits = []) => {
    if (depth > MAX_DEPTH) { truncated = true; return }
    let previous = null
    for (const child of children ?? []) {
      if (nodes.length >= STRUCTURED_SURFACE_LIMITS.nodes) { truncated = true; break }
      let id = null
      if (child.nodeName === '#text') {
        const value = cleanText(child.value)
        if (value) id = add(child, parent, 'text', 'text', { value, valueType: 'text', traits: inheritedTraits, span: location(child) })
      } else if (child.tagName && !IGNORED.has(child.tagName.toLocaleLowerCase())) {
        const tag = child.tagName.toLocaleLowerCase()
        const attributes = {}
        for (const item of (child.attrs ?? []).slice(0, MAX_ATTRIBUTES)) {
          const name = item.name.toLocaleLowerCase()
          if (STRUCTURAL_ATTRIBUTES.has(name)) attributes[name] = String(item.value).slice(0, 512)
        }
        const traits = []
        if (GROUPING.has(tag) || Object.hasOwn(attributes, 'itemscope')) traits.push('grouping-scope')
        if (Object.hasOwn(attributes, 'itemscope')) traits.push('declared-item-scope')
        id = add(child, parent, 'element', tag, { attributes, traits, span: location(child) })
        if (id) {
          const subtreeStart = nodes.length
          const itemProperties = String(attributes.itemprop ?? '').split(/\s+/u).filter(Boolean)
          const childTraits = [...new Set([
            ...inheritedTraits,
            ...(tag === 'a' ? ['reference-label'] : []),
            ...(itemProperties.includes('name') ? ['declared-name'] : [])
          ])]
          if (tag === 'img') {
            const alt = cleanText(attribute(child, 'alt'))
            if (alt) add(child, id, 'text', 'alternative-text', { value: alt, valueType: 'text', traits: [...new Set([...childTraits, 'alternative-text'])], span: location(child) })
          }
          walkChildren(child.childNodes, id, depth + 1, childTraits)
          if (tag === 'a') {
            const reference = normalizeHttpReference(attribute(child, 'href') ?? '')
            if (reference) {
              const referenceId = add(child, id, 'reference', 'link', { value: reference, valueType: 'url', span: location(child) })
              if (referenceId && relations.length < STRUCTURED_SURFACE_LIMITS.relations) {
                relations.push({ source: id, target: referenceId, kind: 'references' })
                const labelIds = nodes.slice(subtreeStart)
                  .filter(node => node.kind === 'text' && node.traits.includes('reference-label'))
                  .map(node => node.id)
                for (const labelId of labelIds) {
                  if (relations.length >= STRUCTURED_SURFACE_LIMITS.relations) { truncated = true; break }
                  relations.push({ source: labelId, target: referenceId, kind: 'labels' })
                }
              }
            }
          }
        }
      }
      if (id && previous && relations.length < STRUCTURED_SURFACE_LIMITS.relations) relations.push({ source: previous, target: id, kind: 'follows' })
      if (id) previous = id
    }
  }
  walkChildren(root.childNodes, 'document', 0)
  return createStructuredSurface({
    source: { reference: input.sourceRef.trim(), revision: input.sourceRevision?.trim() || null, mediaType: 'text/html' },
    parser: { artifact: '@hathq/sem-lang-surface-html', version: '0.10.0', standard: 'WHATWG HTML via parse5@8.0.1' },
    nodes, relations, truncated
  })
}
