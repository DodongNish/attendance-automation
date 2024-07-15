/** Displays a loading icon in the command line. */
export const displayLoading = () => {
	const P = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
	let x = 0;
	return setInterval(() => {
		process.stdout.write(`\r${P[x++]} `);
		if (x === 10) x = 0;
	}, 80);
};
