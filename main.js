// API Config
const API_BASE_URL = 'http://localhost:3000/api';

// Global game 
let currentGameId = null;
let gameState = null;
let currentPlayerIndex = 0;
let gameStateLocal = 'WAITING_TO_START';
let currentScreen = 'mainMenu';
let playerCount = 2;
let selectedAvatars = {};
let playerNames = {};

//  avatars
const avatars = [
    { id: 'car', emoji: '🚗', name: 'Car' },
    { id: 'hat', emoji: '🎩', name: 'Top Hat' },
    { id: 'dog', emoji: '🐕', name: 'Dog' },
    { id: 'ship', emoji: '🚢', name: 'Ship' },
    { id: 'shoe', emoji: '👞', name: 'Shoe' },
    { id: 'iron', emoji: '🔧', name: 'Iron' },
    { id: 'horse', emoji: '🐎', name: 'Horse' },
    { id: 'cat', emoji: '🐱', name: 'Cat' }
];

// API Helper 
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'API call failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Screen 
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    document.getElementById(screenId).classList.add('active');
    currentScreen = screenId;
    
    console.log(`📱 Switched to screen: ${screenId}`);
}

function showMainMenu() {
    showScreen('mainMenu');
    setTimeout(() => {
        location.reload();
    }, 300);
}

function showGameSetup() {
    showScreen('gameSetup');
    changePlayerCount(0);
}

function chooseAvatars() {
    showScreen('avatarSelection');
    generatePlayerSlots();
    updatePlayButton();
}

// Game setup 
function changePlayerCount(change) {
    playerCount += change;
    
    if (playerCount < 2) playerCount = 2;
    if (playerCount > 4) playerCount = 4;
    
    document.getElementById('playerCount').textContent = playerCount;
    
    document.getElementById('removePlayer').disabled = (playerCount <= 2);
    document.getElementById('addPlayer').disabled = (playerCount >= 4);
    
    if (playerCount <= 2) {
        document.getElementById('removePlayer').classList.add('disabled');
    } else {
        document.getElementById('removePlayer').classList.remove('disabled');
    }
    
    if (playerCount >= 4) {
        document.getElementById('addPlayer').classList.add('disabled');
    } else {
        document.getElementById('addPlayer').classList.remove('disabled');
    }
    
    selectedAvatars = {};
    playerNames = {};
}

// Avatar and name functions
function generatePlayerSlots() {
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
                       maxlength="15"
                       onchange="updatePlayerName(${i})"
                       onkeyup="updatePlayerName(${i})">
                <div class="player-title">Choose your game piece</div>
            </div>
            <div class="avatar-options">
                ${avatars.map(avatar => `
                    <div class="avatar-option" 
                         data-player="${i}" 
                         data-avatar="${avatar.id}"
                         onclick="selectAvatar(${i}, '${avatar.id}')">
                        <span class="avatar-image">${avatar.emoji}</span>
                    </div>
                `).join('')}
            </div>
            <div class="selected-avatar" id="selected${i}">
                No avatar selected
            </div>
        `;
        
        playersGrid.appendChild(playerSlot);
        playerNames[i] = `Player ${i}`;
    }
}

function updatePlayerName(playerId) {
    const nameInput = document.getElementById(`name${playerId}`);
    let newName = nameInput.value.trim();
    
    if (!newName && document.activeElement !== nameInput) {
        newName = `Player ${playerId}`;
        nameInput.value = newName;
    }
    
    if (newName) {
        const isDuplicate = Object.entries(playerNames).some(([id, name]) => 
            id != playerId && name.toLowerCase() === newName.toLowerCase()
        );
        
        if (isDuplicate) {
            let counter = 2;
            let uniqueName = `${newName} ${counter}`;
            while (Object.values(playerNames).some(name => 
                name.toLowerCase() === uniqueName.toLowerCase()
            )) {
                counter++;
                uniqueName = `${newName} ${counter}`;
            }
            newName = uniqueName;
            nameInput.value = newName;
        }
        
        playerNames[playerId] = newName;
    } else {
        playerNames[playerId] = '';
    }
    
    updateAvatarSelections();
    updatePlayButton();
}

function selectAvatar(playerId, avatarId) {
    const isAvatarTaken = Object.values(selectedAvatars).includes(avatarId);
    if (isAvatarTaken && selectedAvatars[playerId] !== avatarId) {
        return;
    }
    
    selectedAvatars[playerId] = avatarId;
    updateAvatarSelections();
    updatePlayButton();
}

function updateAvatarSelections() {
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

function updatePlayButton() {
    const playBtn = document.getElementById('playBtn');
    const statusMessage = document.getElementById('statusMessage');
    const selectedCount = Object.keys(selectedAvatars).length;
    const namedCount = Object.keys(playerNames).filter(id => playerNames[id] && playerNames[id].trim()).length;
    
    if (selectedCount === playerCount && namedCount === playerCount) {
        playBtn.disabled = false;
        statusMessage.textContent = '🎉 All players ready! Click START GAME to begin.';
        statusMessage.style.color = '#27ae60';
    } else {
        playBtn.disabled = true;
        const missingAvatars = playerCount - selectedCount;
        const missingNames = playerCount - namedCount;
        
        let message = '';
        if (missingAvatars > 0 && missingNames > 0) {
            message = `Complete setup for ${Math.max(missingAvatars, missingNames)} more player(s)`;
        } else if (missingAvatars > 0) {
            message = `Select avatar for ${missingAvatars} more player(s)`;
        } else if (missingNames > 0) {
            message = `Enter name for ${missingNames} more player(s)`;
        }
        
        statusMessage.textContent = message;
        statusMessage.style.color = '#e16938';
    }
}

// Start game 
async function startGame() {
    if (
        Object.keys(selectedAvatars).length === playerCount &&
        Object.keys(playerNames).length === playerCount
    ) {
        try {
            console.log('🎮 Starting game with players:', { playerNames, selectedAvatars });

            
            const playersData = [];
            for (let i = 1; i <= playerCount; i++) {
                playersData.push({
                    name: playerNames[i],
                    avatar: selectedAvatars[i]
                });
            }

         
            const statusMessage = document.getElementById('statusMessage');
            statusMessage.textContent = '🎮 Creating game...';
            statusMessage.style.color = '#3498db';

        
            const response = await apiCall('/games/create', {
                method: 'POST',
                body: JSON.stringify({ players: playersData })
            });

            currentGameId = response.data.id;
            gameState = response.data;

            console.log('✅ Game created successfully:', gameState);

            // Show success message
            let alertMessage = "Players ready to start:\n\n";
            gameState.players.forEach(player => {
                const avatarEmoji = getAvatarEmoji(player.avatar);
                alertMessage += `Player ${player.order_id}: ${player.name} (${avatarEmoji}) - ${player.money}\n`;
            });
            alert(alertMessage);

            // Switch to game board
            showScreen('monopoly-board');
            
            setTimeout(() => {
                showCurrentPlayerOnly();
                initializePlayerPositions();
            }, 100);

        } catch (error) {
            console.error('Error starting game:', error);
            const statusMessage = document.getElementById('statusMessage');
            statusMessage.textContent = '❌ Failed to start game. Please try again.';
            statusMessage.style.color = '#e74c3c';
        }
    }
}

// get emoji for token
function getAvatarEmoji(tokenId) {
    const avatar = avatars.find(a => a.id === tokenId);
    return avatar ? avatar.emoji : '❓';
}

// Roll dice API call
async function rollBothDice() {
    if (!currentGameId || gameStateLocal !== 'TURN_STARTED') return;
    
    try {
        const dice1 = document.getElementById('dice1');
        const dice2 = document.getElementById('dice2');

        dice1.classList.add('rolling');
        dice2.classList.add('rolling');
        
        document.getElementById('rollDiceBtn').disabled = true;

    
        const response = await apiCall(`/games/${currentGameId}/roll-dice`, {
            method: 'POST'
        });

        const { dice, player, property, gameState: newGameState } = response.data;

    
setTimeout(async () => {
    dice1.classList.remove('rolling');
    dice2.classList.remove('rolling');

    const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    dice1.innerHTML = faces[dice.dice1 - 1];
    dice2.innerHTML = faces[dice.dice2 - 1];
    
    gameStateLocal = 'DICE_ROLLED';
    gameState = newGameState;
    
    //player movement
    const movedPlayer = response.data.player;
    await animatePlayerMovement(
        movedPlayer.id, 
        movedPlayer.oldPosition, 
        movedPlayer.newPosition, 
        movedPlayer.passedGo
    );
    
    let statusText = `${player.name} rolled ${dice.total}!`;
    if (player.passedGo) {
        statusText += ` Passed GO and collected $200!`;
    }
    
    // property modal 
    if (property && (property.type === 'property' || property.type === 'railroad' || property.type === 'utility')) {
        if (!property.owned) {
            
            document.getElementById('propertyModalTitle').dataset.position = property.position;
            showPropertyModal(property);
            statusText += ` Landed on ${property.name} - Check the popup to buy!`;
        } else {
            statusText += ` Landed on ${property.name} (owned by ${property.owner.name})`;
        }
    } else if (property) {
        statusText += ` Landed on ${property.name}`;
    }
    
    document.getElementById('turnStatus').textContent = statusText;
    document.getElementById('endTurnBtn').disabled = false;
    
    console.log(`🎲 ${player.name} rolled: ${dice.dice1} + ${dice.dice2} = ${dice.total}`);
    
    // Update player display
    showCurrentPlayerOnly();
}, 1000);

    } catch (error) {
        console.error('Error rolling dice:', error);
        document.getElementById('rollDiceBtn').disabled = false;
        alert('Failed to roll dice. Please try again.');
    }
}

// End turn
async function endTurn() {
    if (!currentGameId) return;
    
    try {
        const response = await apiCall(`/games/${currentGameId}/end-turn`, {
            method: 'POST'
        });

        const { nextPlayer, gameState: newGameState } = response.data;
        gameState = newGameState;
        
        console.log(`✅ Turn ended! Next: ${nextPlayer.name}`);
        
        gameStateLocal = 'WAITING_TO_START';
        
        document.getElementById('turnStatus').textContent = `Turn ended! Next: ${nextPlayer.name} - Click "Start Turn"`;
        document.getElementById('startTurnBtn').disabled = false;
        document.getElementById('rollDiceBtn').disabled = true;
        document.getElementById('endTurnBtn').disabled = true;
        
        showCurrentPlayerOnly();
        initializePlayerPositions();

    } catch (error) {
        console.error('Error ending turn:', error);
        alert('Failed to end turn. Please try again.');
    }
}


function startTurn() {
    if (!gameState) return;
    
    const currentPlayer = gameState.players.find(p => p.id === gameState.current_player_id);
    gameStateLocal = 'TURN_STARTED';
    
    console.log(`🎮 ${currentPlayer.name}'s turn started!`);
    
    document.getElementById('turnStatus').textContent = `${currentPlayer.name}'s Turn - Roll the dice!`;
    document.getElementById('startTurnBtn').disabled = true;
    document.getElementById('rollDiceBtn').disabled = false;
    
    showCurrentPlayerOnly();
}

function showCurrentPlayerOnly() {
    if (!gameState || !gameState.current_player_id) return;
    
    const currentPlayer = gameState.players.find(p => p.id === gameState.current_player_id);
    if (!currentPlayer) return;
    
    const avatarInfo = avatars.find(avatar => avatar.id === currentPlayer.avatar);
    
    document.getElementById('currentPlayerDisplay').innerHTML = `
        <div class="player-avatar">${avatarInfo.emoji}</div>
        <div class="player-info">
            <h3>Player ${currentPlayer.order_id}: ${currentPlayer.name}</h3>
            <p>Money: ${currentPlayer.money}</p>
            <p>Properties: ${currentPlayer.properties.length > 0 ? currentPlayer.properties.map(p => p.name).join(", ") : 'None'}</p>
            <p>Mortgaged: ${currentPlayer.mortgaged_properties.length > 0 ? currentPlayer.mortgaged_properties.join(", ") : 'None'}</p>
            <p>Houses: ${currentPlayer.properties.reduce((sum, p) => sum + p.houses, 0)}, Hotels: ${currentPlayer.properties.reduce((sum, p) => sum + p.hotels, 0)}</p>
        </div>
    `;
}

// Modal functions 
function showRules() {
    document.getElementById('rulesModal').style.display = 'block';
}

function closeRulesModal() {
    document.getElementById('rulesModal').style.display = 'none';
}

function openConfirmExitModal() {
    document.getElementById('confirmExitModal').style.display = 'block';
}

function closeConfirmExitModal() {
    document.getElementById('confirmExitModal').style.display = 'none';
}


window.onclick = function(event) {
    const rulesModal = document.getElementById('rulesModal');
    const exitModal = document.getElementById('confirmExitModal');
    if (event.target === rulesModal) {
        closeRulesModal();
    }
    if (event.target === exitModal) {
        closeConfirmExitModal();
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeRulesModal();
        closeConfirmExitModal();
    }
});

// Initialize 
console.log('🎮 Monopoly Single Page App loaded with API integration!');

// Test API connection 
async function testAPIConnection() {
    try {
      const response = await fetch('http://localhost:3000/api/health');
        const data = await response.json();
        console.log('✅ API Connection:', data.message);
    } catch (error) {
        console.error('❌ API Connection Failed:', error);
    }
}



// Initialize player positions
function initializePlayerPositions() {
    if (!gameState || !gameState.players) return;
    
   
    document.querySelectorAll('.player-avatars').forEach(container => {
        container.remove();
    });
    

    const playersByPosition = {};
    gameState.players.forEach(player => {
        const pos = player.position;
        if (!playersByPosition[pos]) {
            playersByPosition[pos] = [];
        }
        playersByPosition[pos].push(player);
    });
    
    // Add avatars on position
    Object.keys(playersByPosition).forEach(position => {
        const players = playersByPosition[position];
        const propertyElement = document.querySelector(`.pos-${position}`);
        
        if (propertyElement) {
            const avatarsContainer = document.createElement('div');
            avatarsContainer.className = 'player-avatars';
            
            players.forEach(player => {
                const avatarElement = document.createElement('div');
                avatarElement.className = 'player-avatar-token';
                avatarElement.innerHTML = getAvatarEmoji(player.avatar);
                avatarElement.title = `${player.name} (Player ${player.order_id})`;
                avatarsContainer.appendChild(avatarElement);
            });
            
            propertyElement.appendChild(avatarsContainer);
        }
    });
}

// player movement
async function animatePlayerMovement(playerId, fromPosition, toPosition, passedGo = false) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;
    
    const totalSteps = toPosition >= fromPosition ? 
        toPosition - fromPosition : 
        (40 - fromPosition) + toPosition;
    
    let currentPos = fromPosition;
    const stepDelay = 150;
    

    for (let step = 0; step < totalSteps; step++) {
        await new Promise(resolve => setTimeout(resolve, stepDelay));
        
        // Calculate
        currentPos = (currentPos + 1) % 40;
        
        // Update player's  position
        updateSinglePlayerPosition(player, currentPos);
        
        // Highlight GO if passed
        if (currentPos === 0 && passedGo) {
            const goSquare = document.querySelector('.pos-0');
            goSquare.style.backgroundColor = '#27ae60';
            setTimeout(() => {
                goSquare.style.backgroundColor = '';
            }, 500);
        }
    }
    
 
    setTimeout(() => {
        initializePlayerPositions();
    }, 100);
}


function updateSinglePlayerPosition(player, position) {
  
    document.querySelectorAll('.player-avatar-token').forEach(token => {
        if (token.title.includes(player.name)) {
            token.remove();
        }
    });
    

    const propertyElement = document.querySelector(`.pos-${position}`);
    if (propertyElement) {
        let avatarsContainer = propertyElement.querySelector('.player-avatars');
        if (!avatarsContainer) {
            avatarsContainer = document.createElement('div');
            avatarsContainer.className = 'player-avatars';
            propertyElement.appendChild(avatarsContainer);
        }
        
        const avatarElement = document.createElement('div');
        avatarElement.className = 'player-avatar-token';
        avatarElement.innerHTML = getAvatarEmoji(player.avatar);
        avatarElement.title = `${player.name} (Player ${player.order_id})`;
        avatarsContainer.appendChild(avatarElement);
    }
}




//property modal
function showPropertyModal(propertyData) {
    const modal = document.getElementById('propertyModal');
    const title = document.getElementById('propertyModalTitle');
    const info = document.getElementById('propertyModalInfo');
    const buyBtn = document.getElementById('buyPropertyBtn');
    
    title.textContent = propertyData.name;
    
    let infoHTML = `
        <div class="property-info"><strong>Price:</strong> $${propertyData.price}</div>
        <div class="property-info"><strong>Type:</strong> ${propertyData.type}</div>
    `;
    
    if (propertyData.base_rent) {
        infoHTML += `<div class="property-info"><strong>Rent:</strong> $${propertyData.base_rent}</div>`;
    }
    
    if (propertyData.house_price) {
        infoHTML += `<div class="property-info"><strong>House Cost:</strong> $${propertyData.house_price}</div>`;
    }
    
    info.innerHTML = infoHTML;
    
    //  if player can afford the property
    const currentPlayer = gameState.players.find(p => p.id === gameState.current_player_id);
    const canAfford = currentPlayer && currentPlayer.money >= propertyData.price;
    
    buyBtn.disabled = !canAfford || propertyData.owned;
    
    if (propertyData.owned) {
        buyBtn.textContent = `Owned by ${propertyData.owner.name}`;
    } else if (!canAfford) {
        buyBtn.textContent = 'Cannot Afford';
    } else {
        buyBtn.textContent = `Buy for $${propertyData.price}`;
    }
    
    modal.style.display = 'block';
}


function closePropertyModal() {
    document.getElementById('propertyModal').style.display = 'none';
}

// Buy property 
async function buyProperty() {
    if (!currentGameId || !gameState) return;
    
    try {
        const propertyPosition = document.getElementById('propertyModalTitle').dataset.position;
        
        const response = await apiCall(`/games/${currentGameId}/buy-property`, {
            method: 'POST',
            body: JSON.stringify({ propertyId: parseInt(propertyPosition) })
        });
        
        gameState = response.data.gameState;
        
 
        showCurrentPlayerOnly();
        initializePlayerPositions();
        
   
        const property = response.data.property;
        alert(`Congratulations! You bought ${property.name} for $${property.price}`);
        
        closePropertyModal();
        
    } catch (error) {
        console.error('Error buying property:', error);
        alert('Failed to buy property: ' + error.message);
    }
}


document.getElementById('buyPropertyBtn').onclick = buyProperty;
document.getElementById('closePropertyBtn').onclick = closePropertyModal;


window.onclick = function(event) {
    const rulesModal = document.getElementById('rulesModal');
    const exitModal = document.getElementById('confirmExitModal');
    const propertyModal = document.getElementById('propertyModal');
    
    if (event.target === rulesModal) {
        closeRulesModal();
    }
    if (event.target === exitModal) {
        closeConfirmExitModal();
    }
    if (event.target === propertyModal) {
        closePropertyModal();
    }
}


testAPIConnection();
