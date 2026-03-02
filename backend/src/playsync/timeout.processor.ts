import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ActionType } from 'src/game-engine/types';
import { PlaysyncService } from './playsync.service';

@Processor('player-timeout')
export class TimeoutProcessor extends WorkerHost {
  constructor(private readonly playsyncService: PlaysyncService) {
    super();
  }

  async process(job: Job<{ tableId: string; userId: string }>) {
    const { tableId, userId } = job.data;

    // 강제 폴드 액션 실행
    // 딜러가 폴드시키는 ActionType.DEALER_FOLD 등을 활용 가능 
    await this.playsyncService.handleAction(tableId, userId, {
      type: ActionType.FOLD
    });

    // 결과는 Service 내부에서 다시 다음 사람 타이머를 등록하며 순환함
  }
}