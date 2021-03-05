import { Module } from '@nestjs/common';
import { ConfigModule } from 'src/config/config-module/config.module';
import { RedisModule } from 'src/redis/redis.module';
import { KeyModule } from './key/key.module';
import { KeyService } from './key/key.service';

@Module({
    imports: [KeyModule, RedisModule, ConfigModule],
    providers: [KeyService],
    exports: [KeyService]
})
export class AuthModule {}
