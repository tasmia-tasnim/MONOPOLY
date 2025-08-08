// controller- interactions with user and connects update to model,view

class GameController {
    constructor() {
        this.model = new GameModel();
        this.view = new GameView();
        
        this.initializeEventListeners();
        this.initialize();
    }

    initialize() {
        console.log('🎮 Monopoly Single Page App loaded!');
    }

    initializeEventListeners() {
        
        window.onclick = (event) => {
            const rulesModal = document.getElementById('rulesModal');
            const exitModal = document.getElementById('confirmExitModal');
            
            if (event.target === rulesModal) {
                this.closeRulesModal();
            }
            if (event.target === exitModal) {
                this.closeConfirmExitModal();
            }
        };

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeRulesModal();
                this.closeConfirmExitModal();
            }
        });
    }

    // Screen navi
    showScreen(screenId) {
        this.model.setCurrentScreen(screenId);
        this.view.showScreen(screenId);
    }

    showMainMenu() {
        this.showScreen('mainMenu');
        this.view.reloadPage();
    }

    showGameSetup() {
        this.showScreen('gameSetup');
        // Reset 
        this.changePlayerCount(0);
    }

    chooseAvatars() {
        this.showScreen('avatarSelection');
        this.generatePlayerSlots();
        this.updatePlayButton();
    }

    // Player count
    changePlayerCount(change) {
        const newCount = this.model.changePlayerCount(change);
        this.view.updatePlayerCountDisplay(newCount);
    }

  
    generatePlayerSlots() {
        this.view.generatePlayerSlots(this.model.playerCount, this.model.avatars);
        
    
        for (let i = 1; i <= this.model.playerCount; i++) {
            this.model.playerNames[i] = `Player ${i}`;
        }
        
      
        for (let i = 1; i <= this.model.playerCount; i++) {
            const nameInput = document.getElementById(`name${i}`);
            if (nameInput) {
                nameInput.onchange = () => this.updatePlayerName(i);
                nameInput.onkeyup = () => this.updatePlayerName(i);
            }
        }
        
    
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.onclick = () => {
                const playerId = parseInt(option.dataset.player);
                const avatarId = option.dataset.avatar;
                this.selectAvatar(playerId, avatarId);
            };
        });
    }

    updatePlayerName(playerId) {
        const nameInput = document.getElementById(`name${playerId}`);
        const inputValue = nameInput.value;
        const isUserTyping = document.activeElement === nameInput;
        
      
        const finalName = this.model.updatePlayerName(playerId, inputValue, isUserTyping);
        
        
        if (!isUserTyping && finalName !== inputValue) {
            this.view.updatePlayerNameInput(playerId, finalName);
        }
        
        
        this.updateAvatarSelections();
        this.updatePlayButton();
    }

    selectAvatar(playerId, avatarId) {
        const success = this.model.selectAvatar(playerId, avatarId);
        if (!success) {
            return; // taken
        }
        
     
        this.updateAvatarSelections();
        this.updatePlayButton();
    }

    updateAvatarSelections() {
        this.view.updateAvatarSelections(
            this.model.playerCount,
            this.model.selectedAvatars,
            this.model.playerNames,
            this.model.avatars
        );
    }

    updatePlayButton() {
        const status = this.model.getReadyStatus();
        this.view.updatePlayButton(status);
    }

    // Game start
    startGame() {
        if (!this.model.isReadyToStart()) {
            return;
        }

        console.log('🎮 Starting game with players:', {
            playerNames: this.model.playerNames,
            selectedAvatars: this.model.selectedAvatars
        });


        const players = this.model.initializePlayers();
        console.log('✅ Players array:', players);

        //player info
        this.view.showGameStartAlert(players);

     
        this.showScreen('monopoly-board');
        
        setTimeout(() => {
            this.showCurrentPlayerOnly();
        }, 100);
    }

  
    rollBothDice() {
        if (this.model.getGameState() !== 'TURN_STARTED') return;
        
    
        this.view.startDiceRolling();
        
        setTimeout(() => {
           
            const { roll1, roll2, total } = this.model.rollDice();
           
            this.view.showDiceResults(roll1, roll2);
            
          
            this.model.setGameState('DICE_ROLLED');
            
        
            const currentPlayer = this.model.getCurrentPlayer();
            this.view.updateTurnStatus(`${currentPlayer.name} rolled ${total}! Click "End Turn" to finish.`);
            this.view.setDiceRolledState();
            
            console.log(`🎲 ${currentPlayer.name} rolled: ${roll1} + ${roll2} = ${total}`);
        }, 1000);
    }

   
    startTurn() {
        const currentPlayer = this.model.startTurn();
        
        console.log(`🎮 ${currentPlayer.name}'s turn started!`);
        
        this.view.updateTurnStatus(`${currentPlayer.name}'s Turn - Roll the dice!`);
        this.view.setTurnStartState();
      
        this.showCurrentPlayerOnly();
    }

    endTurn() {
        const { previousPlayer, nextPlayer } = this.model.endTurn();
        
        console.log(`✅ ${previousPlayer.name}'s turn ended!`);
        
        this.view.updateTurnStatus(`Turn ended! Next: ${nextPlayer.name} - Click "Start Turn"`);
        this.view.setTurnEndState();
        
   
        this.showCurrentPlayerOnly();
    }

    showCurrentPlayerOnly() {
        const currentPlayer = this.model.getCurrentPlayer();
        this.view.showCurrentPlayer(currentPlayer, this.model.avatars);
    }

    // Modal 
    showRules() {
        this.view.showModal('rulesModal');
    }

    closeRulesModal() {
        this.view.hideModal('rulesModal');
    }

    // Exit 
    openConfirmExitModal() {
        this.view.showModal('confirmExitModal');
    }

    closeConfirmExitModal() {
        this.view.hideModal('confirmExitModal');
    }

    exitGame() {
        alert("Exiting game...");
        window.location.href = "index.html";
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.gameController = new GameController();
});

// HTML-onclick 
function showMainMenu() { window.gameController.showMainMenu(); }
function showGameSetup() { window.gameController.showGameSetup(); }
function chooseAvatars() { window.gameController.chooseAvatars(); }
function changePlayerCount(change) { window.gameController.changePlayerCount(change); }
function updatePlayerName(playerId) { window.gameController.updatePlayerName(playerId); }
function selectAvatar(playerId, avatarId) { window.gameController.selectAvatar(playerId, avatarId); }
function startGame() { window.gameController.startGame(); }
function rollBothDice() { window.gameController.rollBothDice(); }
function startTurn() { window.gameController.startTurn(); }
function endTurn() { window.gameController.endTurn(); }
function showRules() { window.gameController.showRules(); }
function closeRulesModal() { window.gameController.closeRulesModal(); }
function openConfirmExitModal() { window.gameController.openConfirmExitModal(); }
function closeConfirmExitModal() { window.gameController.closeConfirmExitModal(); }
function exitGame() { window.gameController.exitGame(); }