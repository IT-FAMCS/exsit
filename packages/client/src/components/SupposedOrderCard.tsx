import type { SupposedOrderType } from "@exsit/shared/types/exams";
import { Card } from "@heroui/react";
import { useMemo } from "react";

export default function SupposedOrderCard(props: { supposedOrder: SupposedOrderType }) {
	const description = useMemo(() => {
		switch (props.supposedOrder.type) {
			case "unknown":
				return "Неизвестно";
			case "individual":
				return "По одному";
			case "inGroupsOf":
				return `В группах по ${props.supposedOrder.of}`;
			case "inGroupsExtended":
				return `Сначала в группе по ${props.supposedOrder.groups.at(0)}, ${props.supposedOrder.groups
					.slice(1)
					.map((g) => (g === 1 ? `затем по одному` : `затем в группах по ${g}`))
					.join(", ")}`;
			case "allAtOnce":
				return "Все сразу";
		}
	}, [props.supposedOrder]);
	return (
		<Card className="w-full">
			<Card.Header>
				<Card.Title>Предполагаемый порядок</Card.Title>
				<Card.Description>{description}</Card.Description>
			</Card.Header>
		</Card>
	);
}
