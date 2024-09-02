import consola from "consola";
import { Page } from "puppeteer";
import { Operation } from "../types";
import { OPERATION } from "../constants";
import { sleep } from "../util/sleep";
import fs from "node:fs";
import path from "node:path";
import { subtract } from "../util/subtract";
import { config } from "../configs";

const buttons = {
	clockIn: "#btn03",
	clockOut: "#btn04",
} as const;

const inOrOut = (operation: Operation): string => {
	return operation === OPERATION.CLOCK_IN ? "in" : "out";
};

const tmpPath = path.resolve(process.cwd(), "tmp");

const register = async (page: Page) => {
	page.once("dialog", async (dialog) => dialog.accept());
	await page.locator("::-p-xpath(//span[contains(text(), '登録')])").click();
};

/** Go to 勤怠管理 page of the day from the top page */
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

/** Frees people from the submission of late arrival reports */
const clockInLate = async (page: Page, currentTime: string) => {
	await page.locator("#db_SYUKKIN_JIKOKU1").fill("10:00");

	await sleep(1000);

	await register(page);

	console.log("You are clocking In LATE, but it's set as 10:00.");

	// Record the time of clocking in in a tmp file
	fs.writeFileSync(tmpPath, currentTime);
};

const clockOutLate = async (page: Page, currentTime: string) => {
	// Calculate what time it should clock out
	const clockedInAt = fs.readFileSync(tmpPath).toString();
	const belatedFor = `00:${clockedInAt.split(":")[1]}`;
	const clockOutAt = subtract(currentTime, [belatedFor]);

	await page.locator("#db_TAISYUTU_JIKOKU1").fill(clockOutAt);

	await sleep(1000);

	await register(page);

	consola.info(`Clocked Out at "${clockOutAt}"`);

	// Remove the tmp file
	fs.unlinkSync(tmpPath);
};

/** Clock In/Out depending on the operation */
const attendLate = async (
	page: Page,
	operation: Operation,
	currentTime: string
) => {
	consola.start(`Hold on, I'm clocking ${inOrOut(operation)} LATE for you.`);

	await goToManagementPage(page);

	// Set time for clock in/out
	if (operation === OPERATION.CLOCK_IN) await clockInLate(page, currentTime);
	else await clockOutLate(page, currentTime);
};

/** Presses down '出勤' or '退勤' depending on the operation */
const attendOnTime = async (page: Page, operation: Operation) => {
	consola.start(`Hold on, I'm clocking ${inOrOut(operation)} for you.`);
	// Click 出勤 or 退出
	await page.locator(buttons[operation]).click();
};

/** Skips clocking in/out when it's already done. */
const isAttendanceSkipped = async (page: Page, operation: Operation) => {
	const elementHandle = await page
		.locator(
			`::-p-xpath(//th[text()='実績']/following-sibling::td[${
				operation === OPERATION.CLOCK_IN ? "2" : "3"
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
	if (operation === OPERATION.CLOCK_OUT) await checkClockInStatus(page);

	const currentHours = new Date().getHours();
	const currentMinutes = new Date().getMinutes();

	// Late attendance if the time is from 10:00 to 10:30 or a tmp file exists
	const isLate =
		operation === OPERATION.CLOCK_IN
			? currentHours === 10 && currentMinutes <= 30
			: fs.existsSync(tmpPath);

	// TODO: 休憩入力機能をつける。attendByClicking (attendOnTime && 休憩設定なし） or attendOnManagementPage (遅刻、休憩設定あり)

	if (config.IS_LATECOMER && isLate)
		await attendLate(page, operation, `${currentHours}:${currentMinutes}`);
	else await attendOnTime(page, operation);

	consola.success(`Congrats! Clocking ${inOrOut(operation)} is done.`);
};
