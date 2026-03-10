import { Injectable } from '@nestjs/common';
import { TournamentStatus } from '@prisma/client';
import { CreateBlindStructureDto } from 'shared/dto/blind-structure.dto';
import { CreateTournamentDto, UpdateTournamentDto } from 'shared/dto/tournament.dto';
import { BlindField, Dashboard } from 'shared/types/tournamentMeta';
import { getCurrentBlindLevel, parseBlindStructure } from 'shared/util/util';
import { GamePhase, TableState } from 'src/game-engine/types';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class SessionService {
  constructor(
    private prismaService: PrismaService,
    private redis: RedisService,
  ) { };

  async getGameSessionWithTables() {
    return await this.prismaService.tournament.findMany({
      where: {
        status: {
          in: [TournamentStatus.ONGOING, TournamentStatus.PENDING],
        }
      },
      include: {
        tables: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  async getGameSession(id: string) {
    return await this.prismaService.tournament.findUnique({
      where: { id },
      include: {
        tables: true,
        tornamentParticipations: true,
        tablePlayers: true,
        blindStructure: true,
      }
    });
  }

  async getDetailSeatStatus(id: string) {
    const tables = await this.prismaService.table.findMany({
      where: { id },
      include: { tablePlayers: true },
    });
    return tables;
  }

  // 전체 토너먼트 정보
  async getAllSessions() {
    return await this.prismaService.tournament.findMany({
      where: {
        status: {
          in: [TournamentStatus.ONGOING, TournamentStatus.PENDING],
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  // 해당 매장의 전체 토너먼트 정보
  async getStoreAllSessions(storeId: string) {
    return await this.prismaService.tournament.findMany({
      where: {
        storeId: storeId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createBlind(blindStructure: CreateBlindStructureDto) {
    const blind = await this.prismaService.blindStructure.create({
      data: {
        name: blindStructure.name,
        structure: blindStructure.structure as any,
        storeId: blindStructure.storeId
      }
    })
    return blind;
  }

  async createSession(dto: CreateTournamentDto, blindStructure?: CreateBlindStructureDto) {
    let blindId = "blind";
    if ((dto.blindId === undefined || dto.blindId === null) && blindStructure) {
      const newBlind = await this.prismaService.blindStructure.create({
        data: {
          name: blindStructure.name,
          structure: blindStructure.structure as any,
          storeId: blindStructure.storeId
        }
      })
      blindId = newBlind.id;
    }
    const sessionInfo = await this.prismaService.$transaction(async (tx) => {
      // 1. 기본 게임 세션 생성 (블라인드 구조 연결 및 OTP 생성 포함)
      const session = await tx.tournament.create({
        data: {
          name: dto.name,
          type: dto.type,
          storeId: dto.storeId,
          blindId: (dto.blindId ? dto.blindId : blindId),
          dealerOtp: Math.floor(1000 + Math.random() * 9000), // 4자리 OTP [cite: 9]
          startStack: dto.startStack,
          avgStack: dto.startStack,
          entryFee: dto.entryFee,
          rebuyUntil: dto.rebuyUntil,
          isRegistrationOpen: dto.isRegistrationOpen,
        },
      });

      const dealerSession = await tx.dealerSession.create({
        data: { tournamentId: session.id },
      });

      await tx.table.create({
        data: {
          tableOrder: 1,
          tournamentId: session.id,
          dealerId: dealerSession.id,
        }
      });
      const updatedSession = await tx.tournament.findUnique({
        where: { id: session.id },
        include: {
          tables: true,
        }
      });
      return updatedSession;
    });
    if (!sessionInfo) throw new Error('세션 생성 실패');
    await this.redis.setSeatBitmap(sessionInfo.id, sessionInfo.tables[0].id);
  }

  async createTable(tournamentId: string) {
    const tournament = await this.prismaService.tournament.findUnique({
      where: { id: tournamentId },
      include: { tables: true, dealerSession: true },
    });
    if (!tournament) throw new Error('세션 없음');
    const tableCount = tournament.tables.length;
    const newTable = await this.prismaService.$transaction(async (tx) => {
      const table = await tx.table.create({
        data: {
          tableOrder: tableCount + 1,
          tournamentId: tournament.id,
          dealerId: tournament.dealerSession!.id,
        }
      });
      return table;
    });
    await this.redis.setSeatBitmap(tournamentId, newTable.id);
  }

  // 세션 시작
  async startSession(id: string) {
    await this.initializeGame(id);
    return await this.prismaService.tournament.update({
      where: {
        id: id,
      },
      data: {
        status: TournamentStatus.ONGOING,
        startedAt: new Date(),
      },
    });
  }

  private async initializeGame(id: string) {
    // 1. DB에서 세션과 모든 테이블/플레이어 정보를 한 번에 가져옴
    const game = await this.prismaService.tournament.findUnique({
      where: { id },
      include: {
        tables: {
          include: {
            tablePlayers: true,
          }
        },
        blindStructure: true,
      }
    });

    const startedAt = new Date();
    if (!game) throw new Error("세션 없음");
    const blindStructure = parseBlindStructure(game.blindStructure.structure);
    const blindInfo = getCurrentBlindLevel(blindStructure, startedAt.getTime());

    const dashboard: Dashboard = {
      isRegistrationOpen: game.isRegistrationOpen,
      totalPlayer: game.totalPlayers,
      activePlayer: game.activePlayers,
      totalBuyinAmount: game.entryFee * game.totalPlayers,
      rebuyUntil: game.rebuyUntil,
      avgStack: game.avgStack
    }
    const blindField: BlindField = {
      isBreak: false,
      startedAt: startedAt.getTime(),
      currentBlindLv: blindInfo.currentIndex,
      nextLevelAt: blindInfo.nextLevelAt,
      serverTime: startedAt.getTime(),
      blindStructure: blindStructure,
    }

    if (game.totalPlayers < 2) {
      throw new Error('시작하기에 충분한 인원이 아닙니다.')
    }
    await this.prismaService.tournament.update({
      where: { id },
      data: { startedAt: startedAt }
    });

    // 2. 각 테이블별로 독립적인 상태 생성 및 Redis 적재
    const tableStates = game.tables.filter(t => t.tablePlayers.length > 0).map(async (t) => {

      const randomCnt = Math.floor(Math.random() * t.tablePlayers.length);
      const btnIdx = t.tablePlayers[randomCnt - 1].seatPosition;

      const initialState: TableState = {
        phase: GamePhase.WAITING,
        players: Array(9).fill(null),
        pot: 0,
        currentBet: 0,
        buttonUser: btnIdx,
        currentTurnSeatIndex: -1,
        lastRaiserIndex: -1,
        sidePots: [],
        ante: false,
      };

      // 플레이어 배치
      t.tablePlayers.forEach(tp => {
        initialState.players[tp.seatPosition] = {
          id: tp.id,
          tableId: t.id,
          nickname: tp.nickname!,
          seatIndex: tp.seatPosition,
          stack: tp.currentStack,
          bet: 0,
          hasFolded: false,
          isAllIn: false,
          button: false,
          totalContributed: 0,
        };
      });

      return { tableId: t.id, state: initialState };
    });
    if (tableStates.length > 0) {
      await this.redis.setTournamentMeta(id, dashboard, blindField);
      await this.redis.saveInitialTableSnapshots(tableStates as any);
    }
  }

  // 세션 완료
  async completeSession(id: string) {
    await this.prismaService.$transaction(async (tx) => {
      await tx.tournament.update({
        where: {
          id: id,
        },
        data: {
          status: TournamentStatus.FINISHED,
          finishedAt: new Date(),
        },
      });
      await tx.table.deleteMany({
        where: {
          tournamentId: id,
        },
      });
      await tx.dealerSession.delete({
        where: {
          tournamentId: id,
        },
      });
    })
  }

  // 세션 수정
  async updateSession(id: string, dto: UpdateTournamentDto) {
    const session = await this.getGameSession(id);
    if (session?.status === TournamentStatus.FINISHED) {
      throw new Error('종료된 세션은 수정할 수 없습니다.');
    }
    const updateData: any = {
      name: dto.name,
      blindId: dto.blindId,
      startStack: dto.startStack,
      rebuyUntil: dto.rebuyUntil,
      itmCount: dto.itmCount,
      entryFee: dto.entryFee,
    };
    return await this.prismaService.tournament.update({
      where: {
        id: id,
      },
      data: updateData,
    });
  }


}
