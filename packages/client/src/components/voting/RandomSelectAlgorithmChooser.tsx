import { useAuth } from "@/hooks/useAuth";
import type { VotingTransactionInformationType, VoteType } from "@exsit/shared/types/exams";
import { useNavigate } from "react-router";
import { ErrorWall } from "@/components/Walls";
import { AlertDialog, Button, Table } from "@heroui/react";
import { twMerge } from "tailwind-merge";
import { Icon } from "@iconify/react";

export default function RandomSelectAlgorithmChooser(props: {
	info: Extract<VotingTransactionInformationType, { campaignType: "random_select" }>;
	onCast: (vote: VoteType) => void;
}) {
	const navigate = useNavigate();
	const auth = useAuth();

	const groupArray = Object.entries(props.info.group);
	if (!auth) return null;
	const index = props.info.order.at(props.info.current);
	if (!index) return <ErrorWall text="Сервер вернул неправильные данные (index)" />;
	const turn = groupArray.at(index)?.[0];
	if (!turn) return <ErrorWall text="Сервер вернул неправильные данные (turn)" />;

	return (
		<div className="flex max-w-md flex-col items-center gap-4">
			{auth.id !== turn && (
				<>
					<p className="text-center text-2xl leading-none">
						Сейчас не твоя очередь выбирать место.
					</p>
					<p className="text-muted text-center text-sm leading-none">
						Сейчас выбирает
						<br />
						<b> {props.info.group[turn]}</b>
					</p>
				</>
			)}

			<Table className="h-[30dvh]">
				<Table.ScrollContainer>
					<Table.Content className="h-full">
						<Table.Header>
							<Table.Column isRowHeader>Порядок</Table.Column>
							<Table.Column>Студент</Table.Column>
						</Table.Header>

						<Table.Body>
							{props.info.order.map((o, idx) => (
								<Table.Row className={twMerge(o === index && "*:bg-accent")}>
									<Table.Cell>{idx + 1}</Table.Cell>
									<Table.Cell className={twMerge(groupArray.at(o)?.[0] === auth.id && "font-bold")}>
										{groupArray.at(o)?.[1]}
										{groupArray.at(o)?.[0] === auth.id && " (ты)"}
									</Table.Cell>
								</Table.Row>
							))}
						</Table.Body>
					</Table.Content>
				</Table.ScrollContainer>
			</Table>

			<div className="flex w-full flex-row items-center justify-center gap-2">
				<Button variant="secondary" onPress={() => queueMicrotask(() => navigate(-1))}>
					<Icon icon="mdi:chevron-left" /> Назад
				</Button>
				{/* <AlertDialog>
					<Button isDisabled={selectedArray.length !== props.info.pickAmount}>
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
												campaignType: "hungarian",
												topSeats: selectedArray.map((s) => Number(s.toString())),
											})
										}
									>
										<Icon icon="mdi:vote" /> Отправить голос
									</Button>
								</AlertDialog.Footer>
							</AlertDialog.Dialog>
						</AlertDialog.Container>
					</AlertDialog.Backdrop>
				</AlertDialog> */}
			</div>

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
	);
}
