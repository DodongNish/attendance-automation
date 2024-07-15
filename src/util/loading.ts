/** Displays a loading icon in the command line. */
export const displayLoading = () => {
	const P = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
	let x = 0;
	return setInterval(() => {
		process.stdout.write(`\r${P[x++]} `);
		if (x === P.length) x = 0;
	}, 80);
};
