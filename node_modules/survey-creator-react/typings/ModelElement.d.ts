import { SurveyElementBase } from "survey-react-ui";
export declare class CreatorModelElement<P, S> extends SurveyElementBase<P, S> {
    constructor(props: P);
    shouldComponentUpdate(nextProps: any, nextState: any): boolean;
    protected createModel(props: any): void;
    protected needUpdateModel(nextProps: any): boolean;
    protected getUpdatedModelProps(): string[];
}
