import { Page } from "puppeteer";
import { MainProject, Projects, SubProject } from "../types/project";
import { subtract } from "../util/subtract";
import consola from "consola";
import { Operation } from "../types/operation";
import { OPERATION } from "../constants/operations";

const getSubProjectsForToday = (projects: Projects): SubProject[] => {
	if (projects.sub == null) return [];
	return projects.sub.filter((project) =>
		/* Include if days is not specified, or any of the days matches today */
		project.days != null
			? project.days.some((day) => new Date().getDay() === day)
			: true
	);
};

const getTimeSpentOnMainProject = (
	projects: Projects,
	totalWorkTime: string
): string => {
	const subProjectsForToday = getSubProjectsForToday(projects);
	if (subProjectsForToday == null) return totalWorkTime;

	const timesSpentOnSubProjects = subProjectsForToday.map(
		(project) => project.time as string
	);

	const diff = subtract(totalWorkTime, timesSpentOnSubProjects);

	if (diff.startsWith("-"))
		throw new Error(
			"The time you spent on sub projects must be less than the total time you worked for today..."
		);

	return diff;
};

/** Sets project codes on the 工数管理 page. */
export const setProjectCodes = async (
	page: Page,
	operation: Operation,
	projects: Projects
) => {
	if (operation === OPERATION.CLOCK_IN) return;

	consola.start(`Now I'm setting the project codes for you.`);

	await page.locator("a#div_inputbutton").click();

	const handleFor1stTimeInput = await page
		.locator(`#div_sub_editlist_WORK_TIME_row1 input`)
		.waitHandle();

	// Skip setting project codes if they are already set
	if (await handleFor1stTimeInput.evaluate((el) => el.value.includes(":"))) {
		consola.warn(
			"Skipped setting project codes because they were already set."
		);
		return;
	}

	// Make sure 作業時間残 is changed from the initial value which is either '00:00' or '(00:00)'
	await page
		.locator(
			'::-p-xpath(//div[contains(@class, "footer-content-detail")]//span[position()=3 and not(text()="00:00") and not(text()="(00:00)")])'
		)
		.waitHandle();

	const elementHandle = await page
		.locator(".footer-content-detail span:nth-of-type(3)")
		.waitHandle();

	const totalWorkTime = (await elementHandle?.evaluate((el) =>
		el.textContent?.substring(1, el.textContent.length - 1)
	)) as string;

	const isSubProject = (
		project: SubProject | MainProject
	): project is SubProject => {
		return Object.hasOwn(project, "time");
	};

	const timeSpentOnMainProject = getTimeSpentOnMainProject(
		projects,
		totalWorkTime
	);

	const setProjectCode = async (
		project: MainProject | SubProject,
		inputNumber: number
	) => {
		await page.locator(`#text_project_${inputNumber}`).fill(project.code);
		await page
			.locator(`#div_sub_editlist_WORK_TIME_row${inputNumber} input`)
			.fill(
				isSubProject(project) ? project.time : timeSpentOnMainProject
			);
	};

	// Set MainProject to the first input
	setProjectCode(projects.main, 1);

	const subProjectsForToday = getSubProjectsForToday(projects);
	for (const [index, project] of subProjectsForToday.entries()) {
		// Set project code after main project
		setProjectCode(project, index + 2);
	}

	// Make sure 作業時間残 displays the correct time by clicking anywhere outside the input field
	await page.locator(".button_edit").click();

	// Make sure 作業時間残 is '(00:00)'
	await page
		.locator(
			'::-p-xpath(//div[contains(@class, "footer-content-detail")]//span[position()=3 and text()="(00:00)"])'
		)
		.waitHandle();

	await page.locator("#div_sub_buttons_regist").click();

	consola.success(`Congrats! Project codes are set.`);
};
