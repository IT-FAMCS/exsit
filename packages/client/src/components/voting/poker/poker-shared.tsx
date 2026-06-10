import { Button } from "@heroui/react";
import type { Ref } from "react";
import { twMerge } from "tailwind-merge";
import { AnimatePresence, motion } from "motion/react";
import { randomInteger } from "@/utils/math";
import NumberFlow from "@number-flow/react";

const CHIP_COLORS = [
	"#f94144",
	"#f3722c",
	"#f8961e",
	"#f9844a",
	"#f9c74f",
	"#90be6d",
	"#43aa8b",
	"#4d908e",
	"#577590",
	"#277da1",
];

export type ChipsInformationType = { max: number; amount: number };

export function PokerChip(props: {
	value: number;
	className?: string;
	style?: React.CSSProperties | undefined;
	ref?: Ref<HTMLDivElement>;
}) {
	return (
		<div
			ref={props.ref}
			className={twMerge(
				"rounded-full flex justify-center items-center backface-hidden will-change-transform",
				props.className,
			)}
			style={{
				...props.style,
				backgroundColor: CHIP_COLORS[(props.value - 1) % CHIP_COLORS.length],
				backgroundImage: "repeating-conic-gradient(#00000050 0deg 30deg, #ffffff 30deg 60deg)",
			}}
		>
			<div
				className="@container flex size-3/4 items-center justify-center rounded-full"
				style={{ backgroundColor: CHIP_COLORS[(props.value - 1) % CHIP_COLORS.length] }}
			>
				<p className="text-[60cqw] font-black text-white">{props.value}</p>
			</div>
		</div>
	);
}
const AnimatedPokerChip = motion.create(PokerChip);

export function PokerChipSideways(props: { value: number; className?: string; curve?: boolean }) {
	const color = CHIP_COLORS[(props.value - 1) % CHIP_COLORS.length];
	return (
		<div
			className={twMerge("rounded-full flex justify-center items-center mt-0.5", props.className)}
			style={{
				background: `repeating-linear-gradient(to right, ${color}, ${color} 11%, #ffffff 11%, #ffffff 22%, ${color} 22%, ${color} 33%)`,
				borderRadius: (props.curve ?? false) ? "0 0 50% 50% / 0 0 25% 25%" : "0",
			}}
		/>
	);
}

export function PokerTable(props: { seat: number; othersChips: number[]; personalChip?: number }) {
	const RADIUS_PERCENTAGE = 35;
	return (
		<div className="flex flex-col gap-2">
			<div className="bg-accent-soft @container relative flex aspect-square size-[65dvmin] items-center justify-center overflow-clip rounded-full">
				<AnimatePresence>
					{props.othersChips.map((v, idx) => {
						const angle = (idx * 2 * Math.PI) / props.othersChips.length;
						return (
							<AnimatedPokerChip
								value={v}
								key={`${props.seat}-${idx}`}
								className="absolute size-[15dvmin] -translate-x-1/2 -translate-y-1/2"
								style={{
									left: `${50 + RADIUS_PERCENTAGE * Math.cos(angle)}%`,
									top: `${50 + RADIUS_PERCENTAGE * Math.sin(angle)}%`,
								}}
								initial={{
									scale: 1.25,
									opacity: 0,
									rotate: randomInteger(-10, 10),
									filter: "blur(5px)",
								}}
								animate={{
									scale: 1,
									opacity: 1,
									filter: "blur(0px)",
									transition: { delay: 0.25 + idx * 0.05 },
								}}
								exit={{
									scale: 1.25,
									opacity: 0,
									filter: "blur(5px)",
								}}
							/>
						);
					})}
				</AnimatePresence>
				<NumberFlow value={props.seat} className="text-[35cqw] font-bold text-white" />
				<AnimatePresence>
					{props.personalChip && (
						<AnimatedPokerChip
							key={`${props.seat}-personal-${props.personalChip}`}
							value={props.personalChip}
							className="ring-accent absolute top-1/2 left-1/2 size-[20dvmin] -translate-x-1/2 -translate-y-1/2 ring-8"
							initial={{ scale: 1.25, opacity: 0, rotate: 0, filter: "blur(5px)" }}
							animate={{
								scale: 1,
								opacity: 1,
								rotate: randomInteger(-10, 10),
								filter: "blur(0px)",
								transition: { delay: 0.25 + props.othersChips.length * 0.05 + 0.5 },
							}}
							exit={{
								scale: 1.25,
								opacity: 0,
								rotate: 0,
								filter: "blur(5px)",
							}}
						/>
					)}
				</AnimatePresence>
			</div>
			<p className="text-muted mt-2 text-center">
				{props.othersChips.length !== 0
					? `Ставки: ${Object.entries(Object.groupBy(props.othersChips, (i) => i))
							.map(([chip, v]) => (v ? `${chip} (x${v.length})` : ""))
							.join(", ")}`
					: "Никто пока что не ставил на это место."}
			</p>
		</div>
	);
}

export function PokerControls(props: {
	chipsInformation: ChipsInformationType;
	remaining: Record<number, number>;
	onSelect: (chip?: number) => void;
	selected?: number;
	className?: string;
}) {
	return (
		<div
			className={twMerge(
				"flex flex-row flex-wrap justify-center gap-2 lg:max-w-1/3",
				props.className,
			)}
		>
			{Array.from({ length: props.chipsInformation.max }, (_, i) => i + 1).map((v) => (
				<Button
					variant={props.selected === v ? "primary" : "secondary"}
					isDisabled={props.remaining[v] <= 0 && props.selected !== v}
					onPress={() => props.onSelect(props.selected === v ? undefined : v)}
					className="box-border p-6 lg:h-full lg:flex-[1_1_calc(50%-4px)] lg:p-2"
				>
					<PokerChip value={v} className="size-8 lg:size-16" />
					<p className="w-[2ch] lg:text-xl">{props.remaining[v]}</p>
				</Button>
			))}
		</div>
	);
}
