import { validateEnv } from "../util/validateEnv";

export const configs = {
	OZO_URL: validateEnv("OZO_URL"),
	USER_ID: validateEnv("USER_ID"),
	USER_PASSWORD: validateEnv("USER_PASSWORD"),
	BROWSER_IS_HEADLESS: validateEnv("BROWSER_IS_HEADLESS") === "true",
	IS_BREAKTIME_ENABLED: validateEnv("IS_BREAKTIME_ENABLED") === "true",
	IS_LATECOMER: process.env.IS_LATECOMER === "true",
} as const;
