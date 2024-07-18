import puppeteer, { Browser, Page } from "puppeteer";
import "dotenv/config";
import * as emoji from "node-emoji";
import { displayLoading } from "./util/loading";
import { subtract } from "./util/subtract";
import projects from "./constants/projects.json";
import { sleep } from "./util/sleep";
import { validateEnv } from "./util/validateEnv";

const config = {
	OZO_URL: validateEnv("OZO_URL"),
	USER_ID: validateEnv("USER_ID"),
	USER_PASSWORD: validateEnv("USER_PASSWORD"),
	BROWSER_IS_HEADLESS: validateEnv("BROWSER_IS_HEADLESS") === "true",
} as const;

const buttons = {
	clockIn: "#btn03",
	clockOut: "#btn04",
} as const;

type Operation = keyof typeof buttons;

//TODO: waitForSelectorをlocator('').waitHandleに置き換える。

/** Presses down '出勤' or '退勤' depending on the operation */
const attend = async (_browser: Browser, page: Page, operation: Operation) => {
	progressLog(
		`Hold on, I'm ${
			operation === "clockIn" ? "clocking in" : "clocking out"
		} for you.`
	);

	// Go to login page
	await page.goto(config.OZO_URL);

	// Login
	await page.locator("#login-name").fill(config.USER_ID);
	await page.locator("#login-password").fill(config.USER_PASSWORD);
	await page.locator("#login-btn").click();

	// Wait for 3 seconds to ensure navigation after clicking is complete.
	await sleep(3000);

	// Throw an error if failed to login
	if ((await page.$("#err-font")) != null)
		throw new Error("Your ID or password was wrong.");

	const elementHandle = await page.waitForSelector(
		`xpath///th[text()='実績']/following-sibling::td[${
			operation === "clockIn" ? "2" : "3"
		}]`
	);

	// Skip clocking in when it's already done
	if (await elementHandle?.evaluate((el) => el.textContent?.includes(":"))) {
		progressLog("Skipped clocking in because it was already done.");
		return;
	}

	// Click 出勤 or 退出
	await page.locator(buttons[operation]).click();

	progressLog(
		`${operation === "clockIn" ? "Clocking in" : "Clocking out"} is done.`
	);
};

/** Sets project codes on the 工数管理 page. */
const setProjectCodes = async (page: Page, operation: Operation) => {
	if (operation === "clockIn") return;

	const timeSpentOnMainProject = (totalWorkTime: string): string => {
		const timesSpentOnSubProjects = projects
			.filter(
				(project) =>
					project.time != null && new Date().getDay() === project.day
			)
			.map((project) => project.time as string);

		const result = subtract(totalWorkTime, timesSpentOnSubProjects);

		if (result.startsWith("-"))
			throw new Error(
				"The time you spent on sub projects must be less than the total time you worked for today..."
			);

		return result;
	};

	progressLog(`Now I'm setting the project codes for you.`);

	await page.locator("a#div_inputbutton").click();

	const handleFor1stTimeInput = await page
		.locator(`#div_sub_editlist_WORK_TIME_row1 input`)
		.waitHandle();

	// Skip setting project codes if they are already set
	if (
		await handleFor1stTimeInput.evaluate((el) =>
			el.textContent?.includes(":")
		)
	) {
		progressLog(
			"Skipped setting project codes because they were already set."
		);
		return;
	}

	// Make sure 作業時間残 is changed from the initial value which is either '00:00' or '(00:00)'
	await page.waitForSelector(
		'xpath///div[contains(@class, "footer-content-detail")]//span[position()=3 and not(text()="00:00") and not(text()="(00:00)")]'
	);

	const elementHandle = await page.waitForSelector(
		".footer-content-detail span:nth-of-type(3)"
	);
	const totalWorkTime = (await elementHandle?.evaluate((el) =>
		el.textContent?.substring(1, el.textContent.length - 1)
	)) as string;

	for (const [index, project] of projects.entries()) {
		if (project.day != null && new Date().getDay() !== project.day)
			continue;

		await page.locator(`#text_project_${index + 1}`).fill(project.code);
		await page
			.locator(`#div_sub_editlist_WORK_TIME_row${index + 1} input`)
			.fill(
				project.time != null
					? project.time
					: timeSpentOnMainProject(totalWorkTime)
			);
	}

	// Make sure 作業時間残 displays the correct time by clicking anywhere outside the input field
	await page.locator(".button_edit").click();

	// Make sure 作業時間残 is '(00:00)'
	await page.waitForSelector(
		'xpath///div[contains(@class, "footer-content-detail")]//span[position()=3 and text()="(00:00)"]'
	);

	await page.locator("#div_sub_buttons_regist").click();

	progressLog(`Congrats! Project codes are set.`);
};

/** Creates the puppeteer browser instance */
const createAndConfigureBrowserInstance = async () => {
	// Launch the browser and open a new blank page
	const browser = await puppeteer.launch({
		headless: config.BROWSER_IS_HEADLESS,
	});
	const page = await browser.newPage();

	// Set screen size to default
	await page.setViewport(null);

	return { browser, page };
};

/** Checks if the operation string passed as an argument is either 'clockIn' or 'clockOut' */
const isValidOperation = (operation: string): operation is Operation => {
	if (operation == null) {
		throw new Error(
			`You forgot to specify what operation you wanna perform.\nIt's either 'clockIn' or 'clockOut'.`
		);
	} else if (!(operation === "clockIn" || operation === "clockOut")) {
		throw new Error(
			`What the heck are you doin? '${operation}' is not a valid operation.\nIt should either be 'clockIn' or 'clockOut'.`
		);
	}
	return true;
};

/** Validates the projects set as constants */
const validateProjects = () => {
	const mainProject = projects.filter((project) => project.time == null);
	if (mainProject.length !== 1)
		throw new Error(
			"There should be strictly 1 main project with no time specified. For further info, go check README.md of this project."
		);
	if (projects.length - 1 > 5) {
		throw new Error(
			"You can set up to 5 sub projects. Not more than that."
		);
	}
};

/** Console logs the message with reversed color. */
const progressLog = (message: string) =>
	console.log(`\x1b[7m%s${emoji.get("coffee")}\x1b[0m`, message);

// daghan na mamaag jud oy
const main = async () => {
	// Retrieve operation input from node process arguments
	const [, , operation] = process.argv;

	// Display loading icon
	const intervalId = displayLoading();

	// Create the browser instance
	const { browser, page } = await createAndConfigureBrowserInstance();

	try {
		if (!isValidOperation(operation)) return;

		validateProjects();

		// Press down 出勤 or 退勤
		await attend(browser, page, operation);

		// Wait for 80ms or display purposes
		await sleep(80);

		await setProjectCodes(page, operation);

		// Wait for 80ms or display purposes
		await sleep(80);

		progressLog(`See if it's properly done yourself at ${config.OZO_URL} `);
	} catch (err) {
		console.error(
			`Bro...${emoji.get("tired_face")} %s${emoji.get("sob")}`,
			(err as Error).message
		);
	} finally {
		clearInterval(intervalId);
		browser.close();
	}
};

main();
