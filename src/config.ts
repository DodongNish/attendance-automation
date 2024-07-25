import { validateEnv } from "./util/validateEnv";

export const config = {
	OZO_URL: validateEnv("OZO_URL"),
	USER_ID: validateEnv("USER_ID"),
	USER_PASSWORD: validateEnv("USER_PASSWORD"),
	BROWSER_IS_HEADLESS: validateEnv("BROWSER_IS_HEADLESS") === "true",
} as const;
