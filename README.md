# MY LIVE STUDIO — V1 foundation

## Included
- `index.html`: responsive dashboard, game library, local multi-room profiles, event simulator and overlay preview.
- `worker.js`: Cloudflare Worker + Durable Object WebSocket event relay.
- `wrangler.toml`: Durable Object deployment configuration.

## Run locally
Open `index.html` in a modern browser. The dashboard runs in local demo mode. Demo events are simulated and do not connect to TikTok.

## Deploy the event relay
1. Install Node.js and Wrangler: `npm install -g wrangler`
2. Log in: `npx wrangler login`
3. Set a long random ingest token: `npx wrangler secret put INGEST_TOKEN`
4. Deploy: `npx wrangler deploy`
5. Test: `https://YOUR-WORKER.workers.dev/api/health`

## Event adapter contract
An authorized event provider or trusted adapter can POST to:
`https://YOUR-WORKER.workers.dev/api/rooms/ROOM_ID/events`

Headers:
- `Content-Type: application/json`
- `X-Room-Token: YOUR_INGEST_TOKEN`

Body example:
`{"type":"comment","user":"viewer_name","detail":"join"}`

Allowed event types: `comment`, `like`, `gift`, `follow`, `share`.

WebSocket:
`wss://YOUR-WORKER.workers.dev/api/rooms/ROOM_ID/ws`

## Important integration boundary
This starter does not directly authenticate to TikTok or scrape private session cookies. TikTok LIVE event access must come from an authorized integration/provider and must comply with TikTok's current developer terms and account eligibility requirements. Do not paste TikTok passwords, cookies, or private session tokens into this app.

## Current V1 scope
The game scenes and event simulator are functional UI foundations. The room profiles are stored locally in the browser. Real multi-LIVE ingestion, persistent user accounts, cloud room synchronization, and production game mechanics require wiring an authorized TikTok event adapter into the Worker relay and subscribing each room to its own event stream.
