import Logo from "@/components/Logo";
import { defaultHandler, expandedFetch } from "@/utils/fetch";
import {
	Button,
	Card,
	FieldError,
	Form,
	Input,
	Label,
	Spinner,
	Surface,
	TextField,
	toast,
	useTheme,
} from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { VerifyGroupCodeResponse } from "@exsit/shared/types/auth";

export default function LoginRoute() {
	const { setTheme } = useTheme();
	useEffect(() => setTheme("yellow-light"), []);

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
		retry: false,
	});

	useEffect(() => {
		if (groupCodeFetch.data)
			defaultHandler(groupCodeFetch.data, {
				onSuccess: ({ students }) => setStudents(students),
				errorMessages: {
					invalidGroupCode: "Неверный код группы",
					validation: "Ошибка валидации данных",
				},
			});
	}, [groupCodeFetch]);

	return (
		<div className="flex h-screen w-screen flex-col items-center justify-center">
			<Card className="gap-6">
				<Card.Header>
					<Logo className="text-accent w-sm" />
				</Card.Header>
				<Card.Content>
					{students ? (
						<Form className="flex flex-col"></Form>
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
