import { defaultHandler, expandedFetch } from "@/utils/fetch";
import {
	GetVotingTransactionInformationResponse,
	RequestVotingTransactionResponse,
	type VotingTransactionInformationType,
} from "@exsit/shared/types/exams";
import { Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

export default function VoteRoute() {
	const navigate = useNavigate();
	const params = useParams();

	const [transactionToken, setTransactionToken] = useState<string | undefined>(undefined);
	const [transactionInfo, setTransactionInfo] = useState<
		VotingTransactionInformationType | undefined
	>(undefined);

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

	useEffect(() => {
		if (!requestVotingTransactionFetch.data) return;
		defaultHandler(requestVotingTransactionFetch.data, {
			onError: () => navigate(-1),
			errorMessages: {
				adminsCannotVote: "Администратор не может участвовать в голосовании!",
				campaignNotStarted: "Голосование не начато!",
				campaignStopped: "Голосование уже завершено!",
				invalidCampaignID: "Неверный ID голосования",
				invalidGroupCode: "Неверный ID группы",
			},
			onSuccess: (token) => setTransactionToken(token),
		});
	}, [requestVotingTransactionFetch, navigate]);

	useEffect(() => {
		if (!getVotingTransactionInfoFetch.data) return;
		defaultHandler(getVotingTransactionInfoFetch.data, {
			onError: () => navigate(-1),
			errorMessages: {
				invalidCampaignID: "Неверный ID голосования",
				invalidExamID: "Неверный ID экзамена",
				invalidGroupID: "Неверный ID группы",
				invalidTransactionID: "Неверный ID транзакции",
			},
			onSuccess: (info) => setTransactionInfo(info),
		});
	}, [getVotingTransactionInfoFetch, navigate]);

	if (requestVotingTransactionFetch.isFetching)
		return (
			<div className="flex h-dvh w-dvw flex-col items-center justify-center gap-2 p-4">
				<Spinner />
				<p>Отправляю запрос на голосование</p>
			</div>
		);

	if (getVotingTransactionInfoFetch.isFetching)
		return (
			<div className="flex h-dvh w-dvw flex-col items-center justify-center gap-2 p-4">
				<Spinner />
				<p>Получаю необходимую информацию для голосования</p>
			</div>
		);

	return <p>{JSON.stringify(transactionInfo)}</p>;
}
