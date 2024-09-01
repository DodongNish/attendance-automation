import consola from "consola";
import { Page } from "puppeteer";
import { config } from "../configs";
import { sleep } from "../util/sleep";
import { Operation } from "../types";
import { OPERATION } from "../constants";

const buttons = {
	clockIn: "#btn03",
	clockOut: "#btn04",
} as const;

const inOrOut = (operation: Operation): string => {
	return operation === OPERATION.CLOCK_IN ? "in" : "out";
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

	consola.start(`Clocking ${inOrOut(operation)} for you...`);

	// Click 出勤 or 退出
	await page.locator(buttons[operation]).click();

	consola.success(`Congrats! Clocking ${inOrOut(operation)} is done.`);
};
