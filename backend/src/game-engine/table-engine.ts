// table-engine.ts
import { TableState, TablePlayer, ActionInput, ActionType, GamePhase } from "./types";

type RebuyCallback = (playerId: string) => Promise<number> | number;
// 반환값 0 → 리바인 거부, >0 → 충전할 스택

export class TableEngine {
  constructor(
    public state: TableState,
    public smallBlind: number = 100,
    public rebuyCallback?: RebuyCallback
  ) { }

  // 플레이어 액션 처리
  public async act(playerIndex: number, action: ActionInput, raiseAmount?: number) {
    const player = this.state.players.filter(p => p != null)[playerIndex];

    if (action.type === ActionType.DEALER_FOLD) {
      player.hasFolded = true;
      this.state.currentTurnSeatIndex = this.getNextTurnSeatIndex();
      return this.state;
    }

    if (player.hasFolded || player.stack <= 0 || this.state.currentTurnSeatIndex !== playerIndex) {
      throw new Error("차례가 돌아오지 않았거나 플레이 불가상황입니다.");
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
        if (player.bet < this.state.currentBet) throw new Error("체크 불가합니다.");
        break;

      case ActionType.RAISE:
        if (!raiseAmount || raiseAmount <= 0) throw new Error("레이즈는 0이상 / 미니멈레이즈 이상이어야합니다.");
        this.handleRaise(player, raiseAmount);
        break;

      case ActionType.ALL_IN:
        this.handleAllIn(player);
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    this.state.currentTurnSeatIndex = this.getNextTurnSeatIndex();

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
  public nextPhase() {
    const phases = [GamePhase.PRE_FLOP, GamePhase.FLOP, GamePhase.TURN, GamePhase.RIVER, GamePhase.SHOWDOWN];
    const currentIndex = phases.indexOf(this.state.phase);

    if (currentIndex < phases.length - 1) {
      this.state.phase = phases[currentIndex + 1];
      // 단계가 넘어갈 때마다 플레이어들의 bet을 0으로 초기화하여 다음 라운드 준비
      this.state.players.filter(
        (p): p is TablePlayer => p != null && !p.hasFolded).forEach(p => p.bet = 0);
      this.state.currentBet = 0;
    }
  }

  // 중간에 유저가 앉을 때 (밸런싱 혹은 늦은 참가)
  public addPlayer(player: TablePlayer, seatIndex: number) {
    if (this.state.players[seatIndex] == null) {
      this.state.players[seatIndex] = player;
    }
    else throw new Error('빈자리가 아닙니다.');
  }

  // 유저가 나갈 때 (탈락 혹은 테이블 이동)
  public removePlayer(seatIndex: number) {
    this.state.players[seatIndex] = null; // 자리는 비우되 인덱스는 유지
  }

  public resolveWinner(winnerIds: string[]) {
    const winners = this.state.players.filter(p => winnerIds.includes(p!.id));
    const winAmount = Math.floor(this.state.pot / winners.length);

    winners.forEach(w => {
      w!.stack += winAmount;
    });

    this.state.pot = 0;
    this.handleHandEnd(); // 다음 핸드 준비 및 리바인 체크
  }

  private handleCall(player: TablePlayer) {
    const callAmount = this.state.currentBet - player.bet;
    const actual = Math.min(callAmount, player.stack);
    player.stack -= actual;
    player.bet += actual;
    this.state.pot += actual;
    if (player.stack === 0) player.isAllIn = true;
  }

  private handleRaise(player: TablePlayer, raiseAmount: number) {
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

  private handleAllIn(player: TablePlayer) {
    this.state.pot += player.stack;
    player.bet += player.stack;
    player.stack = 0;
    player.isAllIn = true;
    if (player.bet > this.state.currentBet) this.state.currentBet = player.bet;
  }

  private allActivePlayersAllIn(): boolean {
    return this.state.players
      .filter((p): p is TablePlayer => p != null && !p.hasFolded && p.stack > 0)
      .every(p => p.isAllIn || p.stack === 0);
  }

  private countActivePlayers(): number {
    return this.state.players.filter((p): p is TablePlayer => p != null && !p.hasFolded && p.stack > 0).length;
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
          // rebuyAmount === 0 → 리바인 거부 → 다음 핸드에서 OUT 처리
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

    let c = 0;
    const bbAmount = this.smallBlind * 2;
    if(this.state.buttonUser === 8) {
      this.state.buttonUser = 0;
    }
    for (let i = this.state.buttonUser; i < this.state.players.length; i++) {
      const player = this.state.players[i];
      switch (c) {
        case 0: 
          this.state.buttonUser = i;
          break;
        case 1: 
          if(player !== null) {
            this.payBlind(player, this.smallBlind);
          };
          break;
        case 2: 
          if(player !== null) {
            this.payBlind(player, bbAmount);
            c = i;
          };
          break;
        default:
          break; 
      }
    }


    // 앤티 존재, 프리플랍 시 강제 징수
    if (this.state.ante > 0) {
      this.state.players.forEach(p => {
        if (p && p.stack < this.state.ante) {
          this.state.pot += p.stack;
          p.stack = 0;
          p.isAllIn = true;
        }
        if (p && p.stack > 0) {
          const postedAnte = Math.min(p.stack, this.state.ante);
          p.stack -= postedAnte;
          this.state.pot += postedAnte;
        }
      });
    }

    // 플레이어 상태 초기화 및 OUT 처리
    this.state.players.filter((p): p is TablePlayer => p != null).forEach(p => {
      if (p.stack <= 0) {
        // 리바인 선택 안 한 플레이어 → OUT 처리
        p.hasFolded = true;
      }
      p.bet = 0;
      p.isAllIn = false;
    });


    // Pot 및 턴 초기화
    this.state.pot = this.state.players.filter((p): p is TablePlayer => p != null).reduce((sum, p) => sum + p.bet, 0);
    this.state.currentBet = bbAmount;
    this.state.currentTurnSeatIndex = c; // 첫 턴
    this.state.phase = GamePhase.PRE_FLOP;
  }

  private payBlind(player: TablePlayer, amount: number) {
    if (player && player.stack <= amount) {
      player.bet = player.stack;
      player.stack = 0;
      player.isAllIn = true;
    } else {
      player.stack -= amount;
      player.bet = amount;
    }
  }

  private getNextTurnSeatIndex(): number {
    const total = this.state.players.length;
    if(this.state.currentTurnSeatIndex === 8) {
      for(let i = 0; i < total; i++) {
        if(this.state.players[i] !== null) return 0;
      }
    }
    let next = this.state.currentTurnSeatIndex;
    for (let i = next; i < total; i++) {
      if(this.state.players[i] !== null) return i;
    }
    return -1;
  }

}