export const validateEnv = (envVarName: string): string => {
	const value = process.env[envVarName];
	if (value == null)
		throw new Error(
			`Make sure you define ${envVarName} in .env file. For further info, go check README.md of this project.`
		);
	return value;
};
