import { useAuth } from "@/hooks/use-auth";
import type { VotingTransactionInformationType, VoteType } from "@exsit/shared/types/exams";
import {
	AlertDialog,
	Badge,
	Card,
	Label,
	Modal,
	NumberField,
	useOverlayState,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useState } from "react";
import { TagGroup, Tag, Button } from "@heroui/react";
import { useNavigate } from "react-router";
import SupposedOrderCard from "../SupposedOrderCard";

export default function CasinoAlgorithmChooser(props: {
	info: Extract<VotingTransactionInformationType, { campaignType: "casino" }>;
	onCast: (vote: VoteType) => void;
}) {
	const navigate = useNavigate();
	const auth = useAuth();

	const [distribution, setDistribution] = useState<Record<number, number>>(
		props.info.personalDistribution ?? {},
	);
	const [selectedSeat, setSelectedSeat] = useState<number | undefined>(undefined);
	const [betAmount, setBetAmount] = useState<number | undefined>(undefined);
	const betModalState = useOverlayState();

	const pointsLeft =
		props.info.availablePoints - Object.values(distribution).reduce((acc, cur) => acc + cur, 0);
	const maxPerSeatBetAmount = props.info.sharedDistribution
		? Math.max(...Object.values(props.info.sharedDistribution).map((v) => v.amount))
		: undefined;
	const roundMessage =
		props.info.rounds.current === props.info.rounds.total
			? "последний шанс изменить ставки"
			: props.info.rounds.current === 1
				? "выбирай что хочешь"
				: "промежуточный этап";

	if (!auth) return null;
	return (
		<div className="flex max-w-md flex-col items-center gap-4">
			<p className="text-center text-2xl leading-none">Пора делать ставки!</p>
			<p className="text-muted text-center text-sm leading-none">
				Раунд {props.info.rounds.current}/{props.info.rounds.total} &mdash; {roundMessage}
			</p>
			<TagGroup selectionMode="multiple" selectedKeys={Object.keys(distribution)}>
				<TagGroup.List className="justify-center">
					{Array.from({ length: props.info.groupSize }, (_, i) => i + 1).map((num) => (
						<Tag
							className="aspect-square w-12 justify-center p-4"
							id={num.toString()}
							onPress={() => {
								setSelectedSeat(num);
								setBetAmount(num in distribution ? distribution[num] : 0);
								betModalState.open();
							}}
							render={(divProps) => (
								<Badge.Anchor>
									<div {...divProps}></div>
									{num in (props.info.sharedDistribution ?? {}) &&
										props.info.sharedDistribution![num].amount !== 0 && (
											<Badge
												color={
													maxPerSeatBetAmount! - props.info.sharedDistribution![num].amount <= 1
														? "danger"
														: "accent"
												}
											>
												{props.info.sharedDistribution![num].amount}
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

			<div className="flex w-full flex-row items-center justify-center gap-2">
				<Button variant="secondary" onPress={() => queueMicrotask(() => navigate(-1))}>
					<Icon icon="mdi:chevron-left" /> Назад
				</Button>
				<AlertDialog>
					<Button isDisabled={pointsLeft !== 0}>
						<Icon icon="mdi:vote" /> Проголосовать
					</Button>
					<AlertDialog.Backdrop>
						<AlertDialog.Container>
							<AlertDialog.Dialog>
								<AlertDialog.CloseTrigger />
								<AlertDialog.Header>
									<AlertDialog.Icon status="warning" />
									<AlertDialog.Heading>На всякий случай</AlertDialog.Heading>
								</AlertDialog.Header>
								<AlertDialog.Body>
									<p>Пожалуйста, перепроверь выбранные места перед отправкой голоса.</p>
								</AlertDialog.Body>
								<AlertDialog.Footer>
									<Button slot="close" variant="tertiary">
										Надо подумать
									</Button>
									<Button
										slot="close"
										onPress={() =>
											props.onCast({
												campaignType: "casino",
												round: props.info.rounds.current,
												distribution,
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

			{props.info.rounds.current === 1 && (
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
			)}

			<Modal.Backdrop
				isOpen={betModalState.isOpen}
				onOpenChange={(open) => {
					betModalState.setOpen(open);
					if (!open) {
						setSelectedSeat(undefined);
						setBetAmount(undefined);
					}
				}}
			>
				<Modal.Container>
					<Modal.Dialog>
						<Modal.CloseTrigger />
						<Modal.Header>
							<Modal.Heading>Место №{selectedSeat}</Modal.Heading>
						</Modal.Header>
						<Modal.Body className="flex flex-col items-center justify-center gap-2 p-1">
							<>
								{props.info.sharedDistribution &&
									selectedSeat &&
									selectedSeat in props.info.sharedDistribution && (
										<Card variant="secondary" className="text-center">
											{props.info.sharedDistribution[selectedSeat].amount ? (
												<p>
													Претендентов на данное место:{" "}
													<b>{props.info.sharedDistribution[selectedSeat].amount}</b>{" "}
													{selectedSeat in distribution && "(включая тебя)"}
													<br />
													Наивысшая ставка: <b>{props.info.sharedDistribution[selectedSeat].max}</b>
												</p>
											) : (
												<p>На это место нет претендующих студентов.</p>
											)}
										</Card>
									)}
								{pointsLeft !== 0 || (selectedSeat ?? 0) in distribution ? (
									<>
										<NumberField
											variant="secondary"
											defaultValue={0}
											minValue={0}
											maxValue={
												pointsLeft +
												((selectedSeat ?? 0) in distribution ? distribution[selectedSeat!] : 0)
											}
											value={betAmount}
											onChange={setBetAmount}
										>
											<Label>Ставка</Label>
											<NumberField.Group>
												<NumberField.DecrementButton />
												<NumberField.Input />
												<NumberField.IncrementButton />
											</NumberField.Group>
										</NumberField>
										<p>
											Останется баллов:{" "}
											<b>
												{pointsLeft +
													((selectedSeat ?? 0) in distribution ? distribution[selectedSeat!] : 0) -
													(betAmount ?? 0)}
											</b>
										</p>
										{betAmount === props.info.availablePoints && (
											<p className="text-danger">Надеюсь, ты осознаёшь, что делаешь.</p>
										)}
									</>
								) : (
									<>
										<Icon width={48} icon="mdi:emoticon-sad-outline" />
										<p>У тебя не осталось баллов.</p>
									</>
								)}
							</>
						</Modal.Body>
						<Modal.Footer>
							<Button slot="close" variant="secondary">
								Отмена
							</Button>
							<Button
								onPress={() => {
									setDistribution((cur) => {
										if (selectedSeat === undefined || betAmount === undefined) return cur;
										if (!betAmount) {
											const { [selectedSeat]: _, ...rest } = cur;
											return rest;
										}
										return { ...cur, [selectedSeat]: betAmount };
									});
								}}
								slot="close"
							>
								ОК
							</Button>
						</Modal.Footer>
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>

			<SupposedOrderCard supposedOrder={props.info.supposedOrder} />
		</div>
	);
}
