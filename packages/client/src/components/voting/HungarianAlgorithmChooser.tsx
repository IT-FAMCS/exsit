import type { VoteType, VotingTransactionInformationType } from "@exsit/shared/types/exams";
import { AlertDialog, Badge, Button, Tag, TagGroup, type Key } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import SupposedOrderCard from "../SupposedOrderCard";

export default function HungarianAlgorithmChooser(props: {
	info: Extract<VotingTransactionInformationType, { campaignType: "hungarian" }>;
	onCast: (vote: VoteType) => void;
}) {
	const navigate = useNavigate();
	const [selected, setSelected] = useState<Set<Key>>(new Set());
	const selectedArray = [...selected];

	return (
		<div className="flex max-w-md flex-col items-center gap-4">
			<p className="text-center text-2xl leading-none">
				Пожалуйста, выбери топ-<b>{props.info.pickAmount}</b> желаемых мест.
			</p>
			<p className="text-muted text-center text-sm leading-none">
				В порядке убывания приоритета
				<br />(<b>1</b> - самое желаемое)
			</p>
			<TagGroup
				selectionMode="multiple"
				selectedKeys={selected}
				onSelectionChange={(keys) => {
					if (keys !== "all" && keys.size <= props.info.pickAmount) setSelected(keys);
				}}
			>
				<TagGroup.List className="justify-center">
					{Array.from({ length: props.info.groupSize }, (_, i) => i + 1).map((num) => (
						<Tag
							className="aspect-square w-12 justify-center p-4"
							id={num}
							render={(props) => (
								<Badge.Anchor>
									<div {...props}></div>
									{selected.has(num) && (
										<Badge color="accent">{selectedArray.indexOf(num) + 1}</Badge>
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
				</AlertDialog>
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

			<SupposedOrderCard supposedOrder={props.info.supposedOrder} />
		</div>
	);
}
