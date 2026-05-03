import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./assets/main.css";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import LoginRoute from "./routes/login";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toast } from "@heroui/react";

export const router = createBrowserRouter([
	{
		path: "/login",
		element: <LoginRoute />,
	},
]);
export const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<Toast.Provider />
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
