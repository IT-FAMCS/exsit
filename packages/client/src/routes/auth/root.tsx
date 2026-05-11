import { AuthContext, useAuth } from "@/hooks/useAuth";
import { defaultHandler, expandedFetch } from "@/utils/fetch";
import { MeResponse, type AuthInformation } from "@exsit/shared/types/auth";
import { Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";

export function AuthProvider() {
	const navigate = useNavigate();
	const location = useLocation();

	const [user, setUser] = useState<AuthInformation | null>(null);
	const { data } = useQuery({
		queryKey: ["me"],
		queryFn: async () => await expandedFetch("/me", { output: MeResponse }),
	});
	useEffect(() => {
		if (location.pathname === "/login") return;
		if (data)
			defaultHandler(data, {
				onError: () => navigate("/login"),
				onSuccess: (info) => setUser(info),
			});
	}, [data, location, navigate]);

	return (
		<AuthContext.Provider value={user}>
			{data ? (
				<Outlet />
			) : (
				<div className="flex h-dvh w-dvw items-center justify-center">
					<Spinner />
				</div>
			)}
		</AuthContext.Provider>
	);
}

export function AdminAuthWall() {
	const navigate = useNavigate();
	const auth = useAuth();

	useEffect(() => {
		if (auth && auth.role === "student") {
			alert("У вас нет прав просматривать эту страницу.");
			navigate("/login");
		}
	}, [auth, navigate]);

	return auth && auth.role === "admin" ? (
		<Outlet />
	) : (
		<div className="flex h-dvh w-dvw items-center justify-center">
			<Spinner />
		</div>
	);
}
