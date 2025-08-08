// viewUI - rendering and display 

class GameView {
    constructor() {
        this.faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    }

  
    showScreen(screenId) {
        // Hide 
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show
        document.getElementById(screenId).classList.add('active');
        
        console.log(`📱 Switched to screen: ${screenId}`);
    }

   
    updatePlayerCountDisplay(playerCount) {
        document.getElementById('playerCount').textContent = playerCount;
        
        // Enable 
        const removeBtn = document.getElementById('removePlayer');
        const addBtn = document.getElementById('addPlayer');
        
        removeBtn.disabled = (playerCount <= 2);
        addBtn.disabled = (playerCount >= 4);
        
       //Dissable
        if (playerCount <= 2) {
            removeBtn.classList.add('disabled');
        } else {
            removeBtn.classList.remove('disabled');
        }
        
        if (playerCount >= 4) {
            addBtn.classList.add('disabled');
        } else {
            addBtn.classList.remove('disabled');
        }
    }


    generatePlayerSlots(playerCount, avatars) {
        const playersGrid = document.getElementById('playersGrid');
        playersGrid.innerHTML = '';
        
        for (let i = 1; i <= playerCount; i++) {
            const playerSlot = document.createElement('div');
            playerSlot.className = 'player-slot';
            playerSlot.id = `player${i}`;
            
            playerSlot.innerHTML = `
                <div class="player-header">
                    <input type="text" 
                           class="player-name-input" 
                           id="name${i}"
                           placeholder="Player ${i}"
                           value="Player ${i}"
                           maxlength="15">
                    <div class="player-title">Choose your game piece</div>
                </div>
                <div class="avatar-options">
                    ${avatars.map(avatar => `
                        <div class="avatar-option" 
                             data-player="${i}" 
                             data-avatar="${avatar.id}">
                            <span class="avatar-image">${avatar.emoji}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="selected-avatar" id="selected${i}">
                    No avatar selected
                </div>
            `;
            
            playersGrid.appendChild(playerSlot);
        }
    }

 
    updateAvatarSelections(playerCount, selectedAvatars, playerNames, avatars) {
  
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.remove('selected', 'disabled');
        });
        
    
        document.querySelectorAll('.player-slot').forEach(slot => {
            slot.classList.remove('ready');
        });
        
        document.querySelectorAll('.player-name-input').forEach(input => {
            input.classList.remove('ready');
        });
      
        for (let playerId = 1; playerId <= playerCount; playerId++) {
            const selectedAvatarId = selectedAvatars[playerId];
            const playerName = playerNames[playerId];
            
            if (selectedAvatarId && playerName) {
        
                document.getElementById(`player${playerId}`).classList.add('ready');
                document.getElementById(`name${playerId}`).classList.add('ready');
                
           
                const avatar = avatars.find(a => a.id === selectedAvatarId);
                document.getElementById(`selected${playerId}`).textContent = 
                    `Selected: ${avatar.emoji} ${avatar.name}`;
                

                const playerAvatarOption = document.querySelector(
                    `[data-player="${playerId}"][data-avatar="${selectedAvatarId}"]`
                );
                if (playerAvatarOption) {
                    playerAvatarOption.classList.add('selected');
                }
               
                document.querySelectorAll(`[data-avatar="${selectedAvatarId}"]`).forEach(option => {
                    if (option.dataset.player != playerId) {
                        option.classList.add('disabled');
                    }
                });
            } else {
                document.getElementById(`selected${playerId}`).textContent = 
                    'No avatar selected';
            }
        }
    }


    updatePlayButton(status) {
        const playBtn = document.getElementById('playBtn');
        const statusMessage = document.getElementById('statusMessage');
        
        playBtn.disabled = !status.ready;
        statusMessage.textContent = status.message;
        statusMessage.style.color = status.color;
    }

  
    updatePlayerNameInput(playerId, newName) {
        const nameInput = document.getElementById(`name${playerId}`);
        if (nameInput.value !== newName) {
            nameInput.value = newName;
        }
    }
 
    showGameStartAlert(players) {
        let alertMessage = "Players ready to start:\n\n";
        players.forEach(player => {
            const avatar = player.avatar; 
            alertMessage += `Player ${player.order_id}: ${player.name} (${player.avatar}) - $${player.money}\n`;
        });
        alert(alertMessage);
    }

   
    startDiceRolling() {
        const dice1 = document.getElementById('dice1');
        const dice2 = document.getElementById('dice2');

        dice1.classList.add('rolling');
        dice2.classList.add('rolling');
        
      
        document.getElementById('rollDiceBtn').disabled = true;
    }

    showDiceResults(roll1, roll2) {
        const dice1 = document.getElementById('dice1');
        const dice2 = document.getElementById('dice2');
        
        dice1.classList.remove('rolling');
        dice2.classList.remove('rolling');

        dice1.innerHTML = this.faces[roll1 - 1];
        dice2.innerHTML = this.faces[roll2 - 1];
    }

 
    updateTurnStatus(message) {
        document.getElementById('turnStatus').textContent = message;
    }

    setTurnStartState() {
        document.getElementById('startTurnBtn').disabled = true;
        document.getElementById('rollDiceBtn').disabled = false;
        document.getElementById('endTurnBtn').disabled = true;
    }

    setDiceRolledState() {
        document.getElementById('rollDiceBtn').disabled = true;
        document.getElementById('endTurnBtn').disabled = false;
    }

    setTurnEndState() {
        document.getElementById('startTurnBtn').disabled = false;
        document.getElementById('rollDiceBtn').disabled = true;
        document.getElementById('endTurnBtn').disabled = true;
    }

 
    showCurrentPlayer(currentPlayer, avatars) {
        const avatarInfo = avatars.find(avatar => avatar.id === currentPlayer.avatar);
        

        document.getElementById('currentPlayerDisplay').innerHTML = `
            <div class="player-avatar">${avatarInfo.emoji}</div>
            <div class="player-info">
                <h3>Player ${currentPlayer.order_id}: ${currentPlayer.name}</h3>
                <p>Money: $${currentPlayer.money}</p>
                <p>Properties: ${currentPlayer.properties.length > 0 ? currentPlayer.properties.join(", ") : 'None'}</p>
                <p>Mortgaged: ${currentPlayer.mortgage.length > 0 ? currentPlayer.mortgage.join(", ") : 'None'}</p>
                <p>Houses: ${Object.keys(currentPlayer.houses).length}, Hotels: ${Object.keys(currentPlayer.hotels).length}</p>
            </div>
        `;
    }

  
    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }


    reloadPage() {
        setTimeout(() => {
            location.reload();
        }, 300);
    }
}