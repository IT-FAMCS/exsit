import { useState, useEffect, useCallback } from "react";

export default function useCountdown(targetDate: Date, onEnd?: () => void) {
	const calculateTimeLeft = useCallback(() => {
		const difference = +new Date(targetDate) - +new Date();
		if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
		return {
			//days: Math.floor(difference / (1000 * 60 * 60 * 24)),
			hours: Math.floor(difference / (1000 * 60 * 60)),
			minutes: Math.floor((difference / 1000 / 60) % 60),
			seconds: Math.floor((difference / 1000) % 60),
			ended: false,
		};
	}, [targetDate]);

	const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
	useEffect(() => {
		if (timeLeft.ended) return;

		const timer = setInterval(() => {
			const nextTimeLeft = calculateTimeLeft();
			setTimeLeft(nextTimeLeft);
			if (nextTimeLeft.ended) {
				clearInterval(timer);
				onEnd?.();
			}
		}, 1000);

		return () => clearInterval(timer);
	}, [calculateTimeLeft, onEnd, timeLeft.ended]);

	return timeLeft;
}
