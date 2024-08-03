import puppeteer from "puppeteer";
import "dotenv/config";
import { sleep } from "./util/sleep";
import consola from "consola";
import projects from "../projects/projects.json";
import { config } from "./config";
import { attend } from "./methods/attend";
import { setProjectCodes } from "./methods/setProjectCodes";
import { Operation } from "./types/operation";
import { OPERATION } from "./constants/operations";
import { createAndConfigureBrowserInstance } from "./methods/createBrowserInstance";

// TODO: 登録完了OKボタンを押して完了にする

const isValidOperation = (operation: string): operation is Operation => {
	return (
		operation === OPERATION.CLOCK_IN || operation === OPERATION.CLOCK_OUT
	);
};

// daghan na mamaag jud oy
const main = async () => {
	// Retrieve operation input from node process arguments
	const [, , operation] = process.argv;

	// Create the browser instance
	const { browser, page } = await createAndConfigureBrowserInstance();

	try {
		if (!isValidOperation(operation))
			throw new Error(`Invalid Operation: ${operation}`);

		// Press down 出勤 or 退勤
		await attend(page, operation);

		await setProjectCodes(page, operation, projects);

		// Wait for the app to run post-clicking processes before closing the browser instance
		await sleep(3000);

		consola.info(
			`See if it's properly done yourself at ${config.OZO_URL} `
		);
	} catch (err) {
		consola.error(err);
	} finally {
		browser.close();
	}
};

main();
