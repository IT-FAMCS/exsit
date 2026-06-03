// TODO: very rushed. please make this prettier later
import Logo from "@/components/Logo";
import {
	CAMPAIGN_TYPES_MESSAGES,
	GetExamsResponse,
	GetVotingCampaignsResponse,
	type ExamType,
	type ExtendedVotingCampaignType,
} from "@exsit/shared/types/exams";
import { Form, Spinner, Card, ScrollShadow, Table } from "@heroui/react";
import { useEffect, useState } from "react";
import { Select, Label, ListBox, Button } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { defaultHandler, expandedFetch } from "@/utils/fetch";
import { GetAllCampaignVotesResponse, GetAllGroupsResponse } from "@exsit/shared/types/admin";
import { Pressable } from "react-aria-components";
import { Icon } from "@iconify/react";
import { VerifyGroupCodeResponse } from "@exsit/shared/types/auth";
import type z from "zod";

function ExamCard(props: { id: string; exam: ExamType; onPressed: () => void }) {
	return (
		<Pressable onPress={props.onPressed}>
			<Card className="pressable-card w-full" role="button">
				<Card.Header className="flex flex-row items-center gap-2">
					<Card.Title className="flex items-center justify-center gap-2 text-start text-lg">
						<Icon width={32} icon="mdi:emoticon-cry-outline" className="min-w-8" />{" "}
						<p className="grow text-start text-lg leading-none">{props.exam.subject}</p>
					</Card.Title>
				</Card.Header>
			</Card>
		</Pressable>
	);
}

type CampaignVotesResponseType = Extract<
	z.infer<typeof GetAllCampaignVotesResponse>,
	{ data: unknown }
>["data"];
export default function AdminRoute() {
	const [group, setGroup] = useState<{ id: string; code: string } | undefined>(undefined);
	const [exam, setExam] = useState<string | undefined>(undefined);

	const [groups, setGroups] = useState<Record<string, string> | undefined>(undefined);
	const groupsFetch = useQuery({
		queryKey: ["get-group-codes"],
		queryFn: async () =>
			await expandedFetch("/groups/get-all", {
				output: GetAllGroupsResponse,
			}),
	});
	useEffect(() => {
		if (!groupsFetch.data) return;
		defaultHandler(groupsFetch.data, {
			onSuccess: (g) => setGroups(g),
		});
	}, [groupsFetch]);

	const [students, setStudents] = useState<Record<string, string> | undefined>(undefined);
	const studentsFetch = useQuery({
		queryKey: ["verify-group-code", group?.code],
		queryFn: async () =>
			await expandedFetch("/verify-group-code", {
				output: VerifyGroupCodeResponse,
				query: { code: group!.code },
			}),
		enabled: !!group,
	});
	useEffect(() => {
		if (studentsFetch.data)
			defaultHandler(studentsFetch.data, {
				onSuccess: ({ users: students }) => setStudents(students),
				errorMessages: {
					invalidGroupCode: "Неверный код группы",
				},
			});
	}, [studentsFetch]);

	const [exams, setExams] = useState<Record<string, ExamType> | undefined>(undefined);
	const examsFetch = useQuery({
		queryKey: ["get-exams", group?.id],
		queryFn: async () =>
			await expandedFetch(`/groups/${group?.id}/exams`, {
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

	const [examCampaigns, setExamCampaigns] = useState<ExtendedVotingCampaignType | undefined>(
		undefined,
	);
	const examCampaignsFetch = useQuery({
		queryKey: ["get-exam-campaigns", exam],
		queryFn: async () =>
			await expandedFetch(`/exams/${exam}/campaigns`, {
				output: GetVotingCampaignsResponse,
			}),
		enabled: !!exam,
	});
	useEffect(() => {
		if (!examCampaignsFetch.data) return;
		defaultHandler(examCampaignsFetch.data, {
			errorMessages: {
				invalidExamID: "Неверный ID экзамена",
				invalidGroupCode: "Неверный код группы",
				failedToGetStatistics: "Не удалось получить статистику голосований",
			},
			onSuccess: (data) => setExamCampaigns(data),
		});
	}, [examCampaignsFetch]);

	const [campaignVotes, setCampaignVotes] = useState<
		Record<string, CampaignVotesResponseType> | undefined
	>(undefined);
	const examCampaignVotesFetch = useQuery({
		queryKey: ["get-exam-campaigns-votes", exam],
		queryFn: async () =>
			await Promise.all(
				Object.keys(examCampaigns!).map(async (ec) => ({
					fetchResult: await expandedFetch(`/campaigns/${ec}/votes`, {
						output: GetAllCampaignVotesResponse,
					}),
					campaign: ec,
				})),
			),
		enabled: !!exam && !!examCampaigns,
	});
	useEffect(() => {
		if (examCampaignVotesFetch.data === undefined || campaignVotes !== undefined) return;
		const result: Record<string, CampaignVotesResponseType> = {};
		for (const fr of examCampaignVotesFetch.data)
			defaultHandler(fr.fetchResult, {
				errorMessages: {
					invalidExamID: "Неверный ID экзамена",
					invalidGroupCode: "Неверный код группы",
					failedToGetStatistics: "Не удалось получить статистику голосований",
				},
				onSuccess: (data) => {
					result[fr.campaign] = data;
				},
			});
		setCampaignVotes(result);
	}, [examCampaignVotesFetch, campaignVotes]);

	return (
		<div className="flex min-h-dvh w-dvw flex-col items-center justify-center p-4">
			<div className="flex max-w-sm flex-col items-center justify-center gap-6">
				<Logo className="text-accent w-full" />

				{groups && !exams && (
					<Form
						className="flex w-full flex-col gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							const formData = new FormData(e.currentTarget);
							setGroup({
								id: formData.get("group")!.toString(),
								code: groups[formData.get("group")!.toString()],
							});
						}}
					>
						<Select isRequired name="group">
							<Label>Группа</Label>
							<Select.Trigger>
								<Select.Value />
								<Select.Indicator />
							</Select.Trigger>
							<Select.Popover>
								<ListBox>
									{Object.entries(groups).map(([id, name]) => (
										<ListBox.Item id={id} key={id} textValue={name}>
											{name}
											<ListBox.ItemIndicator />
										</ListBox.Item>
									))}
								</ListBox>
							</Select.Popover>
						</Select>
						<Button type="submit" isPending={examsFetch.isFetching}>
							{({ isPending }) => (
								<>
									{isPending ? <Spinner color="current" size="sm" /> : null}
									Далее
								</>
							)}
						</Button>
					</Form>
				)}

				{exams && !exam && (
					<ScrollShadow className="max-h-[40dvh]">
						<div className="flex flex-col gap-2">
							{Object.entries(exams).map((kv) => (
								<ExamCard id={kv[0]} key={kv[0]} exam={kv[1]} onPressed={() => setExam(kv[0])} />
							))}
						</div>
					</ScrollShadow>
				)}

				{exam && (
					<>
						{examCampaignsFetch.isFetching ||
						examCampaignVotesFetch.isFetching ||
						!examCampaigns ||
						!students ||
						!campaignVotes ? (
							<Spinner />
						) : (
							<div className="mt-4 flex flex-row items-stretch gap-4 text-center">
								{Object.entries(examCampaigns!).map(([id, campaign]) => (
									<div className="flex w-[15vw] flex-col gap-2" key={id}>
										<p className="text-xl font-bold">
											{CAMPAIGN_TYPES_MESSAGES[campaign.options.type]}
										</p>
										<p className="text-muted">Не проголосовали</p>
										<Table className="grow">
											<Table.ScrollContainer>
												<Table.Content>
													<Table.Header>
														<Table.Column isRowHeader>Студент</Table.Column>
													</Table.Header>
													<Table.Body>
														{Object.entries(students!)
															.filter(([k]) => !campaignVotes![id].some((v) => v.student === k))
															.map(([, student]) => (
																<Table.Row>
																	<Table.Cell>{student}</Table.Cell>
																</Table.Row>
															))}
													</Table.Body>
												</Table.Content>
											</Table.ScrollContainer>
										</Table>
									</div>
								))}
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
