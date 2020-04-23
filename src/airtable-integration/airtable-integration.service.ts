import { Injectable } from '@nestjs/common';
import * as Airtable from 'airtable';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';
import { AirtableSelectOptions } from './airtable-select-options.model';
import { AirtableRecord } from './airtable-record.model';

@Injectable()
export class AirtableIntegrationService {
    private base;

    constructor() {
        const endpointUrl: string = environment.AIRTABLE_ENDPOINT_URL || process.env.AIRTABLE_ENDPOINT_URL;
        const apiKey: string = environment.AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
        const tableId: string = environment.AIRTABLE_ID || process.env.AIRTABLE_ID;

        if (!apiKey) {
            throw new Error('Missing API key to call Airtable');
        }

        if (endpointUrl) {
            this.base = new Airtable({ endpointUrl, apiKey }).base(tableId);
        } else {
            this.base = new Airtable({ apiKey }).base(tableId);
        }
    }

    findFromTable<T = any>(tableName: string, options?: AirtableSelectOptions): Observable<Array<AirtableRecord<T>>> {
        return new Observable(observer => {
            let result: Array<AirtableRecord> = [];

            this.base(tableName)
                .select(options)
                .eachPage(
                    (records, fetchNextPage) => {
                        result = result.concat(records.map(record => record._rawJson));
                        fetchNextPage();
                    },
                    err => {
                        if (err) {
                            observer.error(err);
                        } else {
                            observer.next(result);
                            observer.complete();
                        }
                    }
                );
        });
    }

    updateTable<T = any>(tableName: string, record: AirtableRecord[]): Observable<AirtableRecord<T>[]> {
        return new Observable(observer => {
            this.base(tableName).update(record, (err, records) => {
                if (err) {
                    observer.error(err);
                } else {
                    observer.next(records);
                    observer.complete();
                }
            });
        });
    }
}
