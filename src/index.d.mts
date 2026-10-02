import type { StructuredSurface } from '@hathq/sem-lang-structured-surface'

export interface HtmlSurfaceInput {
  source: string
  sourceRef: string
  sourceRevision?: string | null
  mediaType?: 'text/html'
}
export function parseHtmlSurface(input: HtmlSurfaceInput): StructuredSurface
