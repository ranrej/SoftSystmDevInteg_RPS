let ws; // WebSocket connection
let currentPlayer; // Current player: 1 or 2
let player1Weapon = null; // Weapon choice of player 1
let player2Weapon = null; // Weapon choice of player 2

// Event listener for when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', (event) => {

    // Get references to various elements on the page
    const choices = document.querySelectorAll('.choice');
    const player1ScoreElem = document.querySelector('.player1-score');
    const player2ScoreElem = document.querySelector('.player2-score');
    const resultElem = document.querySelector('#result');
    const playAgainBtn = document.querySelector('#play-again');
    const playersChoiceElem = document.querySelector('#players-choice');
    const currentPlayerElem = document.querySelector('.player');

    const weapons = ['rock', 'paper', 'scissors']; // Array of possible weapon choices
    let player1Score = 0; // Score of player 1
    let player2Score = 0; // Score of player 2
    currentPlayer = 1; // Player 1 starts the game

    // Establish a WebSocket connection
    ws = new WebSocket("ws://localhost:8080/WSChatServer-1.0-SNAPSHOT/game/" + encodeURIComponent(currentPlayer));

    // This function is executed when the WebSocket connection is successfully established
    ws.onopen = function() {
        console.log("Connection established");
    }

    // This function is executed when a message is received from the server
    ws.onmessage = function(event) {
        const data = JSON.parse(event.data); // Parse the received data
        console.log("Received data: ", data);

        // Updates current player
        if (data.currentPlayer) {
            if (data.currentPlayer === "Player 1") {
                currentPlayer = 1;
                currentPlayerElem.innerHTML = `You are Player 1`;
            } else if (data.currentPlayer === "Player 2") {
                currentPlayer = 2;
                currentPlayerElem.innerHTML = `You are Player 2`;
            }
            console.log(currentPlayer + " connected");
        }

        // Determine who wins
        else if (data.result) {
            if (data.result === "Player 1 Wins!") {
                player1Score++;
                updateScore(data.result, player1Score, player2Score);
            } else if (data.result === "Player 2 Wins!") {
                player2Score++;
                updateScore(data.result, player1Score, player2Score);
            } else if (data.result === "It's a tie!") {
                updateScore(data.result, player1Score, player2Score);
            }
        }

        // Handle reset game message
        else if (data.resetGame) {
            resetGame(false);
        }
    }

    // Function to update score and display result
    function updateScore(result, player1Score, player2Score) {
        player1ScoreElem.innerHTML = `Player 1: ${player1Score}`;
        player2ScoreElem.innerHTML = `Player 2: ${player2Score}`;
        resultElem.innerHTML = result;

        if (player1Score === 5) {
            resultElem.textContent = 'Player 1! You win the game!';
            resultElem.style.color = 'green';
            playersChoiceElem.innerHTML = 'Game Over';
            disableOptions();
        }

        if (player2Score === 5) {
            resultElem.textContent = 'Player 2! You win the game!';
            resultElem.style.color = 'green';
            playersChoiceElem.innerHTML = 'Game Over';
            disableOptions();
        }
    }

    // Function to handle player choice
    function selectWeapon() {
        if (ws.readyState !== WebSocket.OPEN) {
            console.log('WebSocket is not open. ReadyState: ' + ws.readyState);
            return;
        }

        if (currentPlayer === 1) {
            player1Weapon = this.id;

            // Send player 1 choice to the server
            ws.send(JSON.stringify({
                type: 'playerChoice',
                username: 'Player 1',
                weapon: player1Weapon
            }));
        } else if (currentPlayer === 2) {
            player2Weapon = this.id;

            // Send player 2 choice to the server
            ws.send(JSON.stringify({
                type: 'playerChoice',
                username: 'Player 2',
                weapon: player2Weapon
            }));
        }
    }

    // Function to reset the game
    function resetGame(sendResetMessage = true) {
        player1Score = 0;
        player2Score = 0;
        player1ScoreElem.innerHTML = 'Player 1: 0';
        player2ScoreElem.innerHTML = 'Player 2: 0';
        resultElem.innerHTML = 'Choose your weapon!';
        resultElem.style.color = '#000';
        playersChoiceElem.innerHTML = '';
        enableOptions();

        // Send reset message to the server if sendResetMessage is true
        if (sendResetMessage) {
            ws.send(JSON.stringify({
                type: 'resetGame'
            }));
        }
    }

    // Function to disable the weapon choices
    function disableOptions() {
        choices.forEach((choice) => {
            choice.style.pointerEvents = 'none';
        });
    }

    // Function to enable the weapon choices
    function enableOptions() {
        choices.forEach((choice) => {
            choice.style.pointerEvents = 'auto';
        });
    }

    // Event listeners for the weapon choices and the play again button
    choices.forEach((choice) => choice.addEventListener('click', selectWeapon));
    playAgainBtn.addEventListener('click', resetGame);
});