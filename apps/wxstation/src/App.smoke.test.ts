import { describe, expect, it } from 'vitest'

import App from './App.vue'

describe('wxstation smoke', () => {
  it('exports a vue component', () => {
    expect(App).toBeTruthy()
  })
})