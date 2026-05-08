# ac-audit-log

a custom audit log


Audit evidence must be produced on the server side.
The Admin UI must never infer actors, recompute diffs, or mutate audit facts.
The Admin UI may only render persisted audit log fields

審計證據必須由後端產生。
Admin UI 不得推斷操作人，不得重新計算 diff，不得修改審計事實。
Admin UI 只能顯示已持久化的 audit log 欄位。
