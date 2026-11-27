// MY LIVE STUDIO — Cloudflare Worker event relay
// This relay accepts events from an authorized TikTok event provider or your own trusted adapter.
// It does NOT log into TikTok, scrape sessions, or bypass platform restrictions.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Room-Token",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const json = (data, status=200) => new Response(JSON.stringify(data), {
      status, headers: { ...cors, "Content-Type": "application/json" }
    });
    if (url.pathname === "/api/health") return json({ ok:true, service:"MY LIVE STUDIO", version:"1.0.0" });

    const match = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)(\/events|\/ws)?$/);
    if (!match) return json({ error:"Not found" },404);
    const roomId = match[1];
    const id = env.ROOMS.idFromName(roomId);
    const stub = env.ROOMS.get(id);

    if (match[2] === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") return json({error:"WebSocket upgrade required"},426);
      return stub.fetch("https://room.internal/ws", request);
    }
    if (match[2] === "/events") {
      if (request.method !== "POST") return json({error:"POST required"},405);
      const token = request.headers.get("X-Room-Token");
      if (!token || token !== env.INGEST_TOKEN) return json({error:"Unauthorized event source"},401);
      const body = await request.json().catch(()=>null);
      if (!body || !["comment","like","gift","follow","share"].includes(body.type) || typeof body.user !== "string") {
        return json({error:"Invalid event payload"},400);
      }
      return stub.fetch("https://room.internal/event", {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
          type:body.type, user:body.user.slice(0,60), detail:String(body.detail||body.type).slice(0,180), at:Date.now()
        })
      });
    }
    return stub.fetch("https://room.internal/state");
  }
};

export class Room {
  constructor(state, env) { this.state=state; this.env=env; this.sockets=new Set(); }
  async fetch(request) {
    const url=new URL(request.url);
    if(url.pathname==="/ws") {
      const pair=new WebSocketPair(); const client=pair[0], server=pair[1];
      server.accept(); this.sockets.add(server);
      server.send(JSON.stringify({type:"connected",room:"MY LIVE STUDIO"}));
      server.addEventListener("close",()=>this.sockets.delete(server));
      server.addEventListener("error",()=>this.sockets.delete(server));
      return new Response(null,{status:101,webSocket:client});
    }
    if(url.pathname==="/event" && request.method==="POST") {
      const event=await request.json();
      await this.state.storage.put("lastEvent",event);
      const msg=JSON.stringify({type:"event",event});
      for(const ws of this.sockets){try{ws.send(msg)}catch(e){this.sockets.delete(ws)}}
      return Response.json({ok:true,delivered:this.sockets.size});
    }
    if(url.pathname==="/state") return Response.json({ok:true,lastEvent:await this.state.storage.get("lastEvent")||null,connected:this.sockets.size});
    return new Response("Not found",{status:404});
  }
}
