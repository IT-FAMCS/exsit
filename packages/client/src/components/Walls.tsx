import { Button, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router";

export function ErrorWall(props: { text?: string }) {
	const navigate = useNavigate();
	return (
		<div className="flex h-dvh w-dvw flex-col items-center justify-center gap-2 p-4">
			<Icon icon="mdi:alert-circle-outline" />
			{props.text && <p className="text-muted text-center">{props.text}</p>}
			<Button onPress={() => navigate("/")}>
				<Icon icon="mdi:home-outline" /> Вернуться на главную
			</Button>
		</div>
	);
}

export function LoadingWall(props: { text?: string }) {
	return (
		<div className="flex h-dvh w-dvw flex-col items-center justify-center gap-2 p-4">
			<Spinner />
			{props.text && <p className="text-muted text-center">{props.text}</p>}
		</div>
	);
}
