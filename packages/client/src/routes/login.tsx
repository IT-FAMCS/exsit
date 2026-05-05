import Logo from "@/components/Logo";
import { defaultHandler, expandedFetch } from "@/utils/fetch";
import {
	Button,
	Card,
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

export default function LoginRoute() {
	const [groupCode, setGroupCode] = useState("");
	const [students, setStudents] = useState<Record<string, string> | undefined>(undefined);
	const [id, setId] = useState("");
	const [password, setPassword] = useState("");

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
				onSuccess: ({ students }) => setStudents(students),
				errorMessages: {
					invalidGroupCode: "Неверный код группы",
				},
			});
	}, [groupCodeFetch]);

	useEffect(() => {
		if (loginFetch.data)
			defaultHandler(loginFetch.data, {
				onSuccess: () => alert("yay"),
				errorMessages: {
					invalidCredentials: "Неверный логин или пароль",
					invalidGroupCode: "Неверный код группы",
				},
			});
	}, [loginFetch]);

	return (
		<div className="flex h-screen w-screen flex-col items-center justify-center">
			<Card className="gap-6">
				<Card.Header>
					<Logo className="text-accent w-sm" />
				</Card.Header>
				<Card.Content>
					{students ? (
						<Form
							className="flex flex-col gap-2"
							onSubmit={(e) => {
								e.preventDefault();
								const formData = new FormData(e.currentTarget);
								setId(formData.get("student")!.toString());
								setPassword(formData.get("password")!.toString());
							}}
						>
							<Select
								variant="secondary"
								isRequired
								name="student"
								placeholder="Найдите себя в списке"
							>
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
								<Input variant="secondary" />
								<Description>Его можно будет поменять позже</Description>
								<FieldError />
							</TextField>
							<Button type="submit" isPending={groupCodeFetch.isFetching}>
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
							className="flex flex-col gap-2"
							onSubmit={(e) => {
								e.preventDefault();
								const code = new FormData(e.currentTarget).get("groupCode");
								if (!code) return;
								setGroupCode(code.toString());
							}}
						>
							<TextField isRequired name="groupCode" type="text">
								<Label>Код группы</Label>
								<Input variant="secondary" />
								<FieldError />
							</TextField>
							<Button type="submit" isPending={groupCodeFetch.isFetching}>
								{({ isPending }) => (
									<>
										{isPending ? <Spinner color="current" size="sm" /> : null}
										Продолжить
									</>
								)}
							</Button>
						</Form>
					)}
				</Card.Content>
			</Card>
		</div>
	);
}
