# 数据模型与接口契约写法

`architect-tech-spec` 第 6、7 章的展开。写到「能直接建表、能直接写 handler」再停。

## 一、字段必须写全五件事

| 项 | 不写会怎样 | 写法 |
|---|---|---|
| 类型 | 迁移脚本写不出 | `bigint` / `text` / `timestamptz` / `jsonb` |
| 可空 | 存量数据插入失败 | `not null` 或 `null` |
| 默认值 | 老代码写入报错 | `default 0` / `default now()` / `default '{}'::jsonb` |
| 含义 | 半年后没人知道 | 一句话，含单位 |
| 取值范围 | 脏数据进库 | 枚举值或 `check` 约束 |

## 二、DDL 样例

```sql
-- migrations/0012_export_job.sql
create table export_job (
  id          bigserial primary key,
  user_id     bigint      not null,
  status      text        not null default 'pending'
              check (status in ('pending','running','done','failed')),
  filter      jsonb       not null default '{}'::jsonb,
  row_count   integer     null,
  file_key    text        null,
  error_code  text        null,
  created_at  timestamptz not null default now(),
  finished_at timestamptz null
);
create index export_job_user_created_idx on export_job (user_id, created_at desc);
create index export_job_active_idx on export_job (status)
  where status in ('pending','running');
```

回滚：

```sql
-- 0012_export_job.down.sql
drop table if exists export_job;
```

## 三、索引与迁移规则

- 索引必须对上一条真实查询（`where` + `order by` 的列序），写清「支撑哪条 SQL」。
- 大表加索引写并发建索引（`create index concurrently`），并说明耗时预估与锁影响。
- 新增非空字段三步走：加可空字段 → 回填 → 加 `not null`；每一步都能单独回滚。
- 改字段类型必须写「旧值怎么转换 + 转换失败怎么办」。
- 删字段不进本期；先停写，下一个版本再删。

## 四、接口表固定列

| 列 | 必须写 |
|---|---|
| 方法 + 路径 | `POST /api/exports` |
| 鉴权 | 谁能调、用什么凭证 |
| 幂等 | 幂等键字段名 + 有效期；没有就写「不幂等 + 为什么可接受」 |
| 限流 | 次数/时间窗/维度 |
| 请求字段 | 名称、类型、必填、约束 |
| 响应字段 | 状态码 + 字段 + 含义 |
| 错误码 | HTTP 状态 + 业务码 + 触发条件 |

## 五、错误码约定

格式：`<HTTP> <DOMAIN>_<REASON>`，业务码全大写下划线。

| HTTP | 业务码 | 触发条件 |
|---|---|---|
| 400 | VALIDATION_FAILED | 字段缺失或越界 |
| 401 | UNAUTHENTICATED | 无有效会话 |
| 403 | EXPORT_FORBIDDEN | 无权访问该资源 |
| 404 | EXPORT_NOT_FOUND | 资源不存在或已过期 |
| 409 | EXPORT_CONFLICT | 幂等键冲突且原任务未完成 |
| 413 | EXPORT_TOO_LARGE | 行数超过上限 |
| 429 | EXPORT_RATE_LIMITED | 超过限流阈值 |
| 500 | EXPORT_FAILED | 未预期异常，带 trace_id |

规则：

- 一个错误码只对应一个触发条件。
- 用户能自行修正的错误用 4xx；需要运维介入的用 5xx。
- 响应体带 `trace_id`，与日志字段同名。

## 六、幂等与并发

- 创建类接口：客户端传 `Idempotency-Key`，服务端存 `(key, user_id)` 唯一索引，命中返回同一结果。
- 状态流转：用 `update ... where status = 'pending'` 的 CAS，受影响行数为 0 说明已被处理，直接返回。
- 列表接口：用游标（`after_id`）而不是 `offset`；写清每页上限与默认值。
- 分布式锁：写清键名、过期时间、续期方式；没有就不写。

## 七、反例

| 写法 | 问题 |
|---|---|
| `status text` | 没默认值、没取值范围 |
| 「返回相应错误」 | 没有状态码与业务码 |
| `create index on orders(user_id)` | 没说支撑哪条查询，可能白建 |
| 「接口做幂等处理」 | 没有幂等键与存储位置 |
| 「分页查询」 | 没有页码/游标、上限、默认值 |
