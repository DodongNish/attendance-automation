import puppeteer, { Browser, Page } from "puppeteer";
import "dotenv/config";
import * as emoji from "node-emoji";
import { displayLoading } from "./util/loading";
import { subtract } from "./util/subtract";
import projects from "./constants/projects.json";
import { sleep } from "./util/sleep";

const OZO_URL = process.env.OZO_URL;
const USER_ID = process.env.USER_ID;
const USER_PASSWORD = process.env.USER_PASSWORD;
const BROWSER_IS_HEADLESS = process.env.BROWSER_ID_HEADLESS === "true";

// Throw an error if env variables are not set.
const setEnvMsg = "Make sure you set it in .env file in the root directory.";
if (OZO_URL == null) throw new Error(`OZO_URL is not set.${setEnvMsg}`);
if (USER_ID == null) throw new Error(`USER_ID is not set.${setEnvMsg}`);
if (USER_PASSWORD == null)
	throw new Error(`USER_PASSWORD is not set.${setEnvMsg}`);

const buttons = {
	clockIn: "#btn03",
	clockOut: "#btn04",
} as const;

type Operation = keyof typeof buttons;

/** Presses down '出勤' or '退勤' depending on the operation */
const attend = async (_browser: Browser, page: Page, operation: Operation) => {
	progressLog(
		`Hold on, I'm ${
			operation === "clockIn" ? "clocking in" : "clocking out"
		} for you.`
	);

	// Go to login page
	await page.goto(OZO_URL);

	// Login
	await page.locator("#login-name").fill(USER_ID);
	await page.locator("#login-password").fill(USER_PASSWORD);
	await page.locator("#login-btn").click();

	// TODO: ログイン失敗時のエラー処理

	// Attendance Page
	// TODO: ここclick()にする
	await page.locator(buttons[operation]).hover();

	progressLog(
		`${operation === "clockIn" ? "Clocking in" : "Clocking out"} is done.`
	);
};

/** Sets project codes on the 工数管理 page. */
const setProjectCodes = async (page: Page, operation: Operation) => {
	if (operation === "clockIn") return;
	const timeSpentOnMainProject = (totalWorkTime: string): string => {
		const timesSpentOnSubProjects = projects
			.filter((project) => project.time != null)
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
	const ramainingWorkTimeBefore = await page.waitForSelector(
		".footer-content-detail span:nth-of-type(3)"
	);
	let totalWorkTime = (await ramainingWorkTimeBefore?.evaluate(
		(el) => el.textContent
	)) as string;

	// TODO: totalWorkTimeを実際の値を使うように、以下の行を削除。
	totalWorkTime = "12:00";

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

	// Wait for 1500ms to make sure the remaining work time is refreshed.
	await sleep(1500);

	// Make sure the value of 作業時間残 is '(00:00)'
	const ramainingWorkTimeAfter = await page.waitForSelector(
		".footer-content-detail span:nth-of-type(3)"
	);
	if (
		((await ramainingWorkTimeAfter?.evaluate(
			(el) => el.textContent
		)) as string) !== "(00:00)"
	) {
		// This error means the implementation is wrong.
		throw new Error(
			"The time you worked on projects never matches your total worktime today... Not sure why..."
		);
	}

	// TODO: clickに置換
	await page.locator("#div_sub_buttons_regist").hover();

	progressLog(`Congrats! Project codes are set.`);
};

/** Creates the puppeteer browser instance */
const createAndConfigureBrowserInstance = async () => {
	// Launch the browser and open a new blank page
	const browser = await puppeteer.launch({
		headless: BROWSER_IS_HEADLESS,
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
			`You forgot to specify what operation you wanna perform.\nIt's either 'clockIn' or 'clockOut'. Do you even have a brain?`
		);
	} else if (!(operation === "clockIn" || operation === "clockOut")) {
		throw new Error(
			`What the hell are you doing? '${operation}' is not a valid operation.\nHow many times do I have to tell you it should either be 'clockIn' or 'clockOut'?`
		);
	}
	return true;
};

/** Validates the projects set as constants */
const validateProject = () => {
	const mainProject = projects.filter((project) => project.time == null);
	if (mainProject.length !== 1)
		throw new Error(
			"There should be strictly 1 main project with no time specified."
		);
};

/** Console logs the message with reversed color. */
const progressLog = (message: string) =>
	console.log(`\x1b[7m%s${emoji.get("coffee")}\x1b[0m`, message);

const main = async () => {
	// Retrieve operation input from node process arguments
	const [, , operation] = process.argv;

	// Display loading icon
	const intervalId = displayLoading();

	// Create the browser instance
	const { browser, page } = await createAndConfigureBrowserInstance();

	try {
		// daghan na mamaag jud oy

		// Validate operation input
		if (!isValidOperation(operation)) return;

		// Validate the projects set as constants
		validateProject();

		await attend(browser, page, operation);

		// Wait for 80ms or display purposes
		await sleep(80);

		await setProjectCodes(page, operation);

		progressLog(
			`Have a nice rest of the day. See if it's properly done yourself here: ${OZO_URL}`
		);
	} catch (err: unknown) {
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
