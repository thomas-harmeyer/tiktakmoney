import {
	type Game,
	useGetGameByIdGameIdGetSuspense,
	useMakeBetGameIdBetPost,
	useMakeMoveGameIdMovePost,
} from "@/api";
import { onSettled, useLobby } from "@/App";
import { Button } from "./ui/button";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { toast, useToast } from "./ui/use-toast";
import { Input } from "./ui/input";
import { ChevronsUpDown, Circle, X } from "lucide-react";
import { Label } from "./ui/label";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "./ui/collapsible";
import { useGameWebhook } from "@/lib/useWebsocket";

export const GameContainer = () => {
	const { gameId, username: userId } = useLobby();
	const { data: game } = useGetGameByIdGameIdGetSuspense(gameId, {
		query: { refetchInterval: 25000 },
	});
	useGameWebhook(gameId);

	const [selected, setSelected] = useState<[number, number] | undefined>(
		undefined,
	);
	const moveMutation = useMakeMoveGameIdMovePost();
	const handleSubmitMove = () => {
		if (selected === undefined) {
			return;
		}
		moveMutation.mutate(
			{
				id: gameId,
				params: { row: selected[0], col: selected[1], username: userId },
			},
			{
				onSettled,
				onSuccess: (res) => {
					if (res) {
						toast({ description: res });
					} else {
						setSelected(undefined);
					}
				},
			},
		);
	};

	if (game.users[0] === "" || game.users[1] === "") {
		return <div>Waiting for players to join...</div>;
	}

	if (game.state === "tie") {
		return (
			<div>
				<p>The game was a tie!</p>
				<Button>Back to lobby.</Button>
			</div>
		);
	}
	const playerPosition = game.users[0] === userId ? 0 : 1;

	if (game.state === "winner") {
		return (
			<div>
				<p>{game.winner === playerPosition ? "You WIN!" : "You LOSE!"}</p>
				<Button>Back to lobby.</Button>
			</div>
		);
	}
	const yourBet = game.rounds.at(-1)?.bets?.[playerPosition];
	const oppBet = game.rounds.at(-1)?.bets?.[1 - playerPosition];
	const yourMove =
		typeof yourBet === "number" &&
		typeof oppBet === "number" &&
		yourBet > oppBet;
	const getStatus = () => {
		if (game.state === "betting") {
			if (typeof yourBet === "number") {
				return {
					title: "Waiting for opponent to place thier bet",
					description: `You placed a bet of $${yourBet}`,
				};
			}
			return { title: "Place a bet" };
		}
		if (typeof yourBet !== "number" || typeof oppBet !== "number") {
			return { title: "Not sure how we got to this game state lol" };
		}
		if (yourMove) {
			return {
				title: "Make your move",
				description: `Your bet of $${yourBet} won again you oppoenents bet of $${oppBet}`,
			};
		}
		return {
			title: "Waitig for your opponent to make their move",
			description: `Your bet of $${yourBet} lost again you oppoenents bet of $${oppBet}`,
		};
	};
	const status = getStatus();
	return (
		<div className="flex flex-col gap-3 justify-between h-full py-3">
			<Alert>
				<AlertTitle>{status.title}</AlertTitle>
				<AlertDescription>{status.description}</AlertDescription>
			</Alert>
			<div className="flex justify-center">
				<Board
					board={game.board}
					selected={selected}
					setSelected={setSelected}
					disabled={game.state === "betting"}
				/>
			</div>
			<div>
				<BetInput
					key={game.rounds.length}
					lastBet={game.rounds.at(-1)?.bets?.[playerPosition] ?? undefined}
					money={game.players[playerPosition].money}
					showButton={game.state === "betting"}
					game={game}
					playerPosition={playerPosition}
				/>
			</div>
			{game.state === "moving" && yourMove && (
				<Button
					onMouseDown={handleSubmitMove}
					disabled={moveMutation.isPending || selected === undefined}
				>
					Make Move
				</Button>
			)}
		</div>
	);
};

const BetInput = ({
	lastBet,
	money,
	showButton,
	game,
	playerPosition,
}: {
	lastBet?: number;
	money: number;
	showButton?: boolean;
	game: Game;
	playerPosition: number;
}) => {
	const { gameId, username: userId } = useLobby();
	const mutation = useMakeBetGameIdBetPost();
	const { toast } = useToast();

	const [bet, setBet] = useState(0);

	const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value.slice(1);
		if (value === "") {
			setBet(0);
		} else {
			const num = Number.parseInt(value);
			if (!Number.isNaN(num) && num >= 0) {
				setBet(Math.trunc(num));
			}
		}
	};

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		e.stopPropagation();

		mutation.mutate(
			{
				id: gameId,
				params: { dollars: bet, username: userId },
			},
			{
				onSettled,
				onSuccess: (res) => {
					if (res) {
						toast({ description: res });
					}
				},
			},
		);
	};

	return (
		<div>
			<Collapsible>
				<div className="relative h-0 w-full">
					<CollapsibleContent>
						<div className="grid grid-rows-3 grid-flow-col gap-2 border-2 rounded-md shadow-md p-1 absolute bottom-3">
							{game.rounds.map((round, i) => {
								if (
									round.bets === undefined ||
									round.bets[0] === null ||
									round.bets[1] === null
								)
									return null;
								const winnerPosition = round.bets[0] > round.bets[1] ? 0 : 1;
								const tie = round.bets[0] === round.bets[1];
								return (
									// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
									<div key={i}>
										<span className="font-mono">{i + 1}:</span>
										<span
											className={
												winnerPosition === playerPosition || tie
													? "font-bold"
													: ""
											}
										>
											{round.bets?.[playerPosition]}
										</span>
										{" vs "}
										<span
											className={
												winnerPosition !== playerPosition || tie
													? "font-bold"
													: ""
											}
										>
											{round.bets?.[1 - playerPosition]}
										</span>
									</div>
								);
							})}
						</div>
					</CollapsibleContent>
				</div>
				<form onSubmit={handleSubmit}>
					<div className="flex flex-col gap-2">
						<div className="flex w-full justify-between items-center">
							<div className="flex gap-2 items-center">
								<CollapsibleTrigger asChild>
									<Button variant="ghost" size="sm">
										<ChevronsUpDown className="h-4 w-4" /> Bet:
									</Button>
								</CollapsibleTrigger>
								<Input
									className="w-16 flex justify-center"
									value={`$${lastBet ?? bet}`}
									onChange={handleInputChange}
									disabled={lastBet !== undefined || mutation.isPending}
								/>
							</div>
							<Label>${money}</Label>
						</div>
						{!!showButton && (
							<Button disabled={lastBet !== undefined || mutation.isPending}>
								bet
							</Button>
						)}
					</div>
				</form>
			</Collapsible>
		</div>
	);
};

const Board = ({
	board,
	selected,
	setSelected,
	disabled,
}: {
	board: Game["board"];
	selected?: [number, number];
	setSelected: (val?: [number, number]) => void;
	disabled?: boolean;
}) => {
	return (
		<div className="grid grid-cols-3 w-fit">
			{board.map((row, i) =>
				row.map((val, j) => {
					const isSelected = selected && selected[0] === i && selected[1] === j;
					return (
						<Button
							key={`${i}_${
								// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
								j
							}`}
							className="h-20 w-20"
							disabled={disabled}
							onMouseDown={() =>
								isSelected ? setSelected(undefined) : setSelected([i, j])
							}
							variant={isSelected ? "default" : "outline"}
						>
							{val === 0 ? <X /> : val === 1 ? <Circle /> : ""}
						</Button>
					);
				}),
			)}
		</div>
	);
};
