import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { get, isEmpty } from 'lodash';
import { forkJoin, of } from 'rxjs';
import { finalize, switchMap, map, tap } from 'rxjs/operators';
import { AirtableIntegrationService } from '../airtable-integration';
import { EtherpadIntegrationService } from '../etherpad-integration';
import { AirtableAuthor } from '../shared';
import { AirtableRecord } from 'src/airtable-integration/airtable-record.model';
import { environment } from 'src/environments/environment';

@Injectable()
export class CoreService {
    private readonly logger = new Logger(CoreService.name);
    private airtableLock: boolean;
    private etherpadLock: boolean;

    private oldEntries: any[] = [];
    private lastModificationDate: Date;

    constructor(
        private airtableService: AirtableIntegrationService,
        private etherpadService: EtherpadIntegrationService
    ) {

    }

    private getAuthorChangesByArticle(oldArticles: any[], articles: any[]): { [key: string]: { added: Array<AirtableAuthor>, removed: Array<AirtableAuthor> } } {
        const oldArticlesMap = oldArticles.reduce((acc, article) => {
            if (article.id) {
                acc[article.id] = article;
            }
            return acc;
        }, {});

        return articles.reduce((acc, article) => {
            if (article.id) {
                if (oldArticlesMap[article.id]) {
                    let diff = {
                        added: {},
                        removed: {}
                    };

                    diff = get(oldArticlesMap, [article.id, 'fields', 'Rédaction'], [])
                        .reduce((authorChanges, author) => {
                            authorChanges.removed[author.id] = author;
                            return authorChanges;
                        }, diff);


                    diff = get(article, ['fields', 'Rédaction'], [])
                        .reduce((authorChanges, author) => {
                            if (authorChanges.removed[author.id]) {
                                delete authorChanges.removed[author.id];
                            } else {
                                authorChanges.added[author.id] = author;
                            }
                            return authorChanges;
                        }, diff);

                    acc[article.id] = { added: Object.values(diff.added) || [], removed: Object.values(diff.removed) || [] };
                } else {
                    acc[article.id] = { added: get(article, ['fields', 'Rédaction'], []) };
                }
            }
            return acc;
        }, {});
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    scanAirtableForUpdates() {
        if (!this.airtableLock) {
            this.airtableLock = true;
            this.airtableService
                .findFromTable('Papiers originaux ou traduits', {
                    fields: ['Rédaction', 'Corps_de_texte']
                })
                .pipe(
                    switchMap(records => {
                        // const authorChangesByArticle = this.getAuthorChangesByArticle(this.oldEntries, articles);

                        // const observables = authorChanges.reduce((acc, {added, removed}) => {
                        //     if (added) {
                        //         added.map(author => {
                        //            return this.etherpadService.getOrCreateAuthorFromAirtableAuthor()
                        //            .pipe(

                        //            )
                        //         })
                        //     }
                        // }, []);

                        const observables = records.map(record => {
                            const text = get(record, ['fields', 'Corps_de_texte'], '');
                            return this.etherpadService.getOrCreatePadFromArticleId(record.id, 'article', text);
                        });

                        return isEmpty(observables) ? of([]) : forkJoin(observables);
                    }),
                    finalize(() => this.airtableLock = false)
                )
                .subscribe(
                    result => {
                        this.logger.debug(result)
                    },
                    error => this.logger.error(error)
                );
        }

    }

    @Cron(CronExpression.EVERY_MINUTE)
    scanEtherpadForUpdates() {
        if (!this.etherpadLock) {
            this.etherpadLock = true;

            // if (isEmpty(this.padsCollection)) {
            forkJoin(this.etherpadService.find(), this.etherpadService.createAuthor())
                .pipe(
                    switchMap(([pads, authorID]) => {
                        const observables = pads.map(pad => {
                            const padId = `${pad.groupID}$${pad.name}`;

                            return this.etherpadService.createSession(pad.groupID, authorID)
                                .pipe(
                                    switchMap(_ => this.etherpadService.getTextFromPad(padId)),
                                    switchMap(text => {
                                        const record: AirtableRecord = {
                                            id: pad.articleId,
                                            fields: {
                                                "Corps_de_texte": text,
                                                "Pad": `http://${environment.ETHERPAD_HOST}:${environment.ETHERPAD_PORT}/p/${pad.groupID}$${pad.name}`
                                            }
                                        }

                                        return this.airtableService.updateTable('Papiers originaux ou traduits', [record]);
                                    }),
                                );
                        });

                        return isEmpty(observables) ? of([]) : forkJoin(observables);
                    }),
                    finalize(() => this.etherpadLock = false)
                )
                .subscribe(
                    result => {
                        this.logger.debug(result)
                    },
                    error => this.logger.error(error)
                );
            // } else {
            //     this.etherpadService.find()
            //         .pipe(
            //             switchMap(pads => {
            //                 const observables = pads.map(pad => {
            //                     return this.etherpadService.getTextFromPad(`${pad.groupID}$${pad.name}`)
            //                         .pipe(map(text => ({ articleId: pad.articleId, text })));
            //                 });

            //                 return isEmpty(observables) ? of([]) : forkJoin(observables);
            //             }),
            //             tap(results => {
            //                 console.log(results);
            //             })
            //         )
            //         .subscribe(
            //             result => {
            //                 this.logger.debug(result)
            //             },
            //             error => this.logger.error(error)
            //         );
            // }
        }
    }
}
