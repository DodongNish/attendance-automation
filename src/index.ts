import "dotenv/config";
import { sleep } from "./util/sleep";
import consola from "consola";
import projects from "../projects/projects.json";
import { config } from "./configs";
import { attend } from "./methods/attend";
import { setProjectCodes } from "./methods/setProjectCodes";
import { createAndConfigureBrowserInstance } from "./methods/createBrowserInstance";
import { isValidOperation } from "./util/isValidOperation";

// TODO: 登録完了OKボタンを押して完了にする

// daghan na mamaag jud oy
const main = async () => {
	// Create the browser instance
	const { browser, page } = await createAndConfigureBrowserInstance();

	try {
		// Retrieve operation input from node process arguments
		const [, , operation] = process.argv;

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
