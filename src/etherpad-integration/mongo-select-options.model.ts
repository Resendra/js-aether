export class MongoSelectOptions {
    [key: string]: {
        $gt?: Date,
        $lt?: Date
    }
}