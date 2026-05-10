import { useNavigate, useParams } from "react-router";

export default function VoteRoute() {
	const navigate = useNavigate();
	const params = useParams();

	return <p>{JSON.stringify(params)}</p>;
}
