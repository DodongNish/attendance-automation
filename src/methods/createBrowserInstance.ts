import puppeteer from "puppeteer";
import { config } from "../configs";

/** Creates the puppeteer browser instance */
export const createAndConfigureBrowserInstance = async () => {
	// Launch the browser and open a new blank page
	const browser = await puppeteer.launch({
		headless: config.BROWSER_IS_HEADLESS,
		defaultViewport: null,
	});

	const page = await browser.newPage();

	return { browser, page };
};
