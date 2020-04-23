import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EtherpadIntegrationService } from './etherpad-integration.service';
import { PadSchema } from './schemas';
// import * as AutoIncrementFactory from 'mongoose-sequence';
// import { connections } from 'mongoose';

@Module({
  imports: [
    // MongooseModule.forFeatureAsync([
    //   {
    //     name: 'Pad',
    //     imports: [],
    //     useFactory: () => {
    //       //  Let's start with a hack - could not find any better way to retrieve connections for the plugin
    //       const AutoIncrement = AutoIncrementFactory(connections[1]);
    //       const schema = PadSchema;
    //       schema.plugin(AutoIncrement);
    //       return schema;
    //     },
    //     inject: []
    //   },
    // ]),
    MongooseModule.forFeature([{ name: 'Pad', schema: PadSchema }])
  ],
  providers: [EtherpadIntegrationService],
  exports: [EtherpadIntegrationService]
})
export class EtherpadIntegrationModule { }
