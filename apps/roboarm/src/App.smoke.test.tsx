import { describe, expect, it } from 'vitest'

import App from './App'

describe('roboarm smoke', () => {
  it('exports an app component', () => {
    expect(App).toBeTypeOf('function')
  })
})