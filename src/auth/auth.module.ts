import { Module } from '@nestjs/common';
import { KeyModule } from './key/key.module';

@Module({
  providers: [],
  imports: [KeyModule]
})
export class AuthModule {}
