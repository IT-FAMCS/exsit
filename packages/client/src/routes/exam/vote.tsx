import HungarianAlgorithmChooser from "@/components/voting/HungarianAlgorithmChooser";
import RandomSelectAlgorithmChooser from "@/components/voting/RandomSelectAlgorithmChooser";
import { LoadingWall } from "@/components/Walls";
import { defaultHandler, expandedFetch } from "@/utils/fetch";
import {
	CastVoteResponse,
	GetVotingTransactionInformationResponse,
	RequestVotingTransactionResponse,
	type VoteType,
	type VotingTransactionInformationType,
} from "@exsit/shared/types/exams";
import { toast } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

export default function VoteRoute() {
	const navigate = useNavigate();
	const params = useParams();
	const location = useLocation();

	const [transactionToken, setTransactionToken] = useState<string | undefined>(undefined);
	const [transactionInfo, setTransactionInfo] = useState<
		VotingTransactionInformationType | undefined
	>(undefined);
	const [vote, setVote] = useState<VoteType | undefined>(undefined);

	const requestVotingTransactionFetch = useQuery({
		queryKey: ["request-voting-transaction", params.campaign],
		queryFn: async () =>
			await expandedFetch(`/campaigns/${params.campaign}/transaction`, {
				output: RequestVotingTransactionResponse,
			}),
		enabled: !!params.campaign,
	});

	const getVotingTransactionInfoFetch = useQuery({
		queryKey: ["get-voting-transaction-info", transactionToken],
		queryFn: async () =>
			await expandedFetch(`/voting/${transactionToken}/info`, {
				output: GetVotingTransactionInformationResponse,
			}),
		enabled: !!transactionToken,
	});

	const castVoteFetch = useQuery({
		queryKey: ["submit-vote", transactionToken],
		queryFn: async () =>
			await expandedFetch(`/voting/${transactionToken}/cast`, {
				output: CastVoteResponse,
				method: "POST",
				jsonBody: vote,
			}),
		enabled: !!transactionToken && !!vote,
	});

	useEffect(() => {
		if (!requestVotingTransactionFetch.data) return;
		defaultHandler(requestVotingTransactionFetch.data, {
			onError: () => queueMicrotask(() => navigate(-1)),
			errorMessages: {
				adminsCannotVote: "Администратор не может участвовать в голосовании!",
				campaignNotStarted: "Голосование не начато!",
				campaignStopped: "Голосование уже завершено!",
				invalidCampaignID: "Неверный ID голосования",
				invalidGroupCode: "Неверный ID группы",
				alreadyVoted: "Твой голос уже засчитан!",
			},
			onSuccess: (token) => setTransactionToken(token),
		});
	}, [requestVotingTransactionFetch, navigate]);

	useEffect(() => {
		if (!getVotingTransactionInfoFetch.data) return;
		defaultHandler(getVotingTransactionInfoFetch.data, {
			onError: () => queueMicrotask(() => navigate(-1)),
			errorMessages: {
				invalidCampaignID: "Неверный ID голосования",
				invalidExamID: "Неверный ID экзамена",
				invalidGroupID: "Неверный ID группы",
				invalidTransactionID: "Неверный ID транзакции",
			},
			onSuccess: (info) => setTransactionInfo(info),
		});
	}, [getVotingTransactionInfoFetch, navigate]);

	useEffect(() => {
		if (!castVoteFetch.data) return;
		defaultHandler(castVoteFetch.data, {
			onError: () => queueMicrotask(() => navigate(-1)),
			errorMessages: {
				invalidCampaignID: "Неверный ID голосования",
				invalidExamID: "Неверный ID экзамена",
				invalidGroupID: "Неверный ID группы",
				invalidTransactionID: "Неверный ID транзакции",
				violatedConditions: "Нарушены условия голосования",
			},
			onSuccess: () => {
				sessionStorage.setItem("celebrate", "true");
				toast.success("Голос успешно принят. Спасибо!");
				queueMicrotask(() => navigate(-1));
			},
		});
	}, [castVoteFetch, navigate]);

	useEffect(() => {
		setTransactionToken(undefined);
		setTransactionInfo(undefined);
		setVote(undefined);
	}, [location]);

	if (requestVotingTransactionFetch.isFetching)
		return <LoadingWall text="Отправляю запрос на голосование" />;

	if (getVotingTransactionInfoFetch.isFetching)
		return <LoadingWall text="Получаю необходимую информацию для голосования" />;

	if (castVoteFetch.isFetching) return <LoadingWall text="Отправляю голос" />;

	return (
		!vote && (
			<div className="relative flex h-dvh w-dvw flex-col items-center justify-center gap-2 p-4">
				{transactionInfo?.campaignType === "hungarian" && (
					<HungarianAlgorithmChooser info={transactionInfo} onCast={setVote} />
				)}
				{transactionInfo?.campaignType === "random_select" && (
					<RandomSelectAlgorithmChooser info={transactionInfo} onCast={setVote} />
				)}
				<p className="text-muted pointer-events-none absolute right-4 bottom-4">
					{transactionToken}
				</p>
			</div>
		)
	);
}
