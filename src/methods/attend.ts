import consola from "consola";
import { Page } from "puppeteer";
import { config } from "../config";
import { sleep } from "../util/sleep";
import { Operation } from "../types/operation";
import { OPERATION } from "../constants/operations";

const buttons = {
	clockIn: "#btn03",
	clockOut: "#btn04",
} as const;

const inOrOut = (operation: Operation): string => {
	return operation === OPERATION.CLOCK_IN ? "in" : "out";
};

/** Presses down '出勤' or '退勤' depending on the operation */
export const attend = async (page: Page, operation: Operation) => {
	consola.start(`Hold on, I'm clocking ${inOrOut(operation)} for you.`);

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
		throw new Error("Your ID or password is wrong.");

	const elementHandle = await page
		.locator(
			`::-p-xpath(//th[text()='実績']/following-sibling::td[${
				operation === OPERATION.CLOCK_IN ? "2" : "3"
			}])`
		)
		.waitHandle();

	// Skip clocking in when it's already done
	if (await elementHandle?.evaluate((el) => el.textContent?.includes(":"))) {
		consola.warn(
			`Skipped clocking ${inOrOut(
				operation
			)} because it was already done.`
		);
		return;
	}

	// Click 出勤 or 退出
	await page.locator(buttons[operation]).click();

	consola.success(`Clocking ${inOrOut(operation)} is done.`);
};
