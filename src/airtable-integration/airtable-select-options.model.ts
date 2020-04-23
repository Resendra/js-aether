import { AirtableSort } from "./airtable-sort.model";

export class AirtableSelectOptions {
    fields?: string[];
    maxRecords?: number;
    filterByFormula?: string;
    sort?: Array<AirtableSort>;
}