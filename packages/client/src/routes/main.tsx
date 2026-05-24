import Logo from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
import { defaultHandler, expandedFetch } from "@/utils/fetch";
import {
	GetExamsResponse,
	SUPPORTED_CAMPAIGN_TYPES,
	type ExamType,
} from "@exsit/shared/types/exams";
import { Card, Chip, Kbd, Link, ScrollShadow, Separator, Tabs } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Pressable } from "react-aria-components";

function ExamCard(props: { id: string; exam: ExamType }) {
	const navigate = useNavigate();
	const daysUntilExam = props.exam.date
		? Math.floor((props.exam.date.getTime() - Date.now()) / 86400000)
		: -1;
	const formatted = new Intl.DurationFormat("ru-RU", { style: "long" }).format({
		days: daysUntilExam,
	});

	return (
		<Pressable onPress={() => navigate(`/exam/${props.id}`)}>
			<Card className="pressable-card w-full" role="button">
				<Card.Header className="flex flex-row items-center gap-2">
					<Card.Title className="flex items-center justify-center gap-2 text-start text-lg">
						<Icon width={32} icon="mdi:emoticon-cry-outline" className="min-w-8" />{" "}
						<p className="grow text-start text-lg leading-none">{props.exam.subject}</p>
					</Card.Title>
				</Card.Header>
				<Card.Content className="text-muted flex w-full flex-row gap-2 px-4">
					<div className="flex flex-col items-start justify-start gap-2">
						<div className="flex flex-row gap-1">
							<Icon icon="mdi:calendar" width={24} />
							<p>
								{props.exam.date
									? `${props.exam.date.toLocaleDateString("ru-RU")} (${formatted})`
									: "Неизвестно"}
							</p>
						</div>
						<div className="flex flex-row gap-1">
							<Icon icon="mdi:map-marker-radius" width={24} />
							<p>{props.exam.class ?? "Неизвестно"}</p>
						</div>
						<div className="flex flex-row gap-1">
							<Icon icon="mdi:account" width={24} className="min-w-6" />
							<p className="text-start wrap-break-word">{props.exam.teacher}</p>
						</div>
					</div>
				</Card.Content>
			</Card>
		</Pressable>
	);
}

export default function MainRoute() {
	const auth = useAuth();
	const navigate = useNavigate();
	const group = auth?.role === "student" ? auth.group.id : "";

	const [exams, setExams] = useState<Record<string, ExamType> | undefined>(undefined);
	const examsFetch = useQuery({
		queryKey: ["get-exams", group],
		queryFn: async () =>
			await expandedFetch(`/groups/${group}/exams`, {
				output: GetExamsResponse,
			}),
		enabled: !!group,
	});

	useEffect(() => {
		if (!examsFetch.data) return;
		defaultHandler(examsFetch.data, {
			errorMessages: {
				invalidGroupCode: "Неверный код группы (внутренняя ошибка сервера)",
			},
			onSuccess: (ex) => setExams(ex),
		});
	}, [examsFetch]);

	if (!auth) return null;
	if (auth.role === "admin") {
		navigate("/admin");
		return null;
	}

	return (
		<div className="flex min-h-dvh w-dvw items-center justify-center p-4">
			<div className="flex w-full max-w-md flex-col items-center justify-center gap-4">
				<Logo className="text-accent w-64" />
				<p className="text-4xl font-bold">Привет, {auth.informalFirstName}!</p>
				<Tabs className="w-full">
					<Tabs.ListContainer>
						<Tabs.List>
							<Tabs.Tab id="exams" className="gap-2">
								<Icon icon="mdi:bookmark" width={18} />
								Экзамены
								{exams && (
									<Chip variant="soft" color="accent">
										{Object.keys(exams).length}
									</Chip>
								)}
								<Tabs.Indicator />
							</Tabs.Tab>
							<Tabs.Tab id="algorithms" className="gap-2">
								<Icon icon="mdi:abacus" width={18} />
								Алгоритмы
								<Chip variant="soft" color="accent">
									{Object.keys(SUPPORTED_CAMPAIGN_TYPES).length}
								</Chip>
								<Tabs.Indicator />
							</Tabs.Tab>
						</Tabs.List>
					</Tabs.ListContainer>
					<Tabs.Panel className="pt-4" id="exams">
						<ScrollShadow className="max-h-[40dvh]">
							<div className="flex flex-col gap-2">
								{exams &&
									Object.entries(exams).map((kv) => (
										<ExamCard id={kv[0]} key={kv[0]} exam={kv[1]} />
									))}
							</div>
						</ScrollShadow>
					</Tabs.Panel>
					<Tabs.Panel
						className="text-muted flex flex-col items-center justify-center gap-1 pt-4"
						id="algorithms"
					>
						<Icon width={48} icon="mdi:emoticon-sad-outline" />
						<p>Раздел (пока что) не написан</p>
					</Tabs.Panel>
				</Tabs>
				<div className="*:text-muted flex flex-row items-center justify-center gap-2">
					<Link
						className="no-underline"
						target="_blank"
						href={import.meta.env.VITE_APP_LAST_COMMIT_LINK}
					>
						<Kbd className="font-mono">
							<Kbd.Content>
								v{import.meta.env.VITE_APP_VERSION}{" "}
								<Icon icon="mdi:circle" width={6} className="mx-2" />
								{import.meta.env.VITE_APP_HASH}
							</Kbd.Content>
						</Kbd>
						<Link.Icon />
					</Link>
					<Separator className="mx-2" orientation="vertical" variant="secondary" />
					<Link onPress={() => navigate("/onboarding")} className="no-underline hover:underline">
						Поменять настройки
						<Link.Icon />
					</Link>
				</div>
			</div>
		</div>
	);
}
