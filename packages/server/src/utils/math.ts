import { randomInt } from "node:crypto";

export const shuffleArray = <T>(arr: T[]) => {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = randomInt(0, i + 1);
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
};
