# Playsync: 오프라인 홀덤 토너먼트의 디지털 전환 SaaS 시스템 기반 MVP
> 오프라인 홀덤은 딜러의 실수, 플레이어의 턴 실수, 칩 계산 착오 등 실수가 빈번합니다.
> 이를 디지털로 풀어내어 실수를 줄이고 데이터정합성을 보장하고 본질에 집중할수 있는 시스템을 구축하고자 했습니다.

> 이 MVP를 기반으로 코드 리뷰에서 발견한 문제를 고쳐 나가는 후속 작업은
> **[V2 문서](https://github.com/GUNW-O-O/playsync-V2) 에 있습니다.

---
## 🛠 기술 스택
- **Backend**: NestJS, WebSocket
  - 모듈 단위의 의존성 주입을 통해 로직을 구조화하고 유지보수성을 높였습니다.
  - WebSocket: 실시간 상태 공유를 통해 테이블/플레이어/토너먼트 진행을 동기화합니다.
- **Queue / Event**: BullMQ, EventEmitter
  - BullMQ: 플레이어 액션 30초 타임아웃을 지연 잡으로 처리하며, `jobId`를 테이블 단위로 고정해 턴이 넘어갈 때 이전 타이머를 덮어쓰기/제거로 관리합니다.
  - EventEmitter: 리바인 확인처럼 유저 응답을 기다려야 하는 비동기 흐름을 이벤트 기반(`once`)으로 처리해 서비스와 게이트웨이의 결합을 낮췄습니다.
- **Frontend**: Next.js
  - Server Action을 활용하여 httpOnly쿠키로 안전한 인증 로직을 구현하고 빠른 개발환경 구축을 위해 사용했습니다.
- **Database**: Redis, PostgreSQL
  - 수시로 변하는 게임 상태를 빠르게 읽고 쓰며, 서버는 웹소켓과 게임로직 처리를 담당시키기 위해 활용했습니다.
  - Redis Persistence(RDB/AOF)설정을 통해 토너먼트중 서버 장애시 플레이중인 베팅라인/결과등 상태 복구를 보장합니다.
  - 결과 정산 시점에만 DB 트랜잭션을 실행하는 Write-back 패턴을 적용했습니다. 핸드 진행 중 DB 쓰기는 0회 — 핸드당 여러번 발생하는 상태 변경은 전부 Redis에서 처리되고, DB에는 정산·탈락 등 경계 이벤트에서 1~2회만 기록됩니다.
- **Auth**: JWT
  - 인증정보를 안전하게 처리하고 확장에도 유연하게 대응하기 위해 도입하였습니다.
- **ETC**: Prisma, Docker
  - Type-safe한 환경에서 개발 생산성과 안정성을 높이고, 초반 잦은 스키마 변경에 대응했습니다.
  - Docker: 추후 배포시 환경의 일관성을 유지하고, 개발환경을 빠르게 구축하기위해 사용했습니다.
---
## 🚦 구현 범위

### ✅ 구현 완료
- 토너먼트 생성 / 블라인드 구조 등록·재사용
- 좌석 선점(Redis 분산 락) 및 포인트 결제 기반 참가
- 딜러 OTP 인증 및 딜러 콘솔(폴드/킥/승자 결정)
- 상태머신 기반 베팅 라운드 진행 (체크/콜/폴드/레이즈/올인)
- 사이드팟 계산 및 콜되지 않은 베팅 환급
- 액션 30초 타임아웃 자동 처리 (BullMQ 지연 잡)
- Lazy Update 방식 블라인드 레벨 상승 (핸드 시작 시점 계산)
- 핸드 종료 시 리바인 유도 (15초 응답 대기, 즉시 상태 전파)
- 탈락 처리 및 등수 기록, 최후 1인 우승 처리

### 🚧 미구현 / 개발 예정
- 테이블 밸런싱(자리 이동) — `SessionService.manualMovingPlayer()` 스텁 상태
- 다중 테이블 좌석 매핑
- 찹팟(무승부) 분배 로직
- 프라이즈풀 기반 상금 분배 — 현재 상금액 하드코딩
- SIT_AND_GO 모드 — 스키마만 존재
- 실제 PG 결제 연동 — 현재 포인트 차감 모의 처리
- 플랫폼/상점 어드민 기능
- 서버 다운 복구 시 블라인드 미루는 로직 (startedAt 보정)
- 사용자 친화적인 UI

---
## 🚀 실행 방법

### 사전 요구사항
- Node.js, Docker

### 1. 인프라 실행 (PostgreSQL 18 + Redis 7)
```bash
cd backend
docker-compose up -d
```

### 2. 환경 변수
`backend/.env` 파일에 아래 변수를 설정합니다.
```env
DATABASE_URL=postgresql://root:<password>@localhost:5432/playsync
DATABASE_PASSWORD=<password>   # docker-compose에서 사용
JWT_SECRET=<secret>
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<password>      # docker-compose에서 사용
```

### 3. Backend (http://localhost:3001)
```bash
cd backend
npm install
npx prisma migrate dev
npm run start:dev
```

### 4. Frontend (http://localhost:3000)
```bash
cd frontend
npm install
npm run dev
```

---
## 📦 프로젝트 구조 (Backend)

| 모듈 | 역할 |
|---|---|
| `game-engine` | 프레임워크 의존성이 없는 순수 TypeScript 포커 상태머신 (베팅 라운드, 사이드팟, 페이즈 전환) |
| `playsync` | 게임 진행 오케스트레이션 (액션 처리, 타임아웃, 리바인, 탈락, DB 동기화) |
| `dealer` | 딜러 OTP 인증, 딜러 액션 (프리플랍 시작, 폴드/킥, 승자 결정) |
| `ws` | WebSocket 게이트웨이 (테이블/토너먼트 세션 관리, 브로드캐스트) |
| `payment` | 좌석 선점 락, 참가 결제, 좌석 현황 |
| `store` | 매장/토너먼트 세션 관리 (생성, 시작, 종료, 블라인드 등록) |
| `redis` | 게임 상태 스냅샷, 대회 메타정보, 좌석 비트맵, 유저 컨텍스트 |
| `auth` / `user` | JWT 인증, 유저/포인트 관리 |

### WebSocket 프로토콜 (`/playsync`)

| 방향 | 이벤트 | 설명 |
|---|---|---|
| 클라 → 서버 | `PLAYER_ACTION` | 체크/콜/폴드/레이즈 액션 |
| 클라 → 서버 | `DEALER_ACTION` | 프리플랍 시작, 승자 결정, 폴드/킥 |
| 클라 → 서버 | `REBUY_RESPONSE` | 리바인 수락/거절 응답 |
| 서버 → 클라 | `renderGame` | 테이블 상태 브로드캐스트 |
| 서버 → 클라 | `renderSeatList` | 좌석 현황 브로드캐스트 (예매 화면) |
| 서버 → 클라 | `REBUY_PROMPT` | 리바인 확인 팝업 요청 (개별 유저) |

---


<details>
  <summary><h2>🔥 핵심 로직</h2></summary>
  <img src="./img/10raiseAndRaise.gif" width="600" />
  <p>첫 레이즈 이후 더 큰 벳이 나오면 새로운 액션기회를 가집니다.</p>
  <img src="./img/17goToShowDown.gif" width="600" />
  <p>레이즈, 올인, 폴드 일때 액션 가능한 플레이어가 없으므로 쇼다운페이즈로 진입합니다.</p>
  <img src="./img/16sidePot.png" width="600" />
  <p>딜러콘솔에서 클릭한 순서대로 핸드가 강한순입니다.</p>
  <p>1000을 베팅한 test3 3000, test2 보다 test1이 높은패 인 상황에 test1이 나머지팟을 가져갑니다</p>
  <img src="./img/18eliminated.gif" width="600" />
  <p>딜러가 승자결정시 상태수정, 0인 플레이어 탈락처리, 상태 기준으로 db업데이트, 0인플레이어를 상태에서 제거합니다.</p>
</details>

<details>
  <summary><h2>🗺️ 설계 전체</h2></summary>
  <details>
    <summary><h3>아키텍쳐</h3></summary>
    <img src="./img/architecture.png" width="600" />
  </details>
  <details>
    <summary><h3>ERD</h3></summary>
    <img src="./img/erd.png" width="600" />
  </details>
  <details>
    <summary><h3>플로우 차트</h3></summary>
    <img src="./img/mermaid.png" width="600" />
  </details>
</details>




## 📌 사용 흐름

<details>
  <summary><h3>🎉 토너먼트 생성</h3></summary>
  <img src="./img/1createTournamentWithBlind.png" width="600" />
  <p>상점 관리페이지에서 토너먼트 생성 시 블라인드 구조를 새로 등록가능합니다.</p>
  <img src="./img/2createTournamentWithBlindId.png" width="600" />
  <p>기존의 블라인드를 설정해두었다면 재사용 가능합니다.</p>
</details>
<hr>
<details>
  <summary><h3>🥷 딜러 인증</h3></summary>
  <img src="./img/3createSuccess.png" width="600" />
  <p>토너먼트가 생성되면 딜러 OTP가 발급됩니다.</p>
  <img src="./img/4dealerReject.png" width="600" />
  <p>OTP 검증 화면입니다.</p>
  <img src="./img/5dealerValid.png" width="600" />
  <p>OTP 검증 화면입니다.</p>
</details>
<hr>
<details>
  <summary><h3>🙋‍♂️ 유저 착석</h3></summary>
  <img src="./img/6tableSeat.png" width="600" />
  <p>유저는 원하는 자리에 앉을 수 있습니다.</p>
  <img src="./img/7waitingPlayer.png" width="600" />
  <p>우측 하단은 딜러화면이고,다른 플레이어가 이미 결제한 자리는 빨간색으로 표시됩니다.</p>
  <img src="./img/8playersReady.png" width="600" />
  <p>모든 플레이어가 웹소켓으로 접속해있는 화면입니다.</p>
  <img src="./img/9dashboard.png" width="600" />
  <p>관리페이지에서 대회를 시작하면 해당 대회정보를 Redis에 올리게됩니다.</p>
</details>
<hr>
<details>
  <summary><h3>⌨️ 상태머신을 통한 실시간 화면</h3></summary>
  <img src="./img/11autoFold.gif" width="600" />
  <p>test1 플레이어가 30초 이내로 액션을 하지않았습니다.</p>
  <img src="./img/12autoCheck.gif" width="600" />
  <p>test2 플레이어가 30초 이내로 액션을 하지않았고, 콜 할 금액이 없어 자동으로 체크.</p>
  <img src="./img/13resolveWinner.gif" width="600" />
  <p>딜러가 test2 플레이어에게 승리를 선언합니다.</p>
  <img src="./img/14tableBlindUpdate.gif" width="600" />
  <p>테이블별 블라인드는 핸드 시작 시점에 업데이트됩니다.</p>
  <img src="./img/15sidePotShowdown.gif" width="600" />
  <p>사이드팟이 생기는 상황입니다. test2 플레이어가 콜할 금액이 높아져 액션을 더 진행했습니다.</p>
</details>


---
