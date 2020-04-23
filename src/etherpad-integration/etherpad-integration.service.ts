import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as etherpad from 'etherpad-lite-client';
import { Observable, from, of, forkJoin } from 'rxjs';
import { environment } from '../environments/environment';
import { AirtableAuthor } from '../shared';
import { switchMap } from 'rxjs/operators';
import { Pad } from './interfaces';
import { MongoSelectOptions } from './mongo-select-options.model';

@Injectable()
export class EtherpadIntegrationService {
    private readonly logger = new Logger(EtherpadIntegrationService.name);
    private api;

    constructor(
        @InjectModel('Pad') private padModel: Model<Pad>
    ) {
        const host: string = environment.ETHERPAD_HOST || process.env.ETHERPAD_HOST || 'localhost';
        const port: string = environment.ETHERPAD_PORT || process.env.ETHERPAD_PORT || '9001';
        const apikey: string = environment.ETHERPAD_API_KEY || process.env.ETHERPAD_API_KEY;

        if (!apikey) {
            throw new Error('Missing API key to call Etherpad');
        }

        this.api = etherpad.connect({
            apikey,
            host,
            port,
        });
    }

    private createGroup(): Observable<string> {
        return new Observable(observer => {
            this.api.createGroup((error, data) => {
                if (error) {
                    observer.error(error);
                } else {
                    observer.next(data.groupID);
                    observer.complete();
                }
            });
        });
    }

    public createAuthor(name?: string): Observable<string> {
        return new Observable(observer => {
            const args = {
                name
            };
            this.api.createAuthor(args, (error, data) => {
                if (error) {
                    observer.error(error);
                } else {
                    observer.next(data.authorID);
                    observer.complete();
                }
            });
        });
    }

    public createSession(groupID: string, authorID: string, validUntil?: number) {
        if (!validUntil) {
            validUntil = Date.parse(new Date().toISOString()) + 3000000;
        }

        return new Observable(observer => {
            const args = {
                groupID, authorID, validUntil
            }
            this.api.createSession(args, (error, data) => {
                if (error) {
                    observer.error(error);
                } else {
                    observer.next(data.authorID);
                    observer.complete();
                }
            });
        });
    }

    private createPadFromArticleId(articleId: string): Observable<Pad> {
        const createdPad = new this.padModel({ articleId, name: "article", created: false });
        return from(createdPad.save())
            .pipe(
                switchMap(pad => {
                    return forkJoin(of(pad), this.createGroup())
                }),
                switchMap(([pad, groupID]) => {
                    pad.groupID = groupID;

                    const groupPad$ = new Observable(observer => {
                        const args = { groupID, padName: pad.name };
                        this.api.createGroupPad(args, (error, data) => {
                            if (error) {
                                observer.error(error);
                            } else {
                                observer.next(data.groupID);
                                observer.complete();
                            }
                        });
                    });

                    return forkJoin(of(pad), groupPad$);
                }),
                switchMap(([pad, groupPad]) => {
                    this.logger.debug(groupPad);
                    pad.created = true;
                    return from(this.padModel.updateOne({ _id: pad._id }, pad).exec());
                })
            );
    }

    public getOrCreatePadFromArticleId(articleId: string): Observable<Pad> {
        return from(this.padModel.findOne({ articleId }).exec())
            .pipe(
                switchMap(pad => {
                    if (!pad) {
                        return this.createPadFromArticleId(articleId);
                    } else {
                        return of(pad);
                    }
                })
            );
    }

    public getOrCreateAuthorFromAirtableAuthor(airtableAuthor: AirtableAuthor): Observable<string> {
        return new Observable(observer => {
            const args = {
                authorMapper: airtableAuthor.id,
                name: airtableAuthor.name
            }
            this.api.createAuthorIfNotExistsFor(args, (error, data) => {
                if (error) {
                    observer.error(error);
                } else {
                    observer.next(data.authorID);
                    observer.complete();
                }
            });
        });
    }

    public getTextFromPad(id: string): Observable<string> {
        return new Observable(observer => {
            const args = {
                padID: id
            };
            this.api.getText(args, (error, data) => {
                if (error) {
                    observer.error(error);
                } else {
                    observer.next(data.text);
                    observer.complete();
                }
            });
        });
    }

    public find(options?: MongoSelectOptions): Observable<Array<Pad>> {
        return from(this.padModel.find(options).exec());
    }
}
