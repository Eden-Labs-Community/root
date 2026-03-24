# Eden Core — Tasks

> TDD obrigatório: Red → Green → Refactor. Nenhuma linha de produção sem teste falhando.

---

## Fases completas (1-11)

<details>
<summary>TASK-001 a TASK-011 — Transport, STUN, Signaling, Hole Punch, Relay, P2P, Benchmark (todas done)</summary>

| Task | Descrição | Status |
|------|-----------|--------|
| TASK-001 | Interface `EdenTransport` | done |
| TASK-002 | `UdpTransport` + migração | done |
| TASK-003 | STUN message builder/parser (RFC 5389) | done |
| TASK-004 | `StunClient` — discover endpoint público | done |
| TASK-005 | Signaling client (WebSocket) | done |
| TASK-006 | Hole puncher | done |
| TASK-007 | Relay client (fallback) | done |
| TASK-008 | `P2PTransport` orquestrador | done |
| TASK-009 | Eden integration | done |
| TASK-010 | Exports públicos | done |
| TASK-011 | Benchmark | done |

</details>

---

## Fase 12 — MultiP2PTransport + MultiUdpTransport

### TASK-012 — `MultiUdpTransport` e `MultiP2PTransport`
**Status:** `[x] done`

Socket único para N peers com NAT traversal por peer.

---

## Fase 13 — Signaling Sentinel + Eleição

### TASK-013 — `SignalingSentinel`
**Status:** `[x] done`

Conexão persistente com signaling server + reconexão automática com exponential backoff.

### TASK-014 — `SentinelElection`
**Status:** `[x] done`

Eleição peer-to-peer: heartbeat, sucessão em cascata, split-brain resolution. Integrado no `MultiP2PTransport`.

---

## Fase 14 — Criptografia

> Referência completa: `CRIPTOGRAFIA.md`

### TASK-015 — `encrypt()` e `decrypt()` (`src/crypto/box.ts`)
**Status:** `[x] done`
**Branch:** `feat/crypto`

Primitivas de criptografia stateless com NaCl box (Curve25519 + XSalsa20 + Poly1305).

**Dependência:** `tweetnacl`

**Success criteria:**
- [x] `encrypt(buffer, theirPublicKey, mySecretKey)` → `Buffer` com `[ nonce (24 bytes) | ciphertext ]`
- [x] `decrypt(buffer, theirPublicKey, mySecretKey)` → `Buffer | null`
- [x] decrypt do resultado de encrypt retorna o buffer original
- [x] decrypt com chave errada retorna `null`
- [x] decrypt com buffer corrompido retorna `null`
- [x] decrypt com buffer < 24 bytes retorna `null`
- [x] nonce é diferente a cada chamada (não determinístico)

**Testes:** `src/__tests__/box.test.ts` — 6 testes unitários, sem I/O

---

### TASK-016 — `createIdentity()` e `derivePeerId()` (`src/crypto/identity.ts`)
**Status:** `[x] done`
**Branch:** `feat/crypto`
**Depende de:** TASK-015

Geração e persistência de par de chaves + derivação determinística de peerId.

**Success criteria:**
- [x] `createIdentity({ path? })` → `Promise<{ publicKey, secretKey }>`
- [x] Gera e salva em `~/.eden/identity.json` (default) ou `options.path`
- [x] Cria diretório com `0o700`, arquivo com `0o600`
- [x] Chaves salvas como hex no JSON
- [x] Segunda chamada retorna as mesmas chaves (persistência)
- [x] Path customizado funciona (testes usam tmp dir)
- [x] Cria diretório pai se não existir
- [x] `derivePeerId(publicKey)` → SHA-256 hex string (64 chars)
- [x] derivePeerId é determinístico
- [x] derivePeerId de chaves diferentes retorna IDs diferentes

**Testes:** `src/__tests__/identity.test.ts` — 9 testes com diretório temporário

---

### TASK-017 — Integração encrypt + identity
**Status:** `[x] done`
**Branch:** `feat/crypto`
**Depende de:** TASK-015, TASK-016

Validar que chaves geradas por `createIdentity` funcionam end-to-end com encrypt/decrypt.

**Success criteria:**
- [x] Chaves de `createIdentity` funcionam com `encrypt`/`decrypt`
- [x] Dois pares de chaves distintos trocam mensagens (Alice encripta pra Bob, Bob decripta)
- [x] peerId derivado é consistente entre chamadas

**Testes:** adicionados em `src/__tests__/identity.test.ts` — 3 testes

---

### TASK-018 — Exports e docs (crypto)
**Status:** `[x] done`
**Branch:** `feat/crypto`
**Depende de:** TASK-017

**Success criteria:**
- [x] `src/index.ts` exporta `createIdentity`, `derivePeerId`, `encrypt`, `decrypt`
- [x] `src/__tests__/index.test.ts` verifica novos exports
- [x] `CLAUDE.md` atualizado com módulo `crypto/`
- [x] `package.json` com `tweetnacl` + bump versão

---

## Fase 15 — Broadcast Mesh

> Referência completa: `MESH.md`

### TASK-019 — Envelope mesh fields (`ttl`, `origin`)
**Status:** `[x] done`
**Branch:** `feat/crypto`

Campos opcionais no `EventEnvelope` para suporte a multi-hop flooding.

**Success criteria:**
- [x] `EventEnvelope` aceita `ttl?: number` e `origin?: string`
- [x] `createEnvelope()` aceita `ttl` e `origin` opcionais
- [x] Envelopes existentes sem `ttl`/`origin` continuam válidos (backward compatible)
- [x] Receiver valida envelope com e sem campos mesh

**Testes:** `src/__tests__/envelope.test.ts` — testes adicionais para campos mesh

---

### TASK-020 — `MeshRelay` (`src/mesh/mesh-relay.ts`)
**Status:** `[x] done`
**Branch:** `feat/crypto`
**Depende de:** TASK-019

Lógica de flooding: deduplicação, TTL, forwarding entre peers.

**Success criteria:**
- [x] `MeshRelay` recebe mensagem → deduplica por `id` → descarta se `ttl <= 0` → entrega pra app → forward com `ttl - 1`
- [x] Mensagem já vista (mesmo `id`) é descartada
- [x] Mensagem com `ttl: 0` é descartada, não repassada
- [x] Mensagem com `ttl: 5` é repassada com `ttl: 4`
- [x] ACKs (`type: "__ack__"`) NÃO são propagados pela mesh
- [x] Ao emitir, adiciona `ttl: maxTtl` e `origin: peerId` se ausentes
- [x] Ao emitir, marca `id` como visto (não processa própria mensagem de volta)
- [x] Forward faz fanout via `transport.send()`

**Testes:** `src/__tests__/mesh-relay.test.ts` — 8 testes unitários com mock transport

---

### TASK-021 — `maxPeers` no `MultiP2PTransport`
**Status:** `[x] done`
**Branch:** `feat/crypto`

Limite configurável de peers diretos por nó.

**Success criteria:**
- [x] `MultiP2PTransportOptions` aceita `maxPeers?: number` (default 10)
- [x] `addPeer()` com `peers.size >= maxPeers` lança erro
- [x] Peers existentes não são afetados pelo limite

**Testes:** `src/__tests__/multi-p2p-transport.test.ts` — testes adicionais

---

### TASK-022 — Integração MeshRelay + Eden
**Status:** `[x] done`
**Branch:** `feat/crypto`
**Depende de:** TASK-020, TASK-021

Integrar MeshRelay como camada entre Eden e transport.

**Success criteria:**
- [x] Eden com mesh habilitado propaga mensagens multi-hop
- [x] Eden sem mesh continua funcionando (opt-in)
- [x] Mensagens de controle (heartbeat, probe, ACK) não são propagadas

**Testes:** `src/__tests__/mesh-integration.test.ts` — 4 testes com múltiplos peers mock

---

### TASK-023 — Exports e docs (mesh)
**Status:** `[x] done`
**Branch:** `feat/crypto`
**Depende de:** TASK-022

**Success criteria:**
- [x] `src/index.ts` exporta `MeshRelay`
- [x] `src/__tests__/index.test.ts` verifica novo export
- [x] `CLAUDE.md` atualizado com módulo `mesh/`

---

## Fase 16 — Adaptação ao novo protocolo do branch

> Referência: `../BRANCH_PRD.md`

### TASK-024 — Fix `MaxListenersExceededWarning` no `SignalingClient`
**Status:** `[x] done` (já implementado em df95947)

Bug: listener de mensagem não é removido quando `requestConnect` dá timeout.

**Success criteria:**
- [x] No callback de timeout do `requestConnect`, remover o listener de mensagem (`ws.off("message", onMessage)`)
- [x] Mesmo padrão aplicado em qualquer outro método que registra listener temporário no WS
- [x] Sem `MaxListenersExceededWarning` com 20+ peers

**Testes:** `src/__tests__/signaling-client.test.ts` — teste que verifica remoção de listener após timeout

---

### TASK-025 — `SignalingClient` envia `publicKey` no protocolo
**Status:** `[x] done`
**Depende de:** TASK-018 (crypto exports), TASK-024

**Success criteria:**
- [x] `register()` aceita e envia `publicKey` junto com `peerId` e `endpoint`
- [x] `requestConnect()` retorna `ConnectResult { endpoint, publicKey? }` (não mais só `Endpoint`)
- [x] Interface/tipo de retorno atualizado

**Testes:** `src/__tests__/signaling-client.test.ts` — 8 testes

---

### TASK-026 — `RelayClient` usa `send`/`message` ao invés de `relay`/`data`
**Status:** `[x] done`
**Depende de:** TASK-025

**Success criteria:**
- [x] `send()` envia `{ type: "send", targetPeerId, payload }`
- [x] Recebe `{ type: "message", fromPeerId, payload }`
- [x] Envia `join` em vez de `identify` — WS associado no join
- [x] `waitForReady()` resolve no WS open (sem handshake identify)

**Testes:** `src/__tests__/relay-client.test.ts` — 6 testes com novo protocolo

---

### TASK-027 — `MultiP2PTransport.addPeer()` expõe `publicKey`
**Status:** `[x] done`
**Depende de:** TASK-025

**Success criteria:**
- [x] `addPeer()` armazena `publicKey` recebida do signaling no Map de peers
- [x] `getPublicKey(peerId)` → `string | null` — acessa publicKey de um peer conectado
- [x] `publicKey` removida do Map quando `removePeer()` é chamado

**Testes:** `src/__tests__/multi-p2p-transport.test.ts` — 3 testes adicionais

---

### TASK-028 — Decisão de roteamento: server vs mesh
**Status:** `[x] done`
**Depende de:** TASK-022, TASK-026

**Success criteria:**
- [x] `MessageRouter` — detecta se server está acessível
- [x] Server up + mensagem 1:1 → send via server
- [x] Server down → mesh flooding via transport
- [x] Transição transparente — aplicação não precisa saber qual caminho foi usado
- [x] Fallback automático: se send pelo server falhar, cai pra mesh

**Testes:** `src/__tests__/routing.test.ts` — 5 testes com server mock up/down

---

### TASK-029 — Room membership no peer
**Status:** `[x] done`
**Depende de:** TASK-028

**Success criteria:**
- [x] Peer mantém `Map<roomId, Set<peerId>>` de membros por room
- [x] Ao entrar numa room: anuncia pros membros via router.send
- [x] Ao sair: anuncia saída da mesma forma
- [x] Mensagem pra room com poucos membros: N sends 1:1 via server
- [x] Mensagem pra room grande ou broadcast: mesh flooding
- [x] Limite de membros por room configurável (maxPeersPerRoom)
- [x] `getRooms()` retorna rooms que o peer participa

**Testes:** `src/__tests__/room-membership.test.ts` — 11 testes

---

### TASK-030 — Exports e docs (protocolo + rooms)
**Status:** `[x] done`
**Depende de:** TASK-029

**Success criteria:**
- [x] Exports atualizados: `MessageRouter`, `RoomManager`, `ConnectResult`
- [x] `CLAUDE.md` atualizado com novo protocolo, decisão de roteamento, room membership
- [x] `package.json` bump versão (0.7.0)

---

## Progresso

| Task | Descrição | Status |
|------|-----------|--------|
| TASK-001 a TASK-011 | Transport → Benchmark | done |
| TASK-012 | MultiP2PTransport + MultiUdpTransport | done |
| TASK-013 | SignalingSentinel | done |
| TASK-014 | SentinelElection | done |
| TASK-015 | `encrypt()` / `decrypt()` | done |
| TASK-016 | `createIdentity()` / `derivePeerId()` | done |
| TASK-017 | Integração encrypt + identity | done |
| TASK-018 | Exports e docs (crypto) | done |
| TASK-019 | Envelope mesh fields (`ttl`, `origin`) | done |
| TASK-020 | `MeshRelay` | done |
| TASK-021 | `maxPeers` no MultiP2PTransport | done |
| TASK-022 | Integração MeshRelay + Eden | done |
| TASK-023 | Exports e docs (mesh) | done |
| TASK-024 | Fix MaxListeners no SignalingClient | done |
| TASK-025 | SignalingClient com publicKey | done |
| TASK-026 | RelayClient usa send/message | done |
| TASK-027 | MultiP2PTransport expõe publicKey | done |
| TASK-028 | Decisão de roteamento server vs mesh | done |
| TASK-029 | Room membership no peer | done |
| TASK-030 | Exports e docs (protocolo + rooms) | done |
