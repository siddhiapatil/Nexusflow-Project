# Telemetry data format

## Wire format (sensor -> API / WebSocket)
```json
{
  "deviceId": "dev-0001",
  "sensorType": "temperature",
  "value": 24.7,
  "unit": "C",
  "site": "site-1",
  "timestamp": 1767000000000,
  "quality": "good"
}
```
| Field | Type | Required | Notes |
|---|---|---|---|
| deviceId | string (1-64) | yes | Part of `metadata` (bucketing key) |
| sensorType | string (1-32) | yes | Part of `metadata` |
| value | finite number | yes | The measurement |
| unit | string (<=16) | no | Stored in `metadata` |
| site | string (<=64) | no | Stored in `metadata` |
| timestamp | ISO-8601 string or epoch ms | no | Defaults to server receive time |
| quality | good / uncertain / bad | no | Defaults to `good` |

Send a single object or an array (max 5,000 per HTTP request).

## Stored measurement (MongoDB time-series)
```json
{ "timestamp": ISODate, "metadata": { "deviceId", "sensorType", "unit", "site" }, "value": 24.7, "quality": "good" }
```
- `timeField`: `timestamp`, `metaField`: `metadata`, `granularity`: `seconds`
- Only slow-changing identity goes in `metadata`; per-reading data stays top-level so buckets stay compact.
- Index: `{ metadata.deviceId: 1, metadata.sensorType: 1, timestamp: -1 }`
- Optional retention: set `RETENTION_SECONDS` (TTL on the time-series collection).

## Rule-engine input (`GET /api/telemetry/rule-input`)
```json
{ "generatedAt": "...", "readings": [ { "deviceId", "sensorType", "value", "unit", "quality", "timestamp" } ] }
```
Use `GET /api/telemetry?deviceId=&sensorType=&from=&to=` for windowed rules (avg/max over N seconds).
