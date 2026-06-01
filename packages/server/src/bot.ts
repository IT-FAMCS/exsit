import { Bot, InputFile } from "grammy";
import { votingCampaigns } from "./db/schema/exams";
import { getExamById } from "./db/actions/exams";
import { getGroupById, getGroupIdByExam, getGroupStudents } from "./db/actions/groups";
import { CAMPAIGN_TYPES_MESSAGES, VotingCampaignStateType } from "@exsit/shared/types/exams";
import { NotifyGroupRequest, NotifyGroupResponse } from "@exsit/shared/types/admin";
import z from "zod";
import { ok } from "@exsit/shared/types/api";
import { getVotingCampaignById, setCampaignStatusMessage } from "./db/actions/campaigns";

let bot: Bot | null = null;
export const startBot = async () => {
	if (!process.env.TELEGRAM_TOKEN) return;

	bot = new Bot(process.env.TELEGRAM_TOKEN);
	bot.on("msg", async (ctx) => {
		if (ctx.chat.type === "private")
			ctx.reply(":3", { reply_parameters: { message_id: ctx.msgId } });
	});
	await bot.start({
		onStart: (info) => {
			console.log(`started telegram bot as @${info.username}`);
			setBotProfilePicture();
			if (process.env.SUPERUSER_TELEGRAM_ID && bot)
				bot.api.sendMessage(process.env.SUPERUSER_TELEGRAM_ID, "😌 я проснулся");
		},
	});
};

export const stopBot = async () => {
	if (process.env.SUPERUSER_TELEGRAM_ID && bot) {
		await bot.api.sendMessage(process.env.SUPERUSER_TELEGRAM_ID, "🥱 я иду спать");
		bot.stop();
	}
};

export const setBotProfilePicture = async () => {
	if (!bot) return;
	const index = new Date().getDay() % 4;
	await bot.api.setMyProfilePhoto({
		type: "static",
		photo: new InputFile(`./assets/pfps/${index}.jpg`),
	});
};

export const sendVotingCampaignStartedMessage = async (
	campaign: (typeof votingCampaigns)["$inferSelect"],
) => {
	const exam = await getExamById(campaign.exam);
	const group = await getGroupById((await getGroupIdByExam(campaign.exam)) ?? "");
	if (!bot || !exam || !group || !group.notificationChannel) return;
	await bot.api.sendMessage(
		group.notificationChannel,
		`<u><b>${exam.subject} / ${CAMPAIGN_TYPES_MESSAGES[campaign.options.type]}</b></u>\nГолосование начато! <a href="${process.env.FRONTEND_HOSTNAME}/vote/${campaign.id}">Ссылка на голосование</a>\n<tg-spoiler>${group.publicCode}</tg-spoiler>`,
		{ parse_mode: "HTML" },
	);

	if (campaign.state.type === "random_select") {
		const message = await bot.api.sendMessage(group.notificationChannel, "секунду...", {
			parse_mode: "HTML",
		});
		await setCampaignStatusMessage(campaign.id, message.message_id);
		await updateRandomSelectCampaignStatusMessage((await getVotingCampaignById(campaign.id))!);
	}
};

export const updateRandomSelectCampaignStatusMessage = async (
	campaign: (typeof votingCampaigns)["$inferSelect"],
) => {
	if (
		campaign.state.type !== "random_select" ||
		campaign.options.type !== "random_select" ||
		!campaign.state.statusMessage
	)
		return;
	const exam = await getExamById(campaign.exam);
	const group = await getGroupById((await getGroupIdByExam(campaign.exam)) ?? "");
	const students = await getGroupStudents(group?.id ?? "");
	if (!bot || !exam || !group || !group.notificationChannel || !students) return;

	const state = campaign.state as Extract<VotingCampaignStateType, { type: "random_select" }>;
	const list = Array.from({ length: students.length }, (_, i) =>
		state.current === i
			? `<b>${i + 1}. ${students[state.order[i]].fullName} 👈</b>`
			: `${i + 1}. ${students[state.order[i]].fullName}`,
	).join("\n");
	await bot.api.editMessageText(
		group.notificationChannel,
		campaign.state.statusMessage,
		`<u><b>${exam.subject} / ${CAMPAIGN_TYPES_MESSAGES[campaign.options.type]}</b></u>\n\n${list}\n\n<a href="${process.env.FRONTEND_HOSTNAME}/vote/${campaign.id}">Ссылка на голосование</a>\n<tg-spoiler>${group.publicCode}</tg-spoiler>`,
		{ parse_mode: "HTML" },
	);
};

export const sendVotingCampaignStoppedMessage = async (
	campaign: (typeof votingCampaigns)["$inferSelect"],
) => {
	const exam = await getExamById(campaign.exam);
	const group = await getGroupById((await getGroupIdByExam(campaign.exam)) ?? "");
	if (!bot || !exam || !group || !group.notificationChannel) return;
	await bot.api.sendMessage(
		group.notificationChannel,
		`<u><b>${exam.subject} / ${CAMPAIGN_TYPES_MESSAGES[campaign.options.type]}</b></u>\nГолосование окончено! Ожидаем подсчёта результатов.\n<tg-spoiler>${group.publicCode}</tg-spoiler>`,
		{ parse_mode: "HTML" },
	);
};

export const sendVotingCampaignResultsMessage = async (
	campaign: (typeof votingCampaigns)["$inferSelect"],
) => {
	const exam = await getExamById(campaign.exam);
	const group = await getGroupById((await getGroupIdByExam(campaign.exam)) ?? "");
	const students = await getGroupStudents(group?.id ?? "");
	if (!bot || !exam || !group || !students || !group.notificationChannel || !campaign.result)
		return;

	let contents = `<b>${exam.subject} / ${CAMPAIGN_TYPES_MESSAGES[campaign.options.type]}</b>\n\n`;
	for (let idx = 0; idx < campaign.result.order.length; idx++)
		contents += `${idx + 1}. ${students.find((s) => s.id === campaign.result!.order[idx])?.fullName}\n`;

	contents += "\n<b>Автоматы:</b>\n";
	for (let idx = 0; idx < campaign.result.exemptions.length; idx++)
		contents += `${idx + 1}. ${students.find((s) => s.id === campaign.result!.exemptions[idx])?.fullName}\n`;

	contents += `\n${campaign.result.notes.map((n) => `💭 ${n}`).join("\n")}${campaign.result.notes.length !== 0 ? "\n" : ""}`;

	contents += `\n<tg-spoiler>${group.publicCode}</tg-spoiler>`;
	await bot.api.sendMessage(group.notificationChannel, contents, { parse_mode: "HTML" });
};

export const sendGroupMessage = async (
	groupId: string,
	req: z.infer<typeof NotifyGroupRequest>,
): Promise<z.input<typeof NotifyGroupResponse>> => {
	if (!bot) return ok(null);
	const group = await getGroupById(groupId);
	if (!group) return { error: "invalidGroupID" };
	if (!group.notificationChannel) return { error: "notificationsDisabled" };
	await bot.api.sendMessage(group.notificationChannel, req.text, { parse_mode: req.parseMode });
	return ok(null);
};

export const sendCasinoIntermediateRoundMessage = async (
	campaign: (typeof votingCampaigns)["$inferSelect"],
) => {
	const exam = await getExamById(campaign.exam);
	const group = await getGroupById((await getGroupIdByExam(campaign.exam)) ?? "");
	if (
		campaign.state.type !== "casino" ||
		campaign.options.type !== "casino" ||
		!bot ||
		!exam ||
		!group ||
		!group.notificationChannel
	)
		return;
	await bot.api.sendMessage(
		group.notificationChannel,
		`<u><b>${exam.subject} / ${CAMPAIGN_TYPES_MESSAGES[campaign.options.type]}</b></u>\nРаунд ${campaign.state.round}/${campaign.options.rounds} окончен. <a href="${process.env.FRONTEND_HOSTNAME}/vote/${campaign.id}">Ссылка на голосование</a>\n<tg-spoiler>${group.publicCode}</tg-spoiler>`,
		{ parse_mode: "HTML" },
	);
};
