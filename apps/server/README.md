# geofarm — the server

The door (RFC-0012), the intelligence's engine (RFC-0010 §0), and the live
sources (RFC-0011), on one port, in front of the PostgreSQL journal
(RFC-0013 §2) — with the shell served beside them, so one URL is the farm.

## Run it

```sh
createdb geofarm                                   # once, on a local PostgreSQL
GEOFARM_PG_URL=postgres://localhost/geofarm bun run server
# → http://localhost:4790  (the shell finds the server and opens the live world)
```

An empty journal is seeded with Miller Farm — the same cast and history the
device-only demo uses — plus the three engaged sources. From then on the
journal is the only memory: restart the server, nothing is lost.

## Free providers, until production

| Concern | Provider | Needs |
|---|---|---|
| Journal | PostgreSQL (local, or any free hosted Postgres) | `GEOFARM_PG_URL` |
| Engine | [Ollama](https://ollama.com) on this machine (`ollama pull llama3.2:3b`) | nothing; picked automatically when it is up |
| Engine, production | Claude through the Anthropic SDK | `ANTHROPIC_API_KEY`, or `GEOFARM_ENGINE=anthropic` |
| Weather | National Weather Service (api.weather.gov) | `NWS_USER_AGENT` naming you (they ask) |
| Weather archive | Open-Meteo (ERA5 reanalysis) | nothing |
| Imagery | Earth Search — Sentinel-2 L2A on AWS | nothing |

Unset `GEOFARM_PG_URL` and the server runs in memory, for a look.
`GEOFARM_SOURCES=off` leaves the live sources alone. `GEOFARM_ENGINE`
forces `ollama`, `anthropic`, or `rules`.

## The API

Three routes are the door (`packages/boundary/http.ts`): `POST /api/walk`,
`POST /api/append`, `POST /api/project` — each body names the Actor it speaks
as. Beside them: `GET /api/world` (who is here, what "now" is, which engine
answers), `POST /api/engine` (the reasoner over a wire), `GET /api/health`.

**Not yet: authentication.** The server trusts the Actor a caller names,
behind one optional shared token (`GEOFARM_API_TOKEN`, sent as
`Authorization: Bearer …`). Fine on a laptop or a private network; not on
the internet. An identity layer in front of the door is the first job
before going live.

## The sources' cadence

On boot: the weather station's last week and the next two days' forecast;
five years of daily archive estimates; five years of clear satellite
passes; then the assistant's anomaly read over the last two dozen passes.
Thereafter: observations hourly, forecast and recent imagery daily, the
anomaly read weekly. A pull repeated admits only what the world does not
already hold.

## Reading the instruments over a lived log

```sh
GEOFARM_PG_URL=… bun run instruments:live
```
