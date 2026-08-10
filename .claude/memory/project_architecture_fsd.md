---
name: project-architecture-fsd
description: Проект использует методологию Feature-Sliced Design (FSD) для организации кода
metadata: 
  node_type: memory
  type: project
  originSessionId: 9d639b31-4840-4143-9596-1f3e2a0cd37a
  modified: 2026-08-08T18:50:38.650Z
---

Проект (expense-tracker) следует методологии Feature-Sliced Design (FSD) для организации структуры кода.

**Why:** явное указание пользователя.

**How to apply:** при создании/реорганизации директорий и модулей (особенно в `apps/frontend`, но применимо и к другим частям монорепозитория) придерживаться слоёв и правил FSD (app, processes, pages, widgets, features, entities, shared) вместо произвольной структуры. При ревью или рефакторинге кода проверять соответствие импортов иерархии слоёв FSD (нижние слои не должны знать о верхних).
