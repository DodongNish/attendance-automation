import { OPERATION } from "../constants";

export type Operation = (typeof OPERATION)[keyof typeof OPERATION];

export type Options = {
	project: Project;
	breaktime?: BreakTime;
};

export type MainProject = {
	name?: string;
	code: string;
};

export type SubProject = {
	name?: string;
	code: string;
	time: string;
	days?: number[];
};

export type Project = {
	main: MainProject;
	subs?: SubProject[];
};

export type BreakTime = {
	from: string;
	to: string;
};
