import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./assets/main.css";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import LoginRoute from "./routes/auth/login";
import { QueryClient } from "@tanstack/react-query";
import Provider from "./provider";
import { AuthProvider, AdminAuthWall } from "./routes/auth/root";
import AdminRoute from "./routes/admin";
import MainRoute from "./routes/main";
import OnboardingRoute from "./routes/auth/onboarding";
import ViewExamDetailsRoute from "./routes/exam/view";
import VoteRoute from "./routes/exam/vote";
import QuickLoginRoute from "./routes/auth/quick-login";

export const router = createBrowserRouter([
	{
		Component: AuthProvider,
		children: [
			{
				path: "/",
				Component: MainRoute,
			},
			{
				path: "/login",
				Component: LoginRoute,
			},
			{
				path: "/ql",
				Component: QuickLoginRoute
			},
			{
				path: "/onboarding",
				Component: OnboardingRoute,
			},
			{
				path: "/exam/:exam",
				Component: ViewExamDetailsRoute,
			},
			{
				path: "/vote/:campaign",
				Component: VoteRoute,
			},
			{
				Component: AdminAuthWall,
				children: [
					{
						path: "/admin",
						Component: AdminRoute,
					},
				],
			},
		],
	},
]);
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: { refetchOnWindowFocus: false, staleTime: 0, retry: false },
	},
});

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Provider>
			<RouterProvider router={router} />
		</Provider>
	</StrictMode>,
);
