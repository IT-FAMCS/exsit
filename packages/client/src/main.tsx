import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./assets/main.css";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

const router = createBrowserRouter([
	{
		path: "/",
		element: <div>meow!</div>,
	},
]);

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
