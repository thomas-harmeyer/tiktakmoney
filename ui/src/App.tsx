import {
	createContext,
	type FormEvent,
	Suspense,
	useContext,
	useState,
} from "react";
import { Skeleton } from "./components/ui/skeleton";
import { useCreateGameGameIdPost } from "./api";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Label } from "./components/ui/label";
import { Toaster } from "./components/ui/toaster";
import { useToast } from "./components/ui/use-toast";
import { GameContainer } from "./components/game";

type LobbyValues = { userId: string; gameId: string };
const LobbyConext = createContext<LobbyValues>({ userId: "", gameId: "" });

export const useLobby = () => {
	const context = useContext(LobbyConext);
	return context;
};
const Router = ({ setLobby }: { setLobby: (value: LobbyValues) => void }) => {
	const { userId, gameId } = useLobby();
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
	const [form, setForm] = useState({ userId: "", gameId: "" });
	const mutation = useCreateGameGameIdPost();
	const { toast } = useToast();

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		e.stopPropagation();
		mutation.mutate(
			{
				id: form.gameId,
				params: { username: form.userId },
			},
			{
				onSettled,
				onSuccess: (res) => {
					if (res) {
						toast({ description: res });
					} else {
						setLobby(form);
					}
				},
			},
		);
	};
	return (
		<div>
			<form onSubmit={handleSubmit}>
				<div className="flex flex-col gap-2">
					<Label>username</Label>
					<Input
						value={form.userId}
						onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
						disabled={mutation.isPending}
					/>
					<Label>game id</Label>
					<Input
						value={form.gameId}
						onChange={(e) => setForm((f) => ({ ...f, gameId: e.target.value }))}
						disabled={mutation.isPending}
					/>
					<Button disabled={mutation.isPending}>Join Game</Button>
				</div>
			</form>
		</div>
	);
};

const queryClient = new QueryClient();

export const onSettled = () => {
	queryClient.invalidateQueries();
};

function App() {
	const [appConext, setAppContext] = useState({ userId: "", gameId: "" });
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
