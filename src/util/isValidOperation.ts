import { OPERATION } from "../constants";
import { Operation } from "../types";

export const isValidOperation = (operation: string): operation is Operation => {
	return (
		operation === OPERATION.CLOCK_IN || operation === OPERATION.CLOCK_OUT
	);
};
