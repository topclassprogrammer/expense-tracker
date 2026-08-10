---
name: project-data-fetching-tanstack-query
description: Фронтенд использует @tanstack/react-query для получения данных с API
metadata:
  type: project
---

Проект (apps/frontend) использует TanStack Query (`@tanstack/react-query`) для получения данных с backend API.

**Why:** явное указание пользователя.

**How to apply:** при добавлении или изменении логики получения/мутации данных с API на фронтенде использовать хуки TanStack Query (`useQuery`, `useMutation` и т.п.), а не самописный fetch/useEffect или другие библиотеки. Согласуется с [[project-architecture-fsd]] — запросы обычно инкапсулируются в соответствующих слоях (entities/features), а не размещаются напрямую в компонентах страниц.
