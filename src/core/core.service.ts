import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { get, isEmpty } from 'lodash';
import { forkJoin, of } from 'rxjs';
import { finalize, switchMap, map, tap } from 'rxjs/operators';
import { AirtableIntegrationService } from '../airtable-integration';
import { EtherpadIntegrationService } from '../etherpad-integration';
import { AirtableAuthor } from '../shared';

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

    @Cron('30 * * * * *')
    scanAirtableForUpdates() {
        if (!this.airtableLock) {
            this.airtableLock = true;
            this.airtableService
                .findFromTable('Papiers originaux ou traduits', {
                    fields: ['Rédaction']
                })
                .pipe(
                    switchMap(articles => {
                        this.logger.log('Retrieved articles for update...');

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

                        const observables = articles.map(article => {
                            return this.etherpadService.getOrCreatePadFromArticleId(article.id);
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

    @Cron('30 * * * * *')
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
                                    switchMap(_ => {
                                        return this.etherpadService.getTextFromPad(padId);
                                    }),
                                    map(text => ({ articleId: pad.articleId, text }))
                                );
                        });

                        return isEmpty(observables) ? of([]) : forkJoin(observables);
                    }),
                    tap(results => {
                        console.log(results);
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
