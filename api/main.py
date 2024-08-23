from __future__ import annotations
from typing import Literal
from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, computed_field
from pydantic.alias_generators import to_camel
from fastapi.middleware.cors import CORSMiddleware

games: dict[str, Game] = {}


class Player(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    username: str
    money: int


PlayerPosition = Literal[0, 1]


class Move(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    row: int
    col: int
    player_position: PlayerPosition


class Round(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    move: Move | None = None
    bets: tuple[int | None, int | None] = (None, None)


class Game(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    users: tuple[str, str]
    rounds: list[Round]

    @computed_field
    @property
    def board(self) -> list[list[int | None]]:
        board: list[list[int | None]] = [[None for _ in range(3)] for _ in range(3)]
        for round in self.rounds:
            if round.move:
                board[round.move.row][round.move.col] = round.move.player_position
        return board

    @computed_field
    @property
    def players(self) -> tuple[Player, Player]:
        player1 = Player(username=self.users[0], money=10)
        player2 = Player(username=self.users[1], money=10)

        for round in self.rounds:
            [bet1, bet2] = round.bets
            if bet1 is not None and bet2 is not None:
                player1.money -= bet1
                player2.money -= bet2

        return (player1, player2)

    @computed_field
    @property
    def winner(self) -> int | None:
        board = self.board
        for i in range(3):
            s = set(board[i])
            if len(s) == 1:
                winner = s.pop()
                if winner is not None:
                    return winner

            s = set([board[x][i] for x in range(3)])
            if len(s) == 1:
                winner = s.pop()
                if winner is not None:
                    return winner

        s = set([board[x][x] for x in range(3)])
        if len(s) == 1:
            winner = s.pop()
            if winner is not None:
                return winner

        s = set([board[x][2 - x] for x in range(3)])
        if len(s) == 1:
            winner = s.pop()
            if winner is not None:
                return winner

        return None

    @computed_field
    @property
    def catsgame(self) -> bool:
        for a in self.board:
            for x in a:
                if x is None:
                    return False
        return True

    @computed_field
    @property
    def state(
        self,
    ) -> Literal["winner"] | Literal["tie"] | Literal["betting"] | Literal["moving"]:
        winner = self.winner
        if winner is not None:
            return "winner"

        if self.players[0].money == self.players[1].money == 0:
            return "tie"
        if self.catsgame:
            return "tie"

        [bet1, bet2] = self.rounds[-1].bets
        if bet1 is None or bet2 is None:
            return "betting"

        return "moving"

    def get_player_position(self, username: str) -> Literal[0] | Literal[1]:
        if self.users[0] == username:
            return 0
        elif self.users[1] == username:
            return 1
        raise KeyError("Could not find user")

    def make_bet(self, username: str, dollars: int) -> str | None:
        player_position = self.get_player_position(username)

        if self.rounds[-1].bets[player_position] is not None:
            return "Bet already made"

        current_money = self.players[player_position].money
        if dollars > current_money:
            return f"You only have ${current_money} left"

        if player_position == 0:
            self.rounds[-1].bets = (
                dollars,
                self.rounds[-1].bets[1],
            )
        else:
            self.rounds[-1].bets = (
                self.rounds[-1].bets[0],
                dollars,
            )

        if self.rounds[-1].bets[0] == self.rounds[-1].bets[1]:
            self.rounds.append(Round())

    def make_move(self, username: str, row: int, col: int) -> str | None:
        player_position = self.get_player_position(username)
        round = self.rounds[-1]

        your_bet = round.bets[player_position]
        opp_bet = round.bets[1 - player_position]
        if your_bet is None or opp_bet is None:
            return "Betting is not done yet"
        if your_bet < opp_bet:
            return "You didn't win the betting"

        if round.move is not None:
            return "You already made a move"
        if self.board[row][col] is not None:
            return "A move has already been played there"
        round.move = Move(row=row, col=col, player_position=player_position)
        self.rounds.append(Round())


app = FastAPI()
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/game/{id}")
def create_game(id: str, username: str) -> str | None:
    if id == "" or username == "":
        return "Missing id or username"

    game = games.get(id)
    if game is None:
        games[id] = Game(users=(username, ""), rounds=[Round()])
    else:
        if game.users[1] != "":
            return "There's already 2 players in this game"
        if game.users[0] == username:
            return "There's already a user with that name"
        game.users = (game.users[0], username)


@app.get("/game/{id}")
def get_game_by_id(id: str) -> Game:
    return games[id]


@app.post("/game/{id}/bet")
def make_bet(id: str, username: str, dollars: int) -> str | None:
    return games[id].make_bet(username, dollars)


@app.post("/game/{id}/move")
def make_move(id: str, username: str, row: int, col: int) -> str | None:
    return games[id].make_move(username, row, col)


@app.delete("/game/{id}")
def delete_game(id: str) -> str | None:
    game = games.get(id)
    if game is None:
        return f"No game of id: {id}"
    del games[id]
