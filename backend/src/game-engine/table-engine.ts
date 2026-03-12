// table-engine.ts
import { TableState, TablePlayer, ActionType, GamePhase } from "./types";

type RebuyCallback = (playerId: string) => Promise<number>; // 금액 반환 (0이면 리바이 불가)

export class TableEngine {
  constructor(
    public state: TableState,
    public rebuyCallback?: RebuyCallback
  ) { }

  // 플레이어 액션 처리
  public async act(playerIndex: number, action: ActionType, raiseAmount?: number) {
    const player = this.state.players[playerIndex];
    if (!player || player.hasFolded || this.state.currentTurnSeatIndex !== playerIndex || this.state.phase === GamePhase.SHOWDOWN) {
      throw new Error("액션 불가 상태");
    }

    switch (action) {
      case ActionType.FOLD:
      case ActionType.DEALER_FOLD:
      case ActionType.DEALER_KICK:
        player.hasFolded = true;
        break;

      case ActionType.TIME_OUT:
        (player.bet < this.state.currentBet) ? player.hasFolded = true : false;
        break;

      case ActionType.CHECK:
        if (player.bet < this.state.currentBet) throw new Error("콜이 필요합니다.");
        player.hasChecked = true;
        break;

      case ActionType.CALL:
        this.handleCall(player);
        break;

      case ActionType.RAISE:
        // raiseAmount는 '이번 라운드에 내가 낼 총액' 기준
        if (!raiseAmount || raiseAmount <= this.state.currentBet) {
          throw new Error("룰에 맞추어 레이즈해주세요.");
        }
        this.handleRaise(player, raiseAmount);
        break;

    }

    const nextTurn = this.getNextTurnSeatIndex();
    if (this.shouldGoToShowdown()) {
      this.state.phase = GamePhase.SHOWDOWN;
    }
    const activePlayers = this.state.players.filter(p => p && !p.hasFolded && !p.isAllIn);
    const isAllMatched = activePlayers.every(p => p!.bet === this.state.currentBet);
    const hasEveryoneActed = activePlayers.every(p => p!.hasChecked);
    if (isAllMatched && hasEveryoneActed) {
      this.nextPhase();
    } else {
      if (nextTurn === -1) {
        this.nextPhase();
      } else {
        this.state.currentTurnSeatIndex = nextTurn;
      }
    }
    return this.state;
  }

  public nextPhase() {
    const phases = [GamePhase.PRE_FLOP, GamePhase.FLOP, GamePhase.TURN, GamePhase.RIVER, GamePhase.SHOWDOWN];
    const currentIndex = phases.indexOf(this.state.phase);

    if (currentIndex < phases.length - 1) {
      this.state.phase = phases[currentIndex + 1];
      this.state.players.forEach(p => {
        if (p) {
          p.bet = 0;
          p.hasChecked = false;
        }
      });
      this.state.currentBet = 0;
      // 첫 액션 유저는 버튼 다음 사람 (SB 위치부터 탐색)
      this.state.currentTurnSeatIndex = this.findNextActiveSeat((this.state.buttonUser + 1) % this.state.players.length);
    }
  }

  // --- 사이드 팟 계산 로직 ---
  public calculateSidePots() {
    this.state.sidePots = [];
    const participants = this.state.players
      .filter((p): p is TablePlayer => p !== null && p.totalContributed > 0)
      .sort((a, b) => a.totalContributed - b.totalContributed);

    let lastLevel = 0;
    for (const p of participants) {
      const contribution = p.totalContributed;
      if (contribution > lastLevel) {
        const amountPerPlayer = contribution - lastLevel;
        const eligiblePlayers = participants.filter(pl => pl.totalContributed >= contribution);

        this.state.sidePots.push({
          amount: amountPerPlayer * eligiblePlayers.length,
          relevantPlayerIds: eligiblePlayers.map(pl => pl.id)
        });
        lastLevel = contribution;
      }
    }
  }

  public async resolveWinner(winnerIds: string[]) {
    // 사이드팟 리스트를 돌면서 승자가 포함되어 있으면 해당 금액 분배
    for (const pot of this.state.sidePots) {
      const winnersForThisPot = winnerIds.filter(id => pot.relevantPlayerIds.includes(id));
      if (winnersForThisPot.length > 0) {
        const share = Math.floor(pot.amount / winnersForThisPot.length);
        winnersForThisPot.forEach(id => {
          const p = this.state.players.find(pl => pl?.id === id);
          if (p) p.stack += share;
        });
      }
    }
    this.state.pot = 0;
    this.state.sidePots = [];
    await this.handleHandEnd();
  }

  private handleCall(player: TablePlayer) {
    const needed = this.state.currentBet - player.bet;
    const amount = Math.min(needed, player.stack);
    player.hasChecked = true;
    this.executeBet(player, amount);
  }

  private handleRaise(player: TablePlayer, betAmount: number) {
    // 가진 돈보다 더 많이 레이즈하려고 하면 자동으로 가진 돈 전부를 베팅(올인)
    const needed = betAmount - player.bet;
    const amount = Math.min(needed, player.stack);
    this.resetChecked();
    player.hasChecked = true;
    this.executeBet(player, amount);

    // 실제 베팅된 결과가 기존 currentBet보다 높으면 갱신
    if (player.bet > this.state.currentBet) {
      this.state.currentBet = player.bet;
    }
  }

  // 레이즈시 모든 플레이어 checked 해제
  private resetChecked() {
    this.state.players.filter(p => p && !p.hasFolded && !p.isAllIn).forEach(p => {
      p!.hasChecked = false;
    })
  }

  // 공통 베팅 처리 (bet, totalContributed 동시 업데이트)
  private executeBet(player: TablePlayer, amount: number) {
    player.stack -= amount;
    player.bet += amount;
    player.totalContributed += amount;
    this.state.pot += amount;

    if (player.stack === 0) {
      player.isAllIn = true;
    }
  }


  private findNextActiveSeat(startIndex: number): number {
    const total = this.state.players.length;
    let curr = startIndex;
    for (let i = 0; i < total; i++) {
      const p = this.state.players[curr];
      if (p && !p.hasFolded && !p.isAllIn && p.stack > 0) return curr;
      curr = (curr + 1) % total;
    }
    return -1;
  }

  private getNextTurnSeatIndex(): number {
    return this.findNextActiveSeat((this.state.currentTurnSeatIndex + 1) % this.state.players.length);
  }

  /**
   * 핸드 종료 처리 → WAITING phase
   */
  private async handleHandEnd() {
    this.state.phase = GamePhase.HAND_END;

    if (this.rebuyCallback) {
      for (const p of this.state.players.filter((p): p is TablePlayer => p != null)) {
        if (p.stack === 0) {
          const rebuyAmount = await this.rebuyCallback(p.id);
          if (rebuyAmount > 0) {
            // 즉시 stack 충전, 다음 핸드 참여
            p.stack += rebuyAmount;
            p.bet = 0;
            p.hasFolded = false;
            p.isAllIn = false;
          }
        }
      }
    }
    // WAITING phase로 전환
    this.state.phase = GamePhase.WAITING;
  }

  /**
   * 딜러 준비 완료 후 PRE_FLOP 진입
   */
  public startPreFlop() {
    // 테이블 초기화
    this.initTable();
    // 1. BTN, SB, BB 유저를 순차적으로 찾음 (null 제외)
    const btnIdx = this.findNextActiveSeat((this.state.buttonUser + 1) % this.state.players.length);
    const sbIdx = this.findNextActiveSeat((btnIdx + 1) % this.state.players.length);
    const bbIdx = this.findNextActiveSeat((sbIdx + 1) % this.state.players.length);

    this.state.buttonUser = btnIdx;

    // 2. 앤티 징수 (블라인드보다 먼저 징수)
    if (this.state.ante === true) {
      this.payAnte(this.state.smallBlind / 5);
    }

    // 3. 블라인드 지불
    this.payBlind(sbIdx, bbIdx, this.state.smallBlind);

    // 4. 상태 설정
    this.state.currentBet = this.state.smallBlind * 2;

    // 첫 순서는 BB 다음 사람
    this.state.currentTurnSeatIndex = this.findNextActiveSeat((bbIdx + 1) % this.state.players.length);

    // 만약 BB 다음 사람이 아무도 없다면 (예: 2인 헤즈업) BB가 아닌 사람이 액션
    if (this.state.currentTurnSeatIndex === -1) {
      this.state.currentTurnSeatIndex = sbIdx;
    }

    this.state.phase = GamePhase.PRE_FLOP;
  }

  private payBlind(sbIdx: number, bbIdx: number, amount: number) {
    this.executeBet(this.state.players[sbIdx]!, amount);
    this.executeBet(this.state.players[bbIdx]!, amount * 2);
  }

  private payAnte(ante: number) {
    this.state.players.forEach(p => {
      if (p && !p.hasFolded) { // 앉아있는 유저만
        const amount = Math.min(p.stack, ante);
        p.stack -= amount;
        p.totalContributed += amount; // 사이드 팟 계산을 위해 누적
        this.state.pot += amount;
        if (p.stack === 0) p.isAllIn = true;
      }
    });
  }

  private initTable() {
    this.state.players = this.state.players.map(p => {
      if (p && p.stack > 0) {
        p = {
          ...p,
          bet: 0,
          totalContributed: 0,
          hasFolded: false,
          isAllIn: false,
          hasChecked: false,
        }
        return p;
      }
      return null; // 스택이 0인 플레이어는 다음 핸드 시작 시점에 명확히 제거
    });
    this.state.pot = 0;
    this.state.currentBet = 0;
    this.state.sidePots = [];
    this.state.actionDeadline = undefined;
  }

  private shouldGoToShowdown(): boolean {
    const activeNotAllIn = this.state.players.filter(p => p && !p.hasFolded && !p.isAllIn);
    // 액션 가능한 사람이 1명 이하가 되면 무조건 쇼다운(카드 오픈)
    return activeNotAllIn.length <= 1;
  }
}