/**
 * `dsh-agent-cto` 包入口：导出 Cordis 插件三要素与 `cto` 领域数据。
 *
 * `package.json` 的 `exports["."]` 指向本文件的编译产物
 * （`dist-server/index.js`）。
 */
export { name, apply, inject } from './plugin.js'
export { CTO_DOMAIN, type CTODomain, type CTOSkill } from './domain.js'
export { CTO_PERSONA } from './persona.js'
