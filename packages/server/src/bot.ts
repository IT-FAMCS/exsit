import { Bot, InputFile } from "grammy";
import { votingCampaigns } from "./db/schema/exams";
import { getExamById } from "./db/actions/exams";
import { getGroupById, getGroupIdByExam, getGroupStudents } from "./db/actions/groups";
import { CAMPAIGN_TYPES_MESSAGES } from "@exsit/shared/types/exams";

let bot: Bot | null = null;
export const startBot = async () => {
	if (!process.env.TELEGRAM_TOKEN) return;
	bot = new Bot(process.env.TELEGRAM_TOKEN);
	bot.on("msg", async (ctx) => {
		ctx.reply(":3", { reply_parameters: { message_id: ctx.msgId } });
	});
	await bot.start({
		onStart: (info) => {
			console.log(`started telegram bot as @${info.username}`);
			setBotProfilePicture();
		},
	});
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
		`Голосование начато: <b>${exam.subject} / ${CAMPAIGN_TYPES_MESSAGES[campaign.options.type]}</b>\n<a href="${process.env.FRONTEND_HOSTNAME}/vote/${campaign.id}">Ссылка на голосование</a>\n<tg-spoiler>${group.publicCode}</tg-spoiler>`,
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
		`Голосование окончено: <b>${exam.subject} / ${CAMPAIGN_TYPES_MESSAGES[campaign.options.type]}</b>\nОжидаем подсчёта результатов\n<tg-spoiler>${group.publicCode}</tg-spoiler>`,
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
	contents += `\n<tg-spoiler>${group.publicCode}</tg-spoiler>`;
	await bot.api.sendMessage(group.notificationChannel, contents, { parse_mode: "HTML" });
};
