# 完整样例：订单导出

演示「可落地」的颗粒度。真实方案照此替换内容，不要照抄结论。

---

# 订单导出 技术方案 v0.1

- 状态：已评审
- 输入：PRD `docs/prd/order-export-v1.md@a1b2c3d`；代码 `order-svc@9f8e7d6`

## 1 结论

新增异步导出：`POST` 创建任务，worker 生成 CSV 存对象存储，前端轮询状态。
改动 3 个模块、新增 1 张表与 2 个接口。
最大风险：订单表按 `created_at` 范围扫描拖慢线上查询（§12 R1）。

## 2 目标与非目标

目标：运营在后台导出筛选后的订单，1 万行 P95 < 30 秒（PRD AC2）。

非目标：

- 不支持 XLSX（本期只做 CSV，转换成本高于收益）。
- 不做定时/订阅导出（无需求证据）。
- 不做跨租户导出（权限模型未就绪）。

## 3 AC 覆盖表

| AC | 原文 | 模块 | 接口 | 数据 | 验证方式 |
|---|---|---|---|---|---|
| AC1 | 未登录点击导出展示登录引导，不触发下载 | `web/src/export` | 无（前端守卫） | 无 | 未登录点击，网络面板无 `/api/exports` 请求 |
| AC2 | 1 万行导出 P95 < 30 秒 | `export-worker` | `POST /api/exports`、`GET /api/exports/{id}` | `export_job` | `k6 run scripts/export.js`，取 P95 |
| AC3 | 超过 10 万行拒绝并提示 | `export-api` | `POST /api/exports` → 413 | `export_job` 不写入 | `curl` 构造 100001 行，断言 413 且表无新行 |

## 4 现状与改动点

| 文件 / 模块 | 现状 | 改成什么 | 影响面 |
|---|---|---|---|
| `src/order/exporter.ts` | 同步导出，2 万行超时 | 改为创建异步任务 | 运营后台导出入口 |
| `src/api/order.ts` | 无导出接口 | 新增 2 个路由 | 网关路由表 |
| `migrations/` | 无导出表 | 新增 `0012_export_job.sql` | 数据库迁移 |

本次不改：订单查询 SQL、权限中间件、前端订单列表。

## 5 总体设计

```text
web --POST/GET--> export-api --写/读--> export_job(DB)
                      |
                      +--发消息--> queue --> export-worker --写--> OSS
```

| 组件 | 职责 | 同步/异步 | 失败后的行为 |
|---|---|---|---|
| export-api | 鉴权、计数、建任务、查状态 | 同步 | 4xx/5xx，不写半条数据 |
| export-worker | 拉数据、生成 CSV、上传 | 异步 | 重试 3 次后置 failed |

## 6 数据模型

### export_job

用途：worker 读写，用户只读自己的任务；保留 30 天。

| 字段 | 类型 | 可空 | 默认 | 说明 |
|---|---|---|---|---|
| id | bigserial | 否 | - | 主键 |
| user_id | bigint | 否 | - | 创建人 |
| status | text | 否 | `'pending'` | pending/running/done/failed |
| filter | jsonb | 否 | `'{}'` | 导出筛选条件 |
| row_count | integer | 是 | - | 命中行数 |
| file_key | text | 是 | - | 对象存储键 |
| error_code | text | 是 | - | 失败业务码 |
| created_at | timestamptz | 否 | `now()` | 创建时间 |
| finished_at | timestamptz | 是 | - | 结束时间 |

索引：`export_job_user_created_idx(user_id, created_at desc)` 支撑「我的导出列表」；
`export_job_active_idx(status) where status in ('pending','running')` 支撑 worker 拉取。
迁移：`0012_export_job.sql`；回滚：`drop table if exists export_job;`。无存量数据。

## 7 接口契约

### POST /api/exports

- 鉴权：session 必填
- 幂等：`Idempotency-Key` 头，24 小时内同 key 返回同一任务
- 限流：5 次/分钟/用户

请求：`filter`（对象，必填，字段同订单列表筛选）、`format`（枚举，默认 `csv`）。

响应：`202 {"job_id": 123, "status": "pending"}`。

| HTTP | 业务码 | 触发条件 |
|---|---|---|
| 401 | UNAUTHENTICATED | 无有效会话 |
| 403 | EXPORT_FORBIDDEN | 无导出权限 |
| 413 | EXPORT_TOO_LARGE | `row_count > 100000` |
| 429 | EXPORT_RATE_LIMITED | 超过 5 次/分钟 |
| 500 | EXPORT_CREATE_FAILED | 写库或发消息失败 |

### GET /api/exports/{id}

- 鉴权：session；只能读 `user_id` 为自己的任务
- 幂等：只读

响应：`200 {"id":123,"status":"done","row_count":10000,"download_url":"...","expires_at":"..."}`；
`404 EXPORT_NOT_FOUND`（不存在、已过期或非本人）。

## 8 关键流程

1. web → export-api：提交 filter；成功 202，失败返回上表错误码。
2. export-api：按 filter `count(*)`；`>100000` → 413，结束，不写表。
3. export-api：写 `export_job(pending)` → 发消息；消息发送失败则删行并返回 500。
4. export-worker：CAS `pending → running`；受影响行数 0 直接退出（重复消费）。
5. export-worker：每批 1000 行查询、写 CSV 临时文件；单批失败重试 3 次。
6. export-worker：上传 OSS，回写 `file_key` 与 `done`。
7. 任一步最终失败：`status=failed`，写 `error_code`，不无限重试。

| 场景 | 检测方式 | 处理 | 最终状态 |
|---|---|---|---|
| 队列重复投递 | CAS 受影响行数 0 | 直接退出 | 保持 running/done |
| worker 卡死 | 超过 10 分钟未更新 | 看门狗置 failed | failed / TIMEOUT |
| 用户重复点击 | Idempotency-Key 命中 | 返回原 job | 不变 |
| 部分批次失败 | 重试 3 次仍失败 | 删临时文件、置 failed | failed / GENERATE_FAILED |

## 9 部署与配置

新增依赖：无（复用现有队列与 OSS）。

| 环境变量 | 默认值 | 必填 | 作用 |
|---|---|---|---|
| EXPORT_MAX_ROWS | 100000 | 是 | 单次导出行数上限 |
| EXPORT_BATCH_SIZE | 1000 | 是 | 每批查询行数 |
| EXPORT_URL_TTL | 86400 | 是 | 下载链接有效期（秒） |

发布顺序：1) migration 2) export-api 3) export-worker 4) web。
灰度：按用户 10% 放量，观察 24 小时。
回滚：web → api → worker 回旧版本；migration **不自动 down**（停用入口即可，表保留）。

## 10 可观测性

- 日志字段：`export_job_id`、`user_id`、`status`、`row_count`、`error_code`、`duration_ms`。
- 指标：`export_job_total{status}`；`export_duration_seconds`（p50/p95）；`export_queue_depth`。
- 告警：failed 比例 > 5% 持续 10 分钟；队列深度 > 100 持续 5 分钟。

## 11 风险与未决

| 风险 | 触发信号 | 影响 | 缓解 | 回滚 |
|---|---|---|---|---|
| R1 大范围扫描拖慢线上 | 订单查询 P99 上升 > 20% | 前台变慢 | 强制时间范围 + 分批查询 | 关闭导出入口 |
| R2 OSS 文件泄漏 | 匿名访问返回 200 | 数据泄漏 | 私有桶 + 签名 URL | 撤销桶策略、轮换密钥 |

未决：

| 问题 | 谁定 | 何时 | 未定前默认动作 |
|---|---|---|---|
| 文件保留期是否 30 天 | 运营 | 上线前 | 先按 30 天 |
| 是否复用现有 bucket | 运维 | T1 前 | 复用现有私有桶 |
