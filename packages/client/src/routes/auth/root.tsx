import { AuthContext } from "@/hooks/useAuth";
import { defaultHandler, expandedFetch } from "@/utils/fetch";
import { MeResponse, type AuthInformation } from "@exsit/shared/types/auth";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";

export default function AuthProvider() {
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
			<Outlet />
		</AuthContext.Provider>
	);
}
