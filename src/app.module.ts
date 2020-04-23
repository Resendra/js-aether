import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { CoreModule } from './core';
import { environment } from './environments/environment';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(`mongodb://${environment.MONGO_HOST}:${environment.MONGO_PORT}/${environment.MONGO_DATABASE}`, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true }),
    CoreModule
  ]
})
export class AppModule {
}
