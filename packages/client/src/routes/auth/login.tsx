import Logo from "@/components/Logo";
import { defaultHandler, expandedFetch } from "@/utils/fetch";
import {
	Button,
	Description,
	FieldError,
	Form,
	Input,
	Label,
	ListBox,
	Select,
	Spinner,
	TextField,
} from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LoginRequest, LoginResponse, VerifyGroupCodeResponse } from "@exsit/shared/types/auth";
import { useNavigate } from "react-router";
import { Icon } from "@iconify/react";

export default function LoginRoute() {
	const [groupCode, setGroupCode] = useState("");
	const [students, setStudents] = useState<Record<string, string> | undefined>(undefined);
	const [id, setId] = useState("");
	const [password, setPassword] = useState("");
	const navigate = useNavigate();

	const groupCodeFetch = useQuery({
		queryKey: ["verify-group-code", groupCode],
		queryFn: async () =>
			await expandedFetch("/verify-group-code", {
				output: VerifyGroupCodeResponse,
				query: { code: groupCode },
			}),
		enabled: !!groupCode,
	});

	const loginFetch = useQuery({
		queryKey: ["login", groupCode, id, password],
		queryFn: async () =>
			await expandedFetch("/login", {
				output: LoginResponse,
				jsonBody: LoginRequest.encode({ groupCode, id, password }),
				method: "POST",
			}),
		enabled: !!groupCode && !!id && !!password,
	});

	useEffect(() => {
		if (groupCodeFetch.data)
			defaultHandler(groupCodeFetch.data, {
				onSuccess: ({ users: students }) => setStudents(students),
				errorMessages: {
					invalidGroupCode: "Неверный код группы",
				},
			});
	}, [groupCodeFetch]);

	useEffect(() => {
		if (loginFetch.data)
			defaultHandler(loginFetch.data, {
				onSuccess: (role) => {
					// force reload here since AuthProvider won't react to login
					window.location.href =
						role === "admin"
							? "/admin"
							: localStorage.getItem("onboarding-complete")
								? "/"
								: "/onboarding";
				},
				errorMessages: {
					invalidCredentials: "Неверный логин или пароль",
					invalidGroupCode: "Неверный код группы",
				},
			});
	}, [loginFetch, navigate]);

	return (
		<div className="flex min-h-dvh w-dvw flex-col items-center justify-center p-4">
			<div className="flex max-w-sm flex-col items-center justify-center gap-6">
				<Logo className="text-accent w-full" />

				{students ? (
					<Form
						className="flex w-full flex-col gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							const formData = new FormData(e.currentTarget);
							setId(formData.get("student")!.toString());
							setPassword(formData.get("password")!.toString());
						}}
					>
						<Select isRequired name="student" placeholder="Найди себя в списке">
							<Label>Студент</Label>
							<Select.Trigger>
								<Select.Value />
								<Select.Indicator />
							</Select.Trigger>
							<Select.Popover>
								<ListBox>
									{Object.entries(students).map(([id, fullname]) => (
										<ListBox.Item id={id} key={id} textValue={fullname}>
											{fullname}
											<ListBox.ItemIndicator />
										</ListBox.Item>
									))}
								</ListBox>
							</Select.Popover>
						</Select>
						<TextField isRequired name="password" type="password">
							<Label>Кодовое слово</Label>
							<Input placeholder="Введи кодовое слово..." />
							<Description>Его можно будет поменять позже</Description>
							<FieldError />
						</TextField>
						<Button type="submit" isPending={loginFetch.isFetching}>
							{({ isPending }) => (
								<>
									{isPending ? <Spinner color="current" size="sm" /> : null}
									Войти
								</>
							)}
						</Button>
					</Form>
				) : (
					<Form
						className="flex w-full flex-col gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							const code = new FormData(e.currentTarget).get("groupCode");
							if (!code) return;
							setGroupCode(code.toString());
						}}
					>
						<TextField isRequired name="groupCode" type="password">
							<Label>Код группы</Label>
							<Input placeholder="Введи код группы..." />
							<FieldError />
						</TextField>
						<Button type="submit" isPending={groupCodeFetch.isFetching}>
							{({ isPending }) => (
								<>
									{isPending ? <Spinner color="current" size="sm" /> : null}
									Далее
									<Icon icon="mdi:chevron-right" />
								</>
							)}
						</Button>
					</Form>
				)}
			</div>
		</div>
	);
}
