import { type Game, getGetGameByIdGameIdGetQueryKey } from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const useGameWebhook = (id: string) => {
  const queryClient = useQueryClient();
  useEffect(() => {
    const websocket = new WebSocket(
      `${import.meta.env.VITE_WS_URL}/ws/game/${id}`
    );
    websocket.onopen = () => {
      console.log("connected");
    };
    websocket.onmessage = (event) => {
      const data: Game = JSON.parse(event.data);
      queryClient.setQueriesData(
        { queryKey: getGetGameByIdGameIdGetQueryKey(id) },
        data
      );
    };

    return () => {
      websocket.close();
    };
  }, [id, queryClient]);
};
