export default class Action {

    kind: string;
    value: string | undefined;
    index: number;
    date: Date;

    constructor(kind: string, value?: string, index: number= 0) {
        this.kind = kind;
        this.value = value;
        this.index = index;
        this.date = new Date();
    }

    getConcreteType(): string {
        return "Action";
    }

    toString(): string {
        if (this.value) {
            return `${this.kind}$${this.value}`
        } else {
            return this.kind
        }
    }

    toPrintableText(): string {
        if (this.value) {
            return `Action : ${this.kind} - ${this.value}`
        } else {
            return `Action : ${this.kind}`
        }
    }

}