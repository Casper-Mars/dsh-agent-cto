import { describe, expect, it } from 'vitest'
// @ts-expect-error .mjs 脚本没有类型声明
import { REQUIRED_STATES, VIEWPORTS, shotName } from '../design-kit/scripts/screenshot.mjs'

describe('design-kit 截图计划', () => {
  it('三档视口尺寸符合方案', () => {
    expect(VIEWPORTS.desktop).toMatchObject({ width: 1440, height: 900 })
    expect(VIEWPORTS.tablet).toMatchObject({ width: 1024, height: 768 })
    expect(VIEWPORTS.mobile).toMatchObject({ width: 390, height: 844 })
  })

  it('必做状态为四个', () => {
    expect(REQUIRED_STATES).toEqual(['default', 'empty', 'loading', 'error'])
  })

  it('文件名符合 <screen>__<viewport>__<theme>__<state>.png', () => {
    expect(shotName('device-list', 'desktop', 'light', 'empty')).toBe(
      'device-list__desktop__light__empty.png',
    )
  })
})
