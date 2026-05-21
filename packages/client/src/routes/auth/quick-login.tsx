import { LoadingWall } from "@/components/Walls";
import { defaultHandler, expandedFetch } from "@/utils/fetch";
import { LoginResponse, LoginRequest } from "@exsit/shared/types/auth";
import { toast } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

export default function QuickLoginRoute() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [info, setInfo] = useState<{ id: string; group: string; password: string } | undefined>(
		undefined,
	);

	const loginFetch = useQuery({
		queryKey: ["login", info?.group, info?.id, info?.password],
		queryFn: async () =>
			await expandedFetch("/login", {
				output: LoginResponse,
				jsonBody: LoginRequest.encode({
					groupCode: info!.group,
					id: info!.id,
					password: info!.password,
				}),
				method: "POST",
			}),
		enabled: !!info,
	});

	useEffect(() => {
		if (!searchParams.has("id") || !searchParams.has("g") || !searchParams.has("p")) {
			toast.danger("Неверные параметры для быстрого входа");
			navigate("/login");
			return;
		}
		setInfo({
			id: searchParams.get("id")!,
			group: searchParams.get("g")!,
			password: searchParams.get("p")!,
		});
	}, [navigate, searchParams]);

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
				onFetchError: () => navigate("/login"),
				onApiError: () => navigate("/login"),
				errorMessages: {
					invalidCredentials: "Неверный логин или пароль",
					invalidGroupCode: "Неверный код группы",
				},
			});
	}, [loginFetch, navigate]);

	return <LoadingWall />;
}
