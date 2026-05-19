import { Bot } from "grammy";
import { votingCampaigns } from "./db/schema/exams";
import { getExamById } from "./db/actions/exams";
import { getGroupById, getGroupIdByExam } from "./db/actions/groups";
import { CAMPAIGN_TYPES_MESSAGES } from "@exsit/shared/types/exams";

let bot: Bot | null = null;
export const startBot = async () => {
	if (!process.env.TELEGRAM_TOKEN) return;
	bot = new Bot(process.env.TELEGRAM_TOKEN);
	bot.on("msg", async (ctx) => {
		ctx.reply(":3", { reply_parameters: { message_id: ctx.msgId } });
	});
	console.log("starting telegram bot");
	await bot.start();
};

export const sendVotingCampaignStartedMessage = async (
	campaign: (typeof votingCampaigns)["$inferSelect"],
) => {
	const exam = await getExamById(campaign.exam);
	const group = await getGroupById((await getGroupIdByExam(campaign.exam)) ?? "");
	if (!bot || !exam || !group || !group.notificationChannel) return;
	await bot.api.sendMessage(
		group.notificationChannel,
		`Голосование начато: **${exam.subject} / ${CAMPAIGN_TYPES_MESSAGES[campaign.options.type]}**\n[Ссылка на голосование](${process.env.FRONTEND_HOSTNAME}/vote/${campaign.id})\n\`${group.publicCode}\``,
		{ parse_mode: "MarkdownV2" },
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
		`Голосование окончено: **${exam.subject} / ${CAMPAIGN_TYPES_MESSAGES[campaign.options.type]}**\nОжидаем подсчёта результатов\n\`${group.publicCode}\``,
		{ parse_mode: "MarkdownV2" },
	);
};
