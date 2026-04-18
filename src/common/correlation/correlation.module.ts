import { Module, Global } from '@nestjs/common';
import { CorrelationService } from './correlation.service';

@Global() // Make it available everywhere without importing the module
@Module({
  providers: [CorrelationService],
  exports: [CorrelationService],
})
export class CorrelationModule {}
