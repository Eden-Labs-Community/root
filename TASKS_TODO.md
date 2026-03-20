# Eden Core — P2P Transport Tasks

> TDD obrigatório: Red → Green → Refactor. Nenhuma linha de produção sem teste falhando.
> Branch: `feat/p2p-transport`

---

## Fase 1 — Transport Abstraction

### TASK-001 — Criar interface `EdenTransport`
**Status:** `[x] done`

Criar `src/transports/transport.ts` com a interface genérica que todos os transportes implementam.

**Success criteria:**
- [x] Interface `EdenTransport` com `send`, `bind`, `close` exportada
- [x] Interface `Endpoint` com `host: string` e `port: number` exportada
- [x] Arquivo compila sem erros TypeScript

---

### TASK-002 — Migrar `UdpSocketImpl` para `UdpTransport`
**Status:** `[x] done`

Mover `src/socket/socket.ts` para `src/transports/udp/udp-transport.ts` implementando `EdenTransport`.

**Success criteria:**
- [x] `UdpTransport` implementa `EdenTransport`
- [x] Todos os testes existentes de socket passam
- [x] `src/socket/socket.ts` re-exporta `UdpTransport` para não quebrar imports existentes
- [x] `Eden` aceita `EdenTransport` opcional no construtor via factory `transport?`

---

## Fase 2 — STUN Client

### TASK-003 — Construtor de mensagem STUN (`stun-message.ts`)
**Status:** `[x] done`

Implementar build/parse do protocolo STUN (RFC 5389) do zero, sem bibliotecas externas.

**Success criteria:**
- [x] `buildBindingRequest()` → `Buffer` de 20 bytes com header correto
- [x] Magic Cookie `0x2112A442` presente nos bytes 4-7
- [x] Transaction ID de 12 bytes aleatórios nos bytes 8-19
- [x] `parseBindingResponse(buf)` → `{ ip: string, port: number }` ou `null`
- [x] Extrai atributo `XOR-MAPPED-ADDRESS` (type `0x0020`) corretamente
- [x] Desfaz XOR do port (top 16 bits do magic cookie)
- [x] Desfaz XOR do IP (magic cookie completo)
- [x] 12 testes unitários puros (sem I/O, sem rede)

---

### TASK-004 — STUN Client (`stun-client.ts`)
**Status:** `[x] done`

Implementar cliente que descobre o endpoint público via servidor STUN.

**Success criteria:**
- [x] `StunClient.discover()` → `Promise<Endpoint>` retorna IP:porta públicos
- [x] Timeout configurável (default 3000ms)
- [x] Tenta múltiplos servidores STUN em paralelo, usa o primeiro que responder
- [x] Lança `EdenStunTimeoutError` se nenhum servidor responder
- [x] Não resolve duas vezes se múltiplos servidores respondem
- [x] 4 testes unitários com socket fake (mock de dgram)
- [x] Teste de integração real com `stun.l.google.com:19302` (`npm run test:integration`)

---

## Fase 3 — Signaling

### TASK-005 — Signaling Client (`signaling-client.ts`)
**Status:** `[ ] next`

Troca de endpoints entre dois peers via servidor de sinalização leve.
O signaling server é um Eden node com IP público — não toca nos dados, só coordena a descoberta inicial.

**Success criteria:**
- [ ] `SignalingClient.register(peerId, endpoint)` → registra peer no servidor
- [ ] `SignalingClient.requestConnect(myId, targetId)` → retorna `Endpoint` do peer
- [ ] Protocolo sobre WebSocket (JSON simples)
- [ ] Timeout configurável (default 5000ms)
- [ ] Lança `EdenSignalingError` se peer não encontrado ou timeout
- [ ] Testes com servidor WebSocket fake in-process

---

## Fase 4 — Hole Punching

### TASK-006 — Hole Puncher (`hole-puncher.ts`)
**Status:** `[ ] pending`

Coordena o envio simultâneo de pacotes UDP para abrir o NAT dos dois lados.
Ambos os peers enviam ao mesmo tempo (via timestamp do signaling), criando entradas NAT simétricas.

**Success criteria:**
- [ ] `HolePuncher.punch(localSocket, remoteEndpoint)` → `Promise<boolean>`
- [ ] Envia pacotes probe periódicos enquanto aguarda resposta do peer
- [ ] Retorna `true` quando recebe probe do outro lado (buraco aberto)
- [ ] Retorna `false` (não lança) quando timeout — caller decide usar relay
- [ ] Timeout configurável (default 5000ms)
- [ ] Intervalo de probe configurável (default 150ms)
- [ ] Testes unitários com socket fake
- [ ] Teste de integração loopback (dois peers no mesmo host)

---

## Fase 5 — Relay Fallback

### TASK-007 — Relay Client (`relay-client.ts`)
**Status:** `[ ] pending`

Proxy transparente via Eden node com IP público quando hole punching falha (~15% dos casos de NAT simétrico estrito).

**Success criteria:**
- [ ] `RelayClient` implementa `EdenTransport`
- [ ] `send(msg)` → encaminha para relay node com `targetPeerId` no header
- [ ] `bind(port, onMessage)` → recebe mensagens roteiadas pelo relay
- [ ] Relay node roteia por `peerId`, não inspeciona payload
- [ ] Testes com relay fake in-process (dois clientes, um relay)

---

## Fase 6 — P2P Transport

### TASK-008 — `P2PTransport` orquestrador
**Status:** `[ ] pending`

Junta STUN + Signaling + HolePuncher + RelayClient em um único `EdenTransport`.

**Estratégia de conexão (ordem de tentativa):**
```
1. Direct UDP        → ambos na mesma rede, sem STUN
2. STUN + hole punch → redes diferentes, NAT cone
3. Relay             → NAT simétrico estrito / fallback
```

**Success criteria:**
- [ ] Implementa `EdenTransport` completamente
- [ ] `P2PTransport.connect(peerId, signalingUrl)` → `Promise<void>`
- [ ] Tenta direct → punch → relay em paralelo, usa o primeiro que responder (Happy Eyeballs)
- [ ] Reconexão automática com backoff exponencial
- [ ] `P2PTransport.disconnect(peerId)` → limpa todos os recursos
- [ ] Testes de integração com dois processos Node.js reais

---

## Fase 7 — Eden Integration

### TASK-009 — `Eden` aceita transporte plugável
**Status:** `[x] done` *(parcial — factory injetável, P2PTransport ainda não existe)*

**Success criteria:**
- [x] `new Eden({ port, transport? })` — transport opcional, default `UdpTransport`
- [ ] `new Eden({ port, transport: () => new P2PTransport(...) })` funciona após TASK-008
- [x] Todos os testes existentes (`eden.test.ts`, `e2e.test.ts`) ainda passam
- [ ] Novo teste: Eden com `P2PTransport` comunica com Eden com `UdpTransport`

---

## Fase 8 — Exports e Docs

### TASK-010 — Atualizar exports públicos
**Status:** `[ ] pending`

**Success criteria:**
- [ ] `src/index.ts` exporta `EdenTransport`, `Endpoint`, `UdpTransport`, `P2PTransport`
- [ ] `src/index.ts` exporta novos erros: `EdenStunTimeoutError`, `EdenSignalingError`
- [ ] `index.test.ts` atualizado com novos exports
- [ ] `docs/ARCHITECTURE.md` reflete o estado final

---

## Fase 9 — Performance

### TASK-011 — Benchmark comparativo
**Status:** `[ ] pending`

Validar que o P2PTransport compete com soluções de mercado (ENet, GameNetworkingSockets).

**Success criteria:**
- [ ] Benchmark: throughput msg/s com `UdpTransport` (baseline)
- [ ] Benchmark: throughput com `P2PTransport` após conexão estabelecida
- [ ] Latência p50, p95, p99 documentada
- [ ] Overhead pós-conexão vs UDP puro < 10% em condições normais

---

## Progresso

| Task | Descrição | Status |
|------|-----------|--------|
| TASK-001 | Interface `EdenTransport` | `[x] done` |
| TASK-002 | `UdpTransport` + migração | `[x] done` |
| TASK-003 | STUN message builder/parser (RFC 5389) | `[x] done` |
| TASK-004 | `StunClient` — discover endpoint público | `[x] done` |
| TASK-005 | Signaling client (WebSocket) | `[ ] next` |
| TASK-006 | Hole puncher | `[ ] pending` |
| TASK-007 | Relay client (fallback) | `[ ] pending` |
| TASK-008 | `P2PTransport` orquestrador | `[ ] pending` |
| TASK-009 | Eden integration | `[~] partial` |
| TASK-010 | Exports públicos | `[ ] pending` |
| TASK-011 | Benchmark | `[ ] pending` |

**Testes:** 65 passando / 0 falhando
