import Logo from "@/components/Logo";
import {
	Alert,
	Button,
	ColorSwatchPicker,
	FieldError,
	Form,
	Input,
	Label,
	Spinner,
	TextField,
	useTheme,
} from "@heroui/react";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { twMerge } from "tailwind-merge";
import { useQuery } from "@tanstack/react-query";
import { defaultHandler, expandedFetch } from "@/utils/fetch";
import { ChangePasswordResponse } from "@exsit/shared/types/auth";
import { useNavigate } from "react-router";

type OnboardingState = "welcome" | "explanation" | "set-theme" | "set-password" | "done";
const COLORS: Record<string, string> = {
	blue: "#0485f7",
	green: "#5f9a00",
	pink: "#dc4484",
	yellow: "#b27b00",
	default: "#989898",
};
const VARIANTS: Record<string, string> = {
	dark: "#343434",
	light: "#989898",
};
const find = (where: Record<string, string>, item: string, fallback: string) =>
	Object.entries(where).find((kv) => kv[1] === item)?.[0] ?? fallback;

function ThemeSwatch(props: { type: "color" | "variant"; color: string }) {
	return (
		<ColorSwatchPicker.Item
			key={props.color}
			color={(props.type === "color" ? COLORS : VARIANTS)[props.color]}
			className="brightness-125 contrast-125"
		>
			<ColorSwatchPicker.Swatch />
			<ColorSwatchPicker.Indicator />
		</ColorSwatchPicker.Item>
	);
}

export default function OnboardingRoute() {
	const navigate = useNavigate();

	const [step, setStep] = useState<OnboardingState>("welcome");
	const createStepIcon = useCallback(
		(s: OnboardingState) => (
			<Icon
				className={twMerge("transition-all", step === s ? "text-accent" : "text-accent-soft")}
				icon="mdi:circle"
			/>
		),
		[step],
	);
	const { setTheme, theme } = useTheme();
	const currentColor = theme.includes("-") ? theme.split("-")[0] : "default";
	const currentVariant = theme.includes("-") ? theme.split("-")[1] : theme;

	const [newPassword, setNewPassword] = useState<string | undefined>(undefined);
	const changePasswordFetch = useQuery({
		queryKey: ["change-password", newPassword],
		queryFn: async () =>
			await expandedFetch("/me/change-password", {
				output: ChangePasswordResponse,
				query: { newPassword: newPassword ?? "" },
				method: "PATCH",
			}),
		enabled: !!newPassword,
	});

	useEffect(() => {
		if (changePasswordFetch.data)
			defaultHandler(changePasswordFetch.data, {
				errorMessages: {
					invalidGroupCode: "Неверный код группы (внутренняя ошибка сервера)",
					invalidID: "Неверный ID пользователя",
				},
				onSuccess: () => setStep("done"),
			});
	}, [changePasswordFetch]);

	return (
		<div className="relative flex h-dvh w-dvw items-center justify-center p-4">
			{step === "welcome" && (
				<div className="flex w-sm flex-col items-center justify-center gap-4">
					<p className="text-4xl font-bold">Добро пожаловать в</p>
					<Logo className="text-accent w-64" />
					<p className="text-center">
						Надеемся, что этот проект сделает
						<br /> сессию менее нервной.
					</p>
					<Button onPress={() => setStep("explanation")}>
						Далее <Icon icon="mdi:chevron-right" />
					</Button>
				</div>
			)}
			{step === "explanation" && (
				<div className="flex w-sm flex-col items-center justify-center gap-4">
					<Logo className="text-accent w-64" />
					<p className="text-4xl font-bold">Как это работает</p>

					<p className="text-center">
						Обычная жеребьёвка зависит от скорости интернета и реакции студента.
					</p>
					<div className="flex flex-row items-center justify-center gap-2">
						<Icon className="text-success" width={64} icon="mdi:emoticon-outline" />
						<Icon className="text-danger" width={64} icon="mdi:emoticon-sad-outline" />
						<Icon className="text-success" width={64} icon="mdi:emoticon-outline" />
						<Icon className="text-danger" width={64} icon="mdi:emoticon-sad-outline" />
						<Icon className="text-danger" width={64} icon="mdi:emoticon-sad-outline" />
					</div>
					<p className="text-center">
						<b>exsit</b> стремится удовлетворить желания каждого используя математические алгоритмы.
					</p>
					<div className="flex flex-row items-center justify-center gap-2">
						<Icon className="text-success" width={64} icon="mdi:emoticon-outline" />
						<Icon className="text-success" width={64} icon="mdi:emoticon-outline" />
						<Icon className="text-success" width={64} icon="mdi:emoticon-outline" />
						<Icon className="text-success" width={64} icon="mdi:emoticon-outline" />
						<Icon className="text-success" width={64} icon="mdi:emoticon-outline" />
					</div>
					<Button onPress={() => setStep("set-theme")}>
						Далее <Icon icon="mdi:chevron-right" />
					</Button>
				</div>
			)}
			{step === "set-theme" && (
				<div className="flex w-sm flex-col items-center justify-center gap-4">
					<Logo className="text-accent w-64" />
					<p className="text-4xl font-bold">Тема</p>
					<p className="text-center">Цвет</p>
					<ColorSwatchPicker
						value={COLORS[currentColor]}
						onChange={(value) => {
							const name = find(COLORS, value.toString("hex").toLowerCase(), "default");
							setTheme(name === "default" ? currentVariant : `${name}-${currentVariant}`);
						}}
					>
						{Object.keys(COLORS).map((c) => (
							<ThemeSwatch type="color" color={c} key={c} />
						))}
					</ColorSwatchPicker>
					<p className="text-center">Вариант</p>
					<ColorSwatchPicker
						value={VARIANTS[currentVariant]}
						onChange={(value) => {
							const name = find(VARIANTS, value.toString("hex").toLowerCase(), "dark");
							setTheme(currentColor === "default" ? name : `${currentColor}-${name}`);
						}}
					>
						<ThemeSwatch type="variant" color="dark" />
						<ThemeSwatch type="variant" color="light" />
					</ColorSwatchPicker>

					<div className="flex flex-row items-center justify-center gap-2">
						<Button onPress={() => setStep("explanation")}>
							<Icon icon="mdi:chevron-left" /> Назад
						</Button>
						<Button onPress={() => setStep("set-password")}>
							Далее <Icon icon="mdi:chevron-right" />
						</Button>
					</div>
				</div>
			)}
			{step === "set-password" && (
				<div className="flex w-sm flex-col items-center justify-center gap-4">
					<Logo className="text-accent w-64" />
					<p className="text-4xl font-bold">Кодовое слово</p>
					<p className="text-center">
						Если хочешь, можешь поменять кодовое слово для входа в аккаунт.
					</p>
					<Form
						className="flex flex-col gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							const password = new FormData(e.currentTarget).get("newPassword");
							if (!password) {
								setStep("done");
								return;
							}
							setNewPassword(password.toString());
						}}
					>
						<TextField name="newPassword" type="password">
							<Label>Новое кодовое слово</Label>
							<Input placeholder="Введи новое кодовое слово (необязательно)..." />
							<FieldError />
						</TextField>

						<Alert status="warning">
							<Alert.Indicator />
							<Alert.Content>
								<Alert.Description>
									Изменение кодового слова аннулирует выданный QR-код для быстрого входа в аккаунт.
								</Alert.Description>
							</Alert.Content>
						</Alert>

						<div className="mt-2 flex flex-row items-center justify-center gap-2">
							<Button onPress={() => setStep("set-theme")}>
								<Icon icon="mdi:chevron-left" /> Назад
							</Button>
							<Button type="submit" isPending={changePasswordFetch.isFetching}>
								{({ isPending }) => (
									<>
										{isPending ? <Spinner color="current" size="sm" /> : null}
										Далее
										<Icon icon="mdi:chevron-right" />
									</>
								)}
							</Button>
						</div>
					</Form>
				</div>
			)}
			{step === "done" && (
				<div className="flex w-sm flex-col items-center justify-center gap-4">
					<Logo className="text-accent w-64" />
					<p className="text-4xl font-bold">Готово!</p>
					<p className="text-center">Приятного пользования exsit :)</p>

					<Button
						onPress={() => {
							localStorage.setItem("onboarding-complete", "true");
							navigate("/");
						}}
					>
						На главную <Icon icon="mdi:chevron-right" />
					</Button>
				</div>
			)}
			<div className="absolute bottom-4 flex w-dvw flex-row items-center justify-center gap-2">
				{createStepIcon("welcome")}
				{createStepIcon("explanation")}
				{createStepIcon("set-theme")}
				{createStepIcon("set-password")}
				{createStepIcon("done")}
			</div>
		</div>
	);
}
