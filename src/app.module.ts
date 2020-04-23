import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { CoreModule } from './core';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot('mongodb://localhost:27017/aether', { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true }),
    CoreModule
  ]
})
export class AppModule {
}
