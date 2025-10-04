## Reports Catalog

This document lists available reports and their parameters for the dynamic reports API.

Base endpoint: POST /reports/run (Authorization: Bearer <access_token>)

Request body shape:
```json
{
  "report_name": "...",
  "parameters": { "param": "value", "...": "..." }
}
```

### 1) roles_by_position
- Procedure: sp_roles_by_position
- Parameters (order matters):
  - p_position (string, mandatory)

Example request:
```json
{
  "report_name": "roles_by_position",
  "parameters": { "p_position": "waiter" }
}
```

### 2) unswiped_roles_nearby
- Procedure: sp_unswiped_roles_nearby
- Parameters (order matters):
  - p_user_id (number, mandatory)
  - p_lat (number, mandatory)
  - p_lng (number, mandatory)
  - p_distance_km (number, optional; null or <= 0 to return all distances)

Example request:
```json
{
  "report_name": "unswiped_roles_nearby",
  "parameters": {
    "p_user_id": 123,
    "p_lat": 32.0853,
    "p_lng": 34.7818,
    "p_distance_km": 10
  }
}
```


