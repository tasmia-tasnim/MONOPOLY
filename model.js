// model - Data store and handles logic

class GameModel {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameState = 'WAITING_TO_START';
        this.currentScreen = 'mainMenu';
        this.playerCount = 2;
        this.selectedAvatars = {}; 
        this.playerNames = {}; 
        
      
        this.avatars = [
            { id: 'car', emoji: '🚗', name: 'Car' },
            { id: 'hat', emoji: '🎩', name: 'Top Hat' },
            { id: 'dog', emoji: '🐕', name: 'Dog' },
            { id: 'ship', emoji: '🚢', name: 'Ship' },
            { id: 'shoe', emoji: '👞', name: 'Shoe' },
            { id: 'iron', emoji: '🔧', name: 'Iron' },
            { id: 'horse', emoji: '🐎', name: 'Horse' },
            { id: 'cat', emoji: '🐱', name: 'Cat' }
        ];
    }

    // Player count 
    changePlayerCount(change) {
        this.playerCount += change;
        
    
        if (this.playerCount < 2) this.playerCount = 2;
        if (this.playerCount > 4) this.playerCount = 4;
        
    
        this.selectedAvatars = {};
        this.playerNames = {};
        
        return this.playerCount;
    }

    // Avatar 
    selectAvatar(playerId, avatarId) {
        const isAvatarTaken = Object.values(this.selectedAvatars).includes(avatarId);
        if (isAvatarTaken && this.selectedAvatars[playerId] !== avatarId) {
            return false; 
        }
       
        this.selectedAvatars[playerId] = avatarId;
        return true;
    }

   
    updatePlayerName(playerId, newName, isUserTyping = false) {
      
        if (isUserTyping && !newName.trim()) {
            this.playerNames[playerId] = newName;
            return newName;
        }
        
        // default 
        if (!newName.trim() && !isUserTyping) {
            newName = `Player ${playerId}`;
        }
        
        //check dupilcate
        if (newName.trim()) {
            const isDuplicate = Object.entries(this.playerNames).some(([id, name]) => 
                id != playerId && name.toLowerCase() === newName.toLowerCase()
            );
            
            if (isDuplicate) {
                
                let counter = 2;
                let uniqueName = `${newName} ${counter}`;
                while (Object.values(this.playerNames).some(name => 
                    name.toLowerCase() === uniqueName.toLowerCase()
                )) {
                    counter++;
                    uniqueName = `${newName} ${counter}`;
                }
                newName = uniqueName;
            }
        }
        
        this.playerNames[playerId] = newName;
        return newName;
    }

    
    isReadyToStart() {
        const selectedCount = Object.keys(this.selectedAvatars).length;
        const namedCount = Object.keys(this.playerNames).filter(id => 
            this.playerNames[id] && this.playerNames[id].trim()
        ).length;
        
        return selectedCount === this.playerCount && namedCount === this.playerCount;
    }

    getReadyStatus() {
        const selectedCount = Object.keys(this.selectedAvatars).length;
        const namedCount = Object.keys(this.playerNames).filter(id => 
            this.playerNames[id] && this.playerNames[id].trim()
        ).length;
        
        const missingAvatars = this.playerCount - selectedCount;
        const missingNames = this.playerCount - namedCount;
        
        if (selectedCount === this.playerCount && namedCount === this.playerCount) {
            return {
                ready: true,
                message: ' All players ready! Click START GAME to begin.',
                color: '#27ae60'
            };
        }
        
        let message = '';
        if (missingAvatars > 0 && missingNames > 0) {
            message = `Complete setup for ${Math.max(missingAvatars, missingNames)} more player(s)`;
        } else if (missingAvatars > 0) {
            message = `Select avatar for ${missingAvatars} more player(s)`;
        } else if (missingNames > 0) {
            message = `Enter name for ${missingNames} more player(s)`;
        }
        
        return {
            ready: false,
            message: message,
            color: '#e16938'
        };
    }

    //players array
    initializePlayers() {
        this.players = [];
        
        for (let i = 1; i <= this.playerCount; i++) {
            this.players.push({
                order_id: i,
                name: this.playerNames[i],
                avatar: this.selectedAvatars[i],
                money: 1500,
                position: 0,
                properties: [],
                mortgage: [],
                houses: {},
                hotel_pass: false,
                hotels: {},
                jail: false,
                pass_go: false,
            });
        }
        
        return this.players;
    }

  
    getAvatarEmoji(tokenId) {
        const avatar = this.avatars.find(a => a.id === tokenId);
        return avatar ? avatar.emoji : '❓';
    }

   
    rollDice() {
        const roll1 = Math.floor(Math.random() * 6) + 1;
        const roll2 = Math.floor(Math.random() * 6) + 1;
        const total = roll1 + roll2;
        
        return { roll1, roll2, total };
    }

  
    startTurn() {
        this.gameState = 'TURN_STARTED';
        return this.players[this.currentPlayerIndex];
    }

    endTurn() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.gameState = 'WAITING_TO_START';
        
        return {
            previousPlayer: currentPlayer,
            nextPlayer: this.players[this.currentPlayerIndex]
        };
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

 
    setCurrentScreen(screenId) {
        this.currentScreen = screenId;
    }

    getCurrentScreen() {
        return this.currentScreen;
    }


    setGameState(state) {
        this.gameState = state;
    }

    getGameState() {
        return this.gameState;
    }
}