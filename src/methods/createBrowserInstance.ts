import puppeteer from "puppeteer";
import { config } from "../configs";

/** Creates the puppeteer browser instance */
export const createAndConfigureBrowserInstance = async () => {
	// Launch the browser and open a new blank page
	const browser = await puppeteer.launch({
		headless: config.BROWSER_IS_HEADLESS,
	});
	const page = await browser.newPage();

	// skip downloading images, stylesheets, or fonts when the browser is headless
	if (config.BROWSER_IS_HEADLESS) {
		await page.setRequestInterception(true);
		page.on("request", (request) => {
			if (
				["image", "stylesheet", "font"].indexOf(
					request.resourceType()
				) !== -1
			) {
				request.abort();
			} else {
				request.continue();
			}
		});
	}

	// Set screen size to default
	await page.setViewport(null);

	return { browser, page };
};
