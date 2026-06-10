import type { VotingTransactionInformationType, VoteType } from "@exsit/shared/types/exams";
import { AlertDialog, Badge, Button, Modal, Tag, TagGroup, useOverlayState } from "@heroui/react";
import SupposedOrderCard from "@/components/SupposedOrderCard";
import { Icon } from "@iconify/react";
import { ErrorWall } from "@/components/Walls";
import { useState } from "react";
import { useNavigate } from "react-router";
import useCountdown from "@/hooks/use-countdown";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { PokerChip, PokerControls, PokerTable } from "./poker-shared";
import type { ChipsInformationType } from "./poker-shared";

const calculateRemaining = (
	chipsInformation: ChipsInformationType,
	distribution: Record<number, number>,
) =>
	Object.fromEntries(
		Array.from({ length: chipsInformation.max }, (_, i) => i + 1).map((v) => [
			v,
			chipsInformation.amount - Object.values(distribution).filter((v1) => v === v1).length,
		]),
	);

function CampaignCountdown(props: { campaignStopsAt: Date }) {
	const { hours, minutes, seconds } = useCountdown(props.campaignStopsAt ?? new Date());
	return (
		<NumberFlowGroup>
			<div
				style={{ fontVariantNumeric: "tabular-nums" }}
				className="flex items-baseline text-4xl font-semibold"
			>
				<NumberFlow trend={-1} value={hours} format={{ minimumIntegerDigits: 2 }} />
				<NumberFlow
					prefix=":"
					trend={-1}
					value={minutes}
					digits={{ 1: { max: 5 } }}
					format={{ minimumIntegerDigits: 2 }}
				/>
				<NumberFlow
					prefix=":"
					trend={-1}
					value={seconds}
					digits={{ 1: { max: 5 } }}
					format={{ minimumIntegerDigits: 2 }}
				/>
			</div>
		</NumberFlowGroup>
	);
}

export default function PokerAlgorithmChooser(props: {
	info: Extract<VotingTransactionInformationType, { campaignType: "poker" }>;
	onCast: (vote: VoteType) => void;
}) {
	const navigate = useNavigate();

	const modalState = useOverlayState();
	const [selectedSeat, setSelectedSeat] = useState(-1);
	const [personalDistribution, setPersonalDistribution] = useState<Record<number, number>>(
		props.info.personalDistribution ?? {},
	);
	const remaining = calculateRemaining(props.info.chips, personalDistribution);

	if (!props.info.campaignStopsAt)
		return <ErrorWall text="Голосование настроено неверно (не задано campaignStopsAt)" />;

	return (
		<div className="flex max-w-md flex-col items-center gap-4">
			<p className="text-muted text-center text-xl leading-none">Голосование закончится через</p>
			<CampaignCountdown campaignStopsAt={props.info.campaignStopsAt} />
			<TagGroup selectionMode="multiple" selectedKeys={Object.keys(personalDistribution)}>
				<TagGroup.List className="justify-center">
					{Array.from({ length: props.info.groupSize }, (_, i) => i + 1).map((num) => (
						<Tag
							className="aspect-square w-12 justify-center p-4"
							id={num.toString()}
							onPress={() => {
								setSelectedSeat(num);
								modalState.open();
							}}
							render={(tagProps) => (
								<Badge.Anchor>
									<div {...tagProps}></div>
									{num in props.info.sharedDistribution && (
										<Badge placement="top-right" color="accent" size="sm">
											{props.info.sharedDistribution[num].reduce((acc, cur) => acc + cur, 0)}
										</Badge>
									)}
									{num in personalDistribution && (
										<Badge placement="bottom-left">
											<PokerChip className="size-6" value={personalDistribution[num]} />
										</Badge>
									)}
								</Badge.Anchor>
							)}
						>
							{num}
						</Tag>
					))}
				</TagGroup.List>
			</TagGroup>
			<div className="flex w-full flex-row flex-wrap items-center justify-center gap-2">
				<Button
					variant="secondary"
					onPress={() => queueMicrotask(() => navigate(`/exam/${props.info.exam}`))}
				>
					<Icon icon="mdi:chevron-left" /> Назад
				</Button>

				<Button
					variant="primary"
					onPress={() =>
						props.onCast({
							campaignType: "poker",
							distribution: personalDistribution,
						})
					}
				>
					<Icon icon="mdi:vote" /> Сохранить
				</Button>

				<AlertDialog>
					<Button variant="danger-soft">
						<Icon icon="mdi:emoticon-cool" /> У меня автомат
					</Button>
					<AlertDialog.Backdrop>
						<AlertDialog.Container>
							<AlertDialog.Dialog>
								<AlertDialog.CloseTrigger />
								<AlertDialog.Header>
									<AlertDialog.Icon status="warning" />
									<AlertDialog.Heading>Точно?</AlertDialog.Heading>
								</AlertDialog.Header>
								<AlertDialog.Body>
									<p>
										<b>После отправки голоса его нельзя будет изменить.</b> Если ты не знаешь
										наверняка, лучше выбрать места как запасной вариант.
									</p>
								</AlertDialog.Body>
								<AlertDialog.Footer>
									<Button slot="close" variant="tertiary">
										Надо подумать
									</Button>
									<Button
										slot="close"
										onPress={() =>
											props.onCast({
												campaignType: "exemption",
											})
										}
									>
										<Icon icon="mdi:vote" /> Отправить голос
									</Button>
								</AlertDialog.Footer>
							</AlertDialog.Dialog>
						</AlertDialog.Container>
					</AlertDialog.Backdrop>
				</AlertDialog>
			</div>
			<p className="text-muted text-center text-sm">
				Выбор можно изменить в любой момент
				<br />
				(только не забудь сохранить!)
			</p>
			<SupposedOrderCard supposedOrder={props.info.supposedOrder} />

			{selectedSeat && (
				<Modal.Backdrop
					isOpen={modalState.isOpen}
					onOpenChange={(open) => {
						modalState.setOpen(open);
						if (open) setSelectedSeat(-1);
					}}
				>
					<Modal.Container size="full">
						<Modal.Dialog>
							<Modal.CloseTrigger />
							<Modal.Header>
								<Icon width={48} icon="mdi:cards-playing" />
								<Modal.Heading className="text-xl">
									<p>Место №{selectedSeat}</p>
								</Modal.Heading>
							</Modal.Header>
							<Modal.Body className="flex flex-col items-center justify-center gap-6 lg:flex-row lg:gap-12">
								<PokerTable
									seat={selectedSeat}
									othersChips={props.info.sharedDistribution[selectedSeat] ?? []}
									personalChip={personalDistribution[selectedSeat]}
								/>
								<PokerControls
									chipsInformation={props.info.chips}
									remaining={remaining}
									selected={personalDistribution[selectedSeat]}
									onSelect={(chip) =>
										setPersonalDistribution((c) => {
											const copy = { ...c };
											if (chip === undefined) delete copy[selectedSeat];
											else copy[selectedSeat] = chip;
											return copy;
										})
									}
								/>
							</Modal.Body>
							<Modal.Footer>
								<Button
									className="size-12"
									isIconOnly
									onPress={() => setSelectedSeat(selectedSeat === 1 ? 24 : selectedSeat - 1)}
								>
									<Icon height={72} icon="mdi:arrow-left" />
								</Button>
								<Button slot="close" variant="secondary" className="h-full grow px-10 md:grow-0">
									Назад
								</Button>
								<Button
									className="size-12"
									isIconOnly
									onPress={() => setSelectedSeat(selectedSeat === 24 ? 1 : selectedSeat + 1)}
								>
									<Icon height={72} icon="mdi:arrow-right" />
								</Button>
							</Modal.Footer>
						</Modal.Dialog>
					</Modal.Container>
				</Modal.Backdrop>
			)}
		</div>
	);
}
