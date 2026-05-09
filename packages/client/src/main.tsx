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

export const router = createBrowserRouter([
	{
		element: <AuthProvider />,
		children: [
			{
				path: "/login",
				element: <LoginRoute />,
			},
			{
				element: <AdminAuthWall />,
				children: [
					{
						path: "/admin",
						element: <AdminRoute />,
					},
				],
			},
		],
	},
]);
export const queryClient = new QueryClient({
	defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 0, retry: false } },
});

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Provider>
			<RouterProvider router={router} />
		</Provider>
	</StrictMode>,
);
