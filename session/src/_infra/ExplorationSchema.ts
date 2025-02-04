import {model, Schema, Document} from "mongoose";

const INTERACTION_SCHEMA: Schema = new Schema({
    concreteType: String,
    index: Number,
    kind: String,
    value: String,
    date: Date
});

const EXPLORATION_SCHEMA: Schema = new Schema({
    sessionId : String,
    explorationNumber : Number,
    testerName : String,
    isStopped : Boolean,
    interactionList : [INTERACTION_SCHEMA],
},
{
    timestamps: true,
});
export interface ExplorationDocument extends Document {
    sessionId : string,
    explorationNumber : number,
    testerName : string,
    isStopped : boolean,
    startDate: Date,
    interactionList : any[],
}

export default model<ExplorationDocument>("Exploration", EXPLORATION_SCHEMA);
