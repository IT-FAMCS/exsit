import { Toast, useTheme } from "@heroui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryClient } from "./main";

export default function Provider(props: { children?: ReactNode }) {
	useTheme();
	return (
		<QueryClientProvider client={queryClient}>
			<Toast.Provider />
			{props.children}
		</QueryClientProvider>
	);
}
