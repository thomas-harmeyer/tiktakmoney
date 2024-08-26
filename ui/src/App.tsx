import { createContext, Suspense, useContext, useState } from "react";
import { Skeleton } from "./components/ui/skeleton";
import {
	useCreateGameGameIdPost,
	useGetOpenLobbiesLobbiesGetSuspense,
} from "./api";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Label } from "./components/ui/label";
import { Toaster } from "./components/ui/toaster";
import { useToast } from "./components/ui/use-toast";
import { GameContainer } from "./components/game";

type LobbyValues = { username: string; gameId: string };
const LobbyConext = createContext<LobbyValues>({ username: "", gameId: "" });

export const useLobby = () => {
	const context = useContext(LobbyConext);
	return context;
};
const Router = ({ setLobby }: { setLobby: (value: LobbyValues) => void }) => {
	const { username: userId, gameId } = useLobby();
	if (userId === "" || gameId === "") {
		return <LobbyInput setLobby={setLobby} />;
	}
	return <GameContainer />;
};

const LobbyInput = ({
	setLobby,
}: {
	setLobby: (value: LobbyValues) => void;
}) => {
	const [username, setUsername] = useState("");
	const mutation = useCreateGameGameIdPost();
	const { toast } = useToast();
	const { data: lobbies } = useGetOpenLobbiesLobbiesGetSuspense({
		query: { refetchInterval: 1000 },
	});

	const handleSubmit = (gameId: string) => {
		if (username === "" || gameId === "") {
			return;
		}
		mutation.mutate(
			{
				id: gameId,
				params: { username },
			},
			{
				onSettled,
				onSuccess: (res) => {
					if (res) {
						toast({ description: res });
					} else {
						setLobby({ gameId: gameId, username });
					}
				},
			},
		);
	};
	return (
		<div>
			<div className="flex flex-col gap-2">
				<Label>username</Label>
				<Input
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					disabled={mutation.isPending}
				/>
				<Button
					disabled={mutation.isPending}
					onClick={() => handleSubmit(username)}
				>
					Create Lobby
				</Button>
				{lobbies.map((lobby) => (
					<Button key={lobby} onMouseDown={() => handleSubmit(lobby)}>
						Play against {lobby}
					</Button>
				))}
			</div>
		</div>
	);
};

const queryClient = new QueryClient();

export const onSettled = () => {
	queryClient.invalidateQueries();
};

function App() {
	const [appConext, setAppContext] = useState({ username: "", gameId: "" });
	return (
		<QueryClientProvider client={queryClient}>
			<LobbyConext.Provider value={appConext}>
				<Suspense
					fallback={<Skeleton className="w-[100px] h-[20px] rounded-full" />}
				>
					<div className="container flex justify-center items-center w-screen h-screen">
						<Router setLobby={setAppContext} />
					</div>
					<Toaster />
				</Suspense>
			</LobbyConext.Provider>
		</QueryClientProvider>
	);
}

export default App;
