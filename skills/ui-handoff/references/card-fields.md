# dev 卡必填字段

```md
## 卡片字段
- design_ref: <commit sha>
- 涉及屏: <screen-1>, <screen-2>
- 必须覆盖的状态:
  - <screen-1>: default / empty / loading / error
  - <screen-2>: default / long-list
- 验收方式: 对照 refs/<screen>__<viewport>__light__<state>.png
- 关键约束: 不新增 token；不出现 hex / px 字面量
```

缺 `design_ref` 或缺状态清单的卡，不允许开工。
