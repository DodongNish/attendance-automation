/**
 * Subtracts the sum of the times in the array passed as the second argument from the time passed as the first argument
 *
 * @param startTime - time string in the format of 'HH:MM'
 * @param timesToSubtract - array of time string to subtract from the startTime.
 * @returns time string
 * @example subtract('10:00', ['01:00', '02:00']); // returns '07:00'
 * @example subtract('10:00', ['10:00', '02:00']); // returns '-02:00'
 */
export const subtract = (startTime: string, timesToSubtract: string[]) => {
	// Convert time string to total minutes
	const timeToMinutes = (time: string) => {
		const [hours, minutes] = time.split(":").map(Number);
		return hours * 60 + minutes;
	};

	// Convert total minutes back to time string, allowing for negative times
	const minutesToTime = (minutes: number) => {
		const sign = minutes < 0 ? "-" : "";
		minutes = Math.abs(minutes);
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${sign}${String(hours).padStart(2, "0")}:${String(
			mins
		).padStart(2, "0")}`;
	};

	// Calculate the total minutes of the start time
	let totalMinutes = timeToMinutes(startTime);

	// Subtract each time in the array from the total minutes
	for (const time of timesToSubtract) {
		totalMinutes -= timeToMinutes(time);
	}

	// Convert the result back to time string
	return minutesToTime(totalMinutes);
};
