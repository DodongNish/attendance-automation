export type MainProject = {
	name: string;
	code: string;
};

export type SubProject = {
	name: string;
	code: string;
	time: string;
	days?: number[];
};

export type Projects = {
	main: MainProject;
	sub?: SubProject[];
};
