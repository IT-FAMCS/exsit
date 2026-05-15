import { useAuth } from "@/hooks/useAuth";
import type { VotingTransactionInformationType, VoteType } from "@exsit/shared/types/exams";
import { useNavigate } from "react-router";
import { ErrorWall } from "@/components/Walls";
import { AlertDialog, Button, Table, Tag, TagGroup, type Key } from "@heroui/react";
import { twMerge } from "tailwind-merge";
import { Icon } from "@iconify/react";
import { useState } from "react";

export default function RandomSelectAlgorithmChooser(props: {
	info: Extract<VotingTransactionInformationType, { campaignType: "random_select" }>;
	onCast: (vote: VoteType) => void;
}) {
	const navigate = useNavigate();
	const auth = useAuth();

	const [selected, setSelected] = useState<Key | undefined>(undefined);
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

			{auth.id === turn && (
				<>
					<p className="text-center text-2xl leading-none">Пожалуйста, выбери желаемое место.</p>
					<TagGroup
						selectionMode="single"
						selectedKeys={selected ? [selected] : undefined}
						onSelectionChange={(keys) => {
							if (keys !== "all") setSelected(Array.from(keys).at(0));
						}}
					>
						<TagGroup.List className="justify-center">
							{Array.from({ length: groupArray.length }, (_, i) => i + 1).map((num) => (
								<Tag className="aspect-square w-12 justify-center p-4" id={num}>
									{num}
								</Tag>
							))}
						</TagGroup.List>
					</TagGroup>
				</>
			)}

			<div className="flex w-full flex-row items-center justify-center gap-2">
				<Button variant="secondary" onPress={() => queueMicrotask(() => navigate(-1))}>
					<Icon icon="mdi:chevron-left" /> Назад
				</Button>
				{auth.id === turn && (
					<AlertDialog>
						<Button isDisabled={selected === undefined}>
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
													campaignType: "random_select",
													seat: Number(selected!),
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
			</div>

			{auth.id === turn && (
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

			<Table className="h-[30dvh]">
				<Table.ScrollContainer>
					<Table.Content className="h-full">
						<Table.Header>
							<Table.Column isRowHeader>Порядок</Table.Column>
							<Table.Column>Студент</Table.Column>
						</Table.Header>

						<Table.Body>
							{props.info.order.map((o, idx) => (
								<Table.Row className={twMerge(o === index && "*:bg-accent-soft")}>
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
		</div>
	);
}
