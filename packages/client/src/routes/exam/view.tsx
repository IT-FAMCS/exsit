import Logo from "@/components/Logo";
import { defaultHandler, expandedFetch, route } from "@/utils/fetch";
import {
	GetPreparationMaterialsResponse,
	GetSpecificExamResponse,
	GetVotingCampaignsResponse,
	type ExamType,
	type PreparationMaterialsType,
	type VotingCampaignsType,
	type VotingCampaignType,
} from "@exsit/shared/types/exams";
import { Button, Card, Chip, Link, ScrollShadow, Separator, Spinner, Tabs } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import prettyBytes from "pretty-bytes";
import { Pressable } from "react-aria-components";
import Confetti from "react-confetti-boom";

function MaterialsContainer(props: { title: string; materials: PreparationMaterialsType }) {
	return (
		<div className="flex w-full flex-col gap-2">
			<div className="flex flex-row items-center gap-2 overflow-x-hidden">
				<p>{props.title}</p>
				<Separator />
			</div>
			{props.materials.length !== 0 ? (
				props.materials.map((m) => (
					<Card className="w-full flex-row items-center">
						<div className="bg-accent-soft flex aspect-square h-full items-center justify-center rounded-xl p-1.5">
							{m.type === "file" ? (
								<Icon width={32} icon="mdi:file" />
							) : (
								<Icon width={32} icon="mdi:link-variant" />
							)}
						</div>
						<div className="flex w-full flex-row justify-between">
							<div className="flex flex-col gap-4">
								<Card.Header className="*:text-start">
									<Card.Title>{m.type === "file" ? m.meta.filename : m.link}</Card.Title>
									{m.type === "file" && (
										<Card.Description>
											{prettyBytes(m.meta.size, { locale: "ru" })}
										</Card.Description>
									)}
								</Card.Header>
							</div>
							<Link href={m.type === "file" ? route(`/files/${m.id}`) : m.link} target="_blank">
								<Button isIconOnly>
									{m.type === "file" ? (
										<Icon icon="mdi:download" />
									) : (
										<Icon icon="mdi:open-in-new" />
									)}
								</Button>
							</Link>
						</div>
					</Card>
				))
			) : (
				<Card className="text-muted items-center justify-center gap-1 p-4">
					<Icon icon="mdi:emoticon-sad-outline" width={48} />
					<p>Нет материалов</p>
				</Card>
			)}
		</div>
	);
}

const CAMPAIGN_TYPES: Record<VotingCampaignType["options"]["type"], string> = {
	casino: "Казино",
	hungarian: "Венгерский алгоритм",
	random_select: "Перемешанная выборка",
};

const CAMPAIGN_STATUSES: Record<VotingCampaignType["status"], string> = {
	created: "Голосование создано. Ожидай начала",
	finished: "Голосование Завершено. Можно посмотреть результаты",
	voting_ended: "Голосование окончено. Ожидай подсчёта результатов",
	voting_started: "Голосование начато. Нажми чтобы проголосовать",
};

function CampaignCard(props: { id: string; campaign: VotingCampaignType }) {
	const navigate = useNavigate();

	return (
		<Pressable
			onPress={
				props.campaign.status !== "created" && props.campaign.status !== "voting_ended"
					? () => navigate(`/vote/${props.id}`)
					: undefined
			}
		>
			<Card className="pressable-card w-full" role="button">
				<Card.Header className="flex flex-row items-center gap-2">
					<Icon width={32} icon="mdi:vote" />
					<Card.Title className="text-start text-lg">
						{CAMPAIGN_TYPES[props.campaign.options.type]}
					</Card.Title>
				</Card.Header>
				<Card.Content className="text-muted flex w-full flex-row gap-2">
					<p>{CAMPAIGN_STATUSES[props.campaign.status]}</p>
				</Card.Content>
			</Card>
		</Pressable>
	);
}

export default function ViewExamDetailsRoute() {
	const params = useParams();
	const location = useLocation();
	const navigate = useNavigate();

	const [celebrate, setCelebrate] = useState(false);

	const [examDetails, setExamDetails] = useState<ExamType | undefined>(undefined);
	const [examMaterials, setExamMaterials] = useState<PreparationMaterialsType | undefined>(
		undefined,
	);
	const [examQuestionsMaterials, setExamQuestionsMaterials] = useState<
		PreparationMaterialsType | undefined
	>(undefined);
	const [examCampaigns, setExamCampaigns] = useState<VotingCampaignsType | undefined>(undefined);

	const examDetailsFetch = useQuery({
		queryKey: ["get-exam", params.exam],
		queryFn: async () =>
			await expandedFetch(`/exams/${params.exam}`, { output: GetSpecificExamResponse }),
	});
	const examQuestionsMaterialsFetch = useQuery({
		queryKey: ["get-exam-materials", params.exam, "questions"],
		queryFn: async () =>
			await expandedFetch(`/exams/${params.exam}/materials`, {
				output: GetPreparationMaterialsResponse,
				query: { tag: "questions" },
			}),
	});
	const examMaterialsFetch = useQuery({
		queryKey: ["get-exam-materials", params.exam],
		queryFn: async () =>
			await expandedFetch(`/exams/${params.exam}/materials`, {
				output: GetPreparationMaterialsResponse,
			}),
	});
	const examCampaignsFetch = useQuery({
		queryKey: ["get-exam-campaigns", params.exam],
		queryFn: async () =>
			await expandedFetch(`/exams/${params.exam}/campaigns`, {
				output: GetVotingCampaignsResponse,
			}),
	});

	useEffect(() => {
		if (location.pathname !== `/exam/${params.exam}`) {
			setCelebrate(false);
			return;
		}
		if (celebrate) return;
		const hasKey = !!sessionStorage.getItem("celebrate");
		setCelebrate(hasKey);
		if (hasKey) queueMicrotask(() => sessionStorage.removeItem("celebrate"));
	}, [location, celebrate, params]);

	useEffect(() => {
		if (!examDetailsFetch.data) return;
		defaultHandler(examDetailsFetch.data, {
			errorMessages: {
				invalidExamID: "Неверный ID экзамена",
				invalidGroupCode: "Неверный код группы",
			},
			onError: () => navigate("/"),
			onSuccess: (data) => setExamDetails(data),
		});
	}, [examDetailsFetch, navigate]);

	useEffect(() => {
		if (!examQuestionsMaterialsFetch.data) return;
		defaultHandler(examQuestionsMaterialsFetch.data, {
			errorMessages: {
				invalidExamID: "Неверный ID экзамена",
				invalidGroupCode: "Неверный код группы",
				missingFileMetadata: "Не удалось найти данные о файлах",
			},
			onSuccess: (data) => setExamQuestionsMaterials(data),
		});
	}, [examQuestionsMaterialsFetch, navigate]);

	useEffect(() => {
		if (!examMaterialsFetch.data) return;
		defaultHandler(examMaterialsFetch.data, {
			errorMessages: {
				invalidExamID: "Неверный ID экзамена",
				invalidGroupCode: "Неверный код группы",
				missingFileMetadata: "Не удалось найти данные о файлах",
			},
			onSuccess: (data) => setExamMaterials(data),
		});
	}, [examMaterialsFetch, navigate]);

	useEffect(() => {
		if (!examCampaignsFetch.data) return;
		defaultHandler(examCampaignsFetch.data, {
			errorMessages: {
				invalidExamID: "Неверный ID экзамена",
				invalidGroupCode: "Неверный код группы",
				failedToGetStatistics: "Не удалось получить статистику голосований",
			},
			onError: () => navigate("/"),
			onSuccess: (data) => setExamCampaigns(data),
		});
	}, [examCampaignsFetch, navigate]);

	useEffect(() => {
		setExamCampaigns(undefined);
	}, [location]);

	if (!params.exam) {
		navigate("/");
		return null;
	}

	const loading =
		examDetailsFetch.isFetching ||
		examQuestionsMaterialsFetch.isFetching ||
		examMaterialsFetch.isFetching ||
		examCampaignsFetch.isFetching;

	return (
		<div className="relative flex h-dvh w-dvw flex-col items-center justify-center p-4">
			{loading ? (
				<Spinner />
			) : (
				<div className="flex w-full max-w-md flex-col items-center justify-center gap-4">
					<Logo className="text-accent w-64" />
					<p className="text-center text-4xl font-bold">{examDetails?.subject}</p>
					<Tabs className="w-full">
						<Tabs.ListContainer>
							<Tabs.List>
								<Tabs.Tab id="campaigns" className="gap-2">
									<Icon icon="mdi:vote" width={18} />
									Голосования
									<Chip variant="soft" color="accent">
										{Object.keys(examCampaigns ?? {}).length}
									</Chip>
									<Tabs.Indicator />
								</Tabs.Tab>
								<Tabs.Tab id="materials" className="gap-2">
									<Icon icon="mdi:bookshelf" width={18} />
									Материалы
									<Chip variant="soft" color="accent">
										{(examMaterials ?? []).length + (examQuestionsMaterials ?? []).length}
									</Chip>
									<Tabs.Indicator />
								</Tabs.Tab>
							</Tabs.List>
						</Tabs.ListContainer>
						<Tabs.Panel id="campaigns">
							<ScrollShadow className="max-h-[40dvh]">
								<div className="flex flex-col gap-2">
									{Object.entries(examCampaigns ?? {}).map((kv) => (
										<CampaignCard id={kv[0]} key={kv[0]} campaign={kv[1]} />
									))}
								</div>
							</ScrollShadow>
						</Tabs.Panel>
						<Tabs.Panel id="materials">
							<ScrollShadow className="max-h-[30dvh]">
								<div className="flex flex-col items-center gap-2 px-2 text-center">
									<MaterialsContainer title="Вопросы" materials={examQuestionsMaterials ?? []} />
									<MaterialsContainer title="Прочее" materials={examMaterials ?? []} />
								</div>
							</ScrollShadow>
						</Tabs.Panel>
					</Tabs>
					<Button onPress={() => navigate("/")}>
						<Icon icon="mdi:chevron-left" /> На главную
					</Button>
				</div>
			)}

			{celebrate && (
				<Confetti
					className="pointer-events-none absolute h-dvh w-dvw"
					mode="boom"
					particleCount={50}
					launchSpeed={2.5}
					y={1}
					x={0.5}
					deg={270}
					effectCount={1}
				/>
			)}
		</div>
	);
}
