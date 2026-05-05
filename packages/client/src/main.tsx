import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./assets/main.css";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import LoginRoute from "./routes/login";
import { QueryClient } from "@tanstack/react-query";
import Provider from "./provider";

export const router = createBrowserRouter([
	{
		path: "/login",
		element: <LoginRoute />,
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
