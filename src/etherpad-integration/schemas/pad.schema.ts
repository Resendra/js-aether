import * as mongoose from 'mongoose';

export const PadSchema = new mongoose.Schema({
    name: String,
    groupID: String,
    created: Boolean,
    articleId: String,
    lastModificationDate: Date
});