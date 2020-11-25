import { Module } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { JudgerService } from './judger.service';
import { JudgerController } from './judger.controller';

@Module({
  imports:[RedisService],
  providers: [JudgerService],
  controllers: [JudgerController]
})
export class JudgerModule {}
