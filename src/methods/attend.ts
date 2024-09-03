import consola from "consola";
import { Page } from "puppeteer";
import { BreakTime, Operation, Options, Project } from "../types";
import { OPERATION } from "../constants";
import { sleep } from "../util/sleep";
import fs from "node:fs";
import path from "node:path";
import { subtract } from "../util/subtract";
import { configs } from "../configs";
import options from "../../options/options.json";

const buttons = {
	clockIn: "#btn03",
	clockOut: "#btn04",
} as const;

/* Utils */
const isClockIn = (operation: Operation): boolean =>
	operation === OPERATION.CLOCK_IN;

const isClockOut = (operation: Operation): boolean =>
	operation === OPERATION.CLOCK_OUT;

const inOrOut = (operation: Operation): string =>
	isClockIn(operation) ? "in" : "out";

const tmpPath = path.resolve(process.cwd(), "tmp");

const register = async (page: Page) => {
	page.once("dialog", async (dialog) => dialog.accept());
	// wait for the event listener to be attached
	await sleep(1000);
	await page.locator("::-p-xpath(//span[contains(text(), '登録')])").click();
};

// Go to 勤怠管理 page of the day from the top page
const goToManagementPage = async (page: Page) => {
	await page
		.locator(
			"::-p-xpath(//div[@class='okiniiri_app' and .//p[contains(text(), '勤怠管理')]])"
		)
		.click();

	const dateToday = new Date().getDate().toString();

	await page
		.locator(
			`::-p-xpath(//a[contains(text(), '${dateToday.padStart(2, "0")}')])`
		)
		.click();
};

const isValidBreaktime = (
	options: unknown
): options is Options & { breaktime: BreakTime } => {
	if (typeof options !== "object" || options == null) return false;
	if (!Object.hasOwn(options, "breaktime")) return false;

	const breaktime = (options as Options & { breaktime: BreakTime }).breaktime;
	if (typeof breaktime !== "object" || breaktime == null) return false;

	if (typeof breaktime.from !== "string") return false;
	if (typeof breaktime.to !== "string") return false;
	return true;
};

/* Processes */

/**
 *  Possible cases:
 *  clockIn & late attendance
 *  clockOut & late attendance
 *  clockOut & on-time attendance & has breaktime
 */
const attendOnManagementPage = async (
	page: Page,
	operation: Operation,
	attendsLate: boolean,
	currentTime: string
) => {
	await goToManagementPage(page);

	const timeInput = (() => {
		if (!attendsLate) return currentTime;
		if (isClockIn(operation)) {
			/* if clockIn & late attendance */
			return "10:00";
		} else {
			/* if clockOut & late attendance  */
			// Calculate what time it should clock out
			const clockedInAt = fs.readFileSync(tmpPath).toString();
			const belatedFor = `00:${clockedInAt.split(":")[1]}`;
			return subtract(currentTime, [belatedFor]);
		}
	})();

	await page
		.locator(`#db_${isClockIn(operation) ? "SYUKKIN" : "TAISYUTU"}_JIKOKU1`)
		.fill(timeInput);

	if (isClockOut(operation) && configs.IS_BREAKTIME_ENABLED) {
		if (!isValidBreaktime(options))
			throw new Error(
				"Breaktime is not properly set. For details on how to set it, go see README.md of this project."
			);
		page.locator("#db_RESTSTR_JIKOKU2").fill(options.breaktime.from);
		page.locator("#db_RESTEND_JIKOKU2").fill(options.breaktime.to);
	}

	await register(page);

	consola.info(`Clocked ${inOrOut(operation)} at "${timeInput}"`);

	if (attendsLate) {
		// handles tmp file for storing attendance time in case of late attendance
		if (isClockIn(operation)) {
			// Record the time of clocking in in a tmp file
			fs.writeFileSync(tmpPath, currentTime);
		} else {
			// Remove the tmp file
			fs.unlinkSync(tmpPath);
		}
	}

	// Go back to the home page for clocking out to set the project codes
	if (isClockOut(operation)) page.locator(".header_itcs a").click();
};

/** Presses down '出勤' or '退勤' depending on the operation */
const attendByClicking = async (page: Page, operation: Operation) => {
	// Click 出勤 or 退出
	await page.locator(buttons[operation]).click();
};

/** Skips clocking in/out when it's already done. */
const isAttendanceSkipped = async (page: Page, operation: Operation) => {
	const elementHandle = await page
		.locator(
			`::-p-xpath(//th[text()='実績']/following-sibling::td[${
				isClockIn(operation) ? "2" : "3"
			}])`
		)
		.waitHandle();

	if (await elementHandle?.evaluate((el) => el.textContent?.includes(":"))) {
		consola.warn(
			`Skipped clocking ${inOrOut(
				operation
			)} because it was already done.`
		);
		return true;
	}

	return false;
};

/** Throws an error when trying to clock out before clocking in. */
const checkClockInStatus = async (page: Page) => {
	const elementHandle = await page
		.locator(`::-p-xpath(//th[text()='実績']/following-sibling::td[2])`)
		.waitHandle();

	if (
		!(await elementHandle?.evaluate((el) => el.textContent?.includes(":")))
	) {
		throw new Error("Make sure you clock in first before clocking out.");
	}
};

/** Presses down '出勤' or '退勤' depending on the operation */
export const attend = async (page: Page, operation: Operation) => {
	if (await isAttendanceSkipped(page, operation)) return;
	if (isClockOut(operation)) await checkClockInStatus(page);

	consola.start(`Hold on, I'm clocking ${inOrOut(operation)} for you.`);

	const currentHours = new Date().getHours();
	const currentMinutes = new Date().getMinutes();

	// Late attendance if the time is from 10:00 to 10:30 or a tmp file exists
	const attendsLate =
		configs.IS_LATECOMER &&
		(isClockIn(operation)
			? currentHours === 10 && currentMinutes <= 30
			: fs.existsSync(tmpPath));

	if ((configs.IS_BREAKTIME_ENABLED && isClockOut(operation)) || attendsLate)
		await attendOnManagementPage(
			page,
			operation,
			attendsLate,
			`${currentHours}:${currentMinutes}`
		);
	else await attendByClicking(page, operation);

	consola.success(`Congrats! Clocking ${inOrOut(operation)} is done.`);
};
