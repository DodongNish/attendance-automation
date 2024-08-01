import { Page } from "puppeteer";
import { MainProject, Projects, SubProject } from "../types/project";
import { subtract } from "../util/subtract";
import consola from "consola";
import { Operation } from "../types/operation";
import { OPERATION } from "../constants/operations";
import { sleep } from "../util/sleep";

const getSubProjectsForToday = (projects: Projects): SubProject[] => {
	if (projects.subs == null) return [];
	return projects.subs.filter((project) =>
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

const isValidProjects = (projects: unknown): projects is Projects => {
	if (typeof projects !== "object" || projects == null) return false;

	/* Validate Main Project */
	const mainProject = (projects as Projects).main;
	if (typeof mainProject !== "object" || mainProject == null) return false;

	if (typeof mainProject.code !== "string") return false;

	/* Validate Sub Projects */
	const subProjects = (projects as Projects).subs;

	// Projects are valid without sub projects. They are arbitrary.
	if (subProjects == null) return true;

	if (!Array.isArray(subProjects)) return false;

	for (const subProject of subProjects) {
		if (typeof subProject !== "object" || subProject == null) return false;
		if (
			typeof subProject.code !== "string" ||
			typeof subProject.time !== "string"
		)
			return false;

		// Days property is arbitrary.
		if (subProject.days == null) continue;
		if (!Array.isArray(subProject.days)) return false;

		if (!subProject.days.every((day) => typeof day === "number"))
			return false;
	}

	return true;
};

const isSubProject = (
	project: SubProject | MainProject
): project is SubProject => {
	return Object.hasOwn(project, "time");
};

const logTotalWorkTime = (totalWorkTime: string) => {
	const [hoursWorked, minutesWorked] = totalWorkTime.split(":");
	consola.info(
		`You worked for ${hoursWorked} hours and ${minutesWorked} minutes today. お疲れ様でした。`
	);
};

/** Sets project codes on the 工数管理 page. */
export const setProjectCodes = async (
	page: Page,
	operation: Operation,
	projects: unknown
) => {
	if (operation === OPERATION.CLOCK_IN) return;
	if (!isValidProjects(projects))
		throw new Error("Projects are not properly set.");

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

	// Add a listener on dialog events to throw an error if the project code doesn't exist
	let wrongCodeMsg = "";
	page.once("dialog", async (dialog) => {
		wrongCodeMsg = dialog.message();
	});

	// Set MainProject to the first input
	await setProjectCode(projects.main, 1);

	const subProjectsForToday = getSubProjectsForToday(projects);
	for (const [index, project] of subProjectsForToday.entries()) {
		// Set sub projects after main project
		await setProjectCode(project, index + 2);
	}

	// Prevent the site to reject inputs due to consecutive inputs
	await sleep(1000);

	if (wrongCodeMsg !== "") throw new Error(wrongCodeMsg);

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

	logTotalWorkTime(totalWorkTime);
};
