import { Document } from "mongoose";

export interface Pad extends Document {
    _id: string;
    name: string;
    groupID: string;
    created: boolean;
    articleId: string;
    lastModificationDate: Date;
}