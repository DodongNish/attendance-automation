import { Page } from "puppeteer";
import { config } from "../configs";
import { sleep } from "../util/sleep";
import consola from "consola";

export const login = async (page: Page) => {
	consola.start(`Logging in...`);

	// Go to login page
	await page.goto(config.OZO_URL);

	// Login
	await page.locator("#login-name").fill(config.USER_ID);
	await page.locator("#login-password").fill(config.USER_PASSWORD);
	await page.locator("#login-btn").click();

	// Wait for 3 seconds to ensure navigation after logging in is complete.
	await sleep(3000);

	// Throw an error if failed to login
	if ((await page.$("#err-font")) != null)
		throw new Error("Your ID or password is wrong.");
};
