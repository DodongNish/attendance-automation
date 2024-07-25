import { OPERATION } from "../constants/operations";

export type Operation = (typeof OPERATION)[keyof typeof OPERATION];
