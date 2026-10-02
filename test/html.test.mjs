import test from 'node:test'
import assert from 'node:assert/strict'
import { groupRelatedObservations, projectTypedValues, visibleSurfaceText } from '@hathq/sem-lang-structured-surface'
import { parseHtmlSurface } from '../src/index.mjs'

test('HTML tables preserve item boundaries and safe reference evidence', () => {
  const html = '<p>Seasonal item details</p><table><tr><td><a href="https://shop.test/a?tracking=secret"><img alt="Alpha"></a><b>¥1,200</b></td></tr>'
    + '<tr><td><a href="https://shop.test/b">Beta</a><b>2,500円</b></td></tr></table>'
  const surface = projectTypedValues(parseHtmlSurface({ source: html, sourceRef: 'mail:1' }))
  const groups = groupRelatedObservations(surface)
  assert.equal(groups.groups.length, 2)
  assert.deepEqual(surface.nodes.filter(node => node.kind === 'reference').map(node => node.value), [
    'https://shop.test/a', 'https://shop.test/b'
  ])
  assert.equal(visibleSurfaceText(surface).includes('Seasonal item details'), true)
  assert.equal(visibleSurfaceText(surface).includes('Alpha'), false)
  assert.equal(visibleSurfaceText(surface).includes('Beta'), false)
  assert.deepEqual(surface.nodes.filter(node => node.traits.includes('reference-label')).map(node => node.value), ['Alpha', 'Beta'])
  assert.equal(JSON.stringify(surface).includes('tracking=secret'), false)
})

test('multiple links in the same scope stay unresolved and executable content is absent', () => {
  const html = '<script>private()</script><section><a href="https://shop.test/a">A</a><a href="https://shop.test/b">B</a><span>¥1,200</span></section>'
  const surface = projectTypedValues(parseHtmlSurface({ source: html, sourceRef: 'mail:2' }))
  const groups = groupRelatedObservations(surface)
  assert.equal(groups.groups.length, 0)
  assert.equal(groups.ungroupedReferences.length, 2)
  assert.equal(groups.ungroupedValues.length, 1)
  assert.equal(visibleSurfaceText(surface).includes('private'), false)
})

test('link labels are classified structurally without phrase-specific rules', () => {
  const surface = parseHtmlSurface({
    source: '<p>Primary explanation <a href="https://example.test/details?tracking=1">詳しくはこちら</a></p>',
    sourceRef: 'mail:label'
  })
  assert.equal(visibleSurfaceText(surface), 'Primary explanation')
  assert.equal(surface.nodes.find(node => node.kind === 'reference')?.value, 'https://example.test/details')
  assert.equal(surface.nodes.find(node => node.value === '詳しくはこちら')?.traits.includes('reference-label'), true)
  const label = surface.nodes.find(node => node.value === '詳しくはこちら')
  const reference = surface.nodes.find(node => node.kind === 'reference')
  assert.equal(surface.relations.some(relation => relation.kind === 'labels' && relation.source === label?.id && relation.target === reference?.id), true)
})

test('only explicit item metadata exposes a declared name for a reference group', () => {
  const source = '<article itemscope itemtype="https://schema.org/Product"><span itemprop="name">Alpha</span><a itemprop="url" href="https://shop.test/a">Open</a><span>¥1,200</span></article>'
  const surface = projectTypedValues(parseHtmlSurface({ source, sourceRef: 'mail:item' }))
  const [group] = groupRelatedObservations(surface).groups
  assert.deepEqual(group.declaredNames.map(id => surface.nodes.find(node => node.id === id)?.value), ['Alpha'])
  assert.deepEqual(group.labels.map(id => surface.nodes.find(node => node.id === id)?.value), ['Open'])
})

test('input and node growth are bounded', () => {
  const html = '<div>x</div>'.repeat(5000)
  const surface = parseHtmlSurface({ source: html, sourceRef: 'mail:3' })
  assert.ok(surface.nodes.length <= 4096)
  assert.equal(surface.truncated, true)
})
