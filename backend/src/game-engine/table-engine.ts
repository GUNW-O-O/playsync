// table-engine.ts
import { HandState, EnginePlayer, ActionInput, ActionType, GamePhase } from "./types";

type RebuyCallback = (playerId: string) => Promise<number> | number;
// 반환값 0 → 리바인 거부, >0 → 충전할 스택

export class TableEngine {
  constructor(
    public state: HandState,
    public smallBlind: number = 50,
    public rebuyCallback?: RebuyCallback
  ) { }

  // 플레이어 액션 처리
  public async act(playerIndex: number, action: ActionInput, raiseAmount?: number) {
    const player = this.state.players[playerIndex];

    if (player.hasFolded || player.stack <= 0 || this.state.currentTurnIndex !== playerIndex) {
      throw new Error("Invalid action: not your turn or inactive player");
    }

    // 액션 적용
    switch (action.type) {
      case ActionType.FOLD:
        player.hasFolded = true;
        break;

      case ActionType.CALL:
        this.handleCall(player);
        break;

      case ActionType.CHECK:
        if (player.bet < this.state.currentBet) throw new Error("Invalid CHECK");
        break;

      case ActionType.RAISE:
        if (!raiseAmount || raiseAmount <= 0) throw new Error("Raise must be > 0");
        this.handleRaise(player, raiseAmount);
        break;

      case ActionType.ALL_IN:
        this.handleAllIn(player);
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    this.state.currentTurnIndex = this.getNextTurnIndex();

    if (this.allActivePlayersAllIn() && this.state.phase !== GamePhase.HAND_END) {
      this.state.phase = GamePhase.SHOWDOWN;
      await this.handleHandEnd();
    }

    if (this.countActivePlayers() === 1 && this.state.phase !== GamePhase.HAND_END) {
      this.state.phase = GamePhase.HAND_END;
      await this.handleHandEnd();
    }

    return this.state;
  }

  private handleCall(player: EnginePlayer) {
    const callAmount = this.state.currentBet - player.bet;
    const actual = Math.min(callAmount, player.stack);
    player.stack -= actual;
    player.bet += actual;
    this.state.pot += actual;
    if (player.stack === 0) player.isAllIn = true;
  }

  private handleRaise(player: EnginePlayer, raiseAmount: number) {
    const totalBet = this.state.currentBet + raiseAmount;
    const needed = totalBet - player.bet;
    if (player.stack <= needed) this.handleAllIn(player);
    else {
      player.stack -= needed;
      player.bet += needed;
      this.state.pot += needed;
      this.state.currentBet = totalBet;
    }
  }

  private handleAllIn(player: EnginePlayer) {
    this.state.pot += player.stack;
    player.bet += player.stack;
    player.stack = 0;
    player.isAllIn = true;
    if (player.bet > this.state.currentBet) this.state.currentBet = player.bet;
  }

  private allActivePlayersAllIn(): boolean {
    return this.state.players
      .filter(p => !p.hasFolded && p.stack > 0)
      .every(p => p.isAllIn || p.stack === 0);
  }

  private countActivePlayers(): number {
    return this.state.players.filter(p => !p.hasFolded && p.stack > 0).length;
  }

  /**
   * 핸드 종료 처리 → WAITING phase
   */
  private async handleHandEnd() {
    this.state.phase = GamePhase.HAND_END;

    // WAITING phase로 전환
    this.state.phase = GamePhase.WAITING;

    if (this.rebuyCallback) {
      for (const p of this.state.players) {
        if (p.stack === 0) {
          const rebuyAmount = await this.rebuyCallback(p.id);
          if (rebuyAmount > 0) {
            // 즉시 stack 충전, 다음 핸드 참여
            p.stack += rebuyAmount;
            p.bet = 0;
            p.hasFolded = false;
            p.isAllIn = false;
          }
          // rebuyAmount === 0 → 리바인 거부 → 다음 핸드에서 OUT 처리
        }
      }
    }
  }

  /**
   * 딜러 준비 완료 후 PRE_FLOP 진입
   */
  public startPreFlop() {
    const total = this.state.players.length;

    // 버튼 이동
    this.state.buttonIndex = (this.state.buttonIndex + 1) % total;

    // SB / BB 배치
    const sbIndex = (this.state.buttonIndex + 1) % total;
    const bbIndex = (this.state.buttonIndex + 2) % total;
    const bbAmount = this.smallBlind * 2;

    // 플레이어 상태 초기화 및 OUT 처리
    this.state.players.forEach(p => {
      if (p.stack <= 0) {
        // 리바인 선택 안 한 플레이어 → OUT 처리
        p.hasFolded = true;
      }
      p.bet = 0;
      p.isAllIn = false;
    });

    // 블라인드 지급 (OUT player 제외)
    if (!this.state.players[sbIndex].hasFolded) this.payBlind(this.state.players[sbIndex], this.smallBlind);
    if (!this.state.players[bbIndex].hasFolded) this.payBlind(this.state.players[bbIndex], bbAmount);

    // Pot 및 턴 초기화
    this.state.pot = this.state.players.reduce((sum, p) => sum + p.bet, 0);
    this.state.currentBet = bbAmount;
    this.state.currentTurnIndex = this.getNextTurnIndex(); // 첫 턴
    this.state.phase = GamePhase.PRE_FLOP;
  }

  private payBlind(player: EnginePlayer, amount: number) {
    if (player.stack <= amount) {
      player.bet = player.stack;
      player.stack = 0;
      player.isAllIn = true;
    } else {
      player.stack -= amount;
      player.bet = amount;
    }
  }

  private getNextTurnIndex(): number {
    const total = this.state.players.length;
    let next = this.state.currentTurnIndex;
    for (let i = 0; i < total; i++) {
      next = (next + 1) % total;
      const p = this.state.players[next];
      if (!p.hasFolded && p.stack > 0) return next;
    }
    return this.state.currentTurnIndex;
  }

  /**
   * 타이머 초과 시 강제 액션
   */
  public forceAction(playerIndex: number) {
    const player = this.state.players[playerIndex];
    if (player.hasFolded || player.stack <= 0) return;

    if (player.bet < this.state.currentBet) this.handleCall(player); // 최소 콜
    else player.hasFolded = true; // 체크 불가 시 폴드
    this.state.currentTurnIndex = this.getNextTurnIndex();
  }
}