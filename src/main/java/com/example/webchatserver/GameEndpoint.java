package com.example.webchatserver;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.Gson;
import jakarta.websocket.*;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@ServerEndpoint("/game/{currentUsername}") // Annotates this class as a WebSocket server endpoint that listens at the specified URL
public class GameEndpoint {
    private static final Map<String, String> playerChoices = new ConcurrentHashMap<>(); // Keeps track of players choices
    private static final Map<String, Session> sessions = new ConcurrentHashMap<>(); // Keeps track of each player's session

    /*
    Annotates the following method to be called when a WebSocket connection is
    opened
     */
    @OnOpen
    public void onOpen(Session session) throws IOException, EncodeException {
        //max 2 sessions at a time
        if (sessions.size() >= 2) {
            session.close(new CloseReason(CloseReason.CloseCodes.UNEXPECTED_CONDITION, "Max 2 players allowed"));
            return;
        }

        var currenPlayer = "";
        if (sessions.size() == 0) {
            currenPlayer = "Player 1";
            sessions.put(currenPlayer, session);
        } else if (sessions.size() == 1) {
            currenPlayer = "Player 2";
            sessions.put(currenPlayer, session);
        }

        // send currentPlayer to the client
        System.out.println("Sending currentPlayer: " + currenPlayer);
        session.getBasicRemote().sendText(new Gson().toJson(Map.of("currentPlayer", currenPlayer)));
    }

    /*
    Annotates the following method to be called when a WebSocket connection is
    closed
     */
    @OnClose
    public void onClose(Session session) {
        sessions.entrySet().removeIf(entry -> entry.getValue().equals(session));
    }

    /*
    Annotates the following method to be called when a WebSocket message is
    received
     */
    @OnMessage
    public void onMessage(Session session, String message) throws IOException {
        JsonObject jsonMessage = JsonParser.parseString(message).getAsJsonObject();
        String type = jsonMessage.get("type").getAsString();

        // Player makes has chosen a weapon
        if (type.equals("playerChoice")) {
            String username = jsonMessage.get("username").getAsString();
            String weapon = jsonMessage.get("weapon").getAsString();
            System.out.println("Player " + username + " chose: " + weapon);

            playerChoices.put(username, weapon);

            // If both players have made a choice, broadcast the choices to both players
            if (playerChoices.size() == 2) {
                String player1Weapon = playerChoices.get("Player 1");
                String player2Weapon = playerChoices.get("Player 2");
                String result = determineWinner(player1Weapon, player2Weapon);

                // Create a JSON object to send the result
                JsonObject jsonResult = new JsonObject();
                jsonResult.addProperty("result", result);

                // Send the result to both players
                for (Session s : sessions.values()) {
                    s.getBasicRemote().sendText(jsonResult.toString());
                }
                playerChoices.clear();
            }
        }

        // Reset the game (only reached 5 points)
        /*
        When a reset message is received, the game state is reset and a message is sent to
        all connected clients indicating that the game has been reset. On the client side,
        you would need to handle this reset message and update the UI accordingly.
         */
        if (type.equals("resetGame")) {
            playerChoices.clear();
            sessions.values().forEach(s -> {
                try {
                    s.getBasicRemote().sendText(new Gson().toJson(Map.of("resetGame", true)));
                } catch (IOException e) {
                    e.printStackTrace();
                }
            });
        }
    }

    // Determines the winner of a single round
    private String determineWinner(String player1Weapon, String player2Weapon) {
        if (player1Weapon.equals(player2Weapon)) {
            return "It's a tie!";
        } else if (
                (player1Weapon.equals("rock") && player2Weapon.equals("scissors")) ||
                        (player1Weapon.equals("paper") && player2Weapon.equals("rock")) ||
                        (player1Weapon.equals("scissors") && player2Weapon.equals("paper"))
        ) {
            return "Player 1 Wins!";
        } else {
            return "Player 2 Wins!";
        }
    }
}