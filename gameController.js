const Game = require('../models/Game');
const Player = require('../models/Player');
const Property = require('../models/Property');
const Card = require('../models/Card');
const db = require('../config/database');

class GameController {

    static async createGame(req, res) {
        try {
            const { players } = req.body;

            if (!players || !Array.isArray(players) || players.length < 2 || players.length > 4) {
                return res.status(400).json({
                    success: false,
                    message: 'Game must have 2-4 players'
                });
            }

            for (let player of players) {
                if (!player.name || !player.avatar) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each player must have a name and avatar'
                    });
                }
            }

            // Create game
            const gameId = await Game.create();
            const game = await Game.findById(gameId);

            await game.addPlayers(players);
            await game.start();

            const gameState = await game.getCompleteGameState();

            res.status(201).json({
                success: true,
                message: 'Game created successfully',
                data: gameState
            });

        } catch (error) {
            console.error('Error creating game:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create game',
                error: error.message
            });
        }

        
        const [existingGames] = await db.execute('SELECT id FROM games');
        for (const game of existingGames) {
            const gameInstance = await Game.findById(game.id);
            if (gameInstance) {
                
            }
        }
    }

    static async getGameState(req, res) {
        try {
            const { gameId } = req.params;
            
            const game = await Game.findById(gameId);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: 'Game not found'
                });
            }

            const gameState = await game.getCompleteGameState();
            
            res.json({
                success: true,
                data: gameState
            });

        } catch (error) {
            console.error('Error getting game state:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get game state',
                error: error.message
            });
        }
    }

    static async rollDice(req, res) {
        try {
            const { gameId } = req.params;
            
            const game = await Game.findById(gameId);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: 'Game not found'
                });
            }

            if (game.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: 'Game is not active'
                });
            }

            const currentPlayer = await game.getCurrentPlayer();
            if (!currentPlayer) {
                return res.status(400).json({
                    success: false,
                    message: 'No current player found'
                });
            }

            const dice1 = Math.floor(Math.random() * 6) + 1;
            const dice2 = Math.floor(Math.random() * 6) + 1;
            const total = dice1 + dice2;
            const isDoubles = dice1 === dice2;

            console.log(`DEBUG: ${currentPlayer.name} rolling - Position: ${currentPlayer.position}, Money: $${currentPlayer.money}`);

            let newPosition = (currentPlayer.position + total) % 40;
            let passedGo = false;

            // Check if passed GO
            if ((currentPlayer.position + total) >= 40) {
                passedGo = true;
                console.log(`DEBUG: ${currentPlayer.name} passing GO - Money before: $${currentPlayer.money}`);
                await currentPlayer.addMoney(200);
                await currentPlayer.refresh();
                console.log(`DEBUG: ${currentPlayer.name} after passing GO - Money after: $${currentPlayer.money}`);
            }

            // Update player position
            await currentPlayer.updatePosition(newPosition);

            // Get property at new position
            const property = await Property.findByPosition(newPosition);
            const propertyWithOwnership = property ? await property.getPropertyWithOwnership() : null;

            console.log(`DEBUG: ${currentPlayer.name} landed on position ${newPosition}: ${property ? property.name : 'No property'}`);

            let rentPaid = 0;

            //  rent payment for owned properties
            if (property && propertyWithOwnership.owned && propertyWithOwnership.owner.id !== currentPlayer.id) {
                console.log(`DEBUG RENT: ${currentPlayer.name} landed on ${property.name} owned by ${propertyWithOwnership.owner.name}`);
                console.log(`DEBUG RENT: Property type: ${property.type}`);
                console.log(`DEBUG RENT: ${currentPlayer.name} money BEFORE rent payment: $${currentPlayer.money}`);
                
                try {
                    let rentAmount = 0;

                    if (property.type === 'utility') {
                        rentAmount = await property.calculateUtilityRent(total);
                        console.log(`DEBUG RENT: Utility rent calculated: $${rentAmount} (dice total: ${total})`);
                    } else {
                        rentAmount = await property.calculateRent();
                        console.log(`DEBUG RENT: Property rent calculated: $${rentAmount}`);
                    }

                    if (rentAmount > 0 && !propertyWithOwnership.owner.is_mortgaged) {
                        rentPaid = rentAmount;
                        
                        // Deduct money from current player
                        console.log(`DEBUG RENT: Deducting $${rentPaid} from ${currentPlayer.name}`);
                        await currentPlayer.subtractMoney(rentPaid);
                        await currentPlayer.refresh();
                        
                        // Add money to owner
                        const ownerPlayer = await Player.findById(propertyWithOwnership.owner.id);
                        console.log(`DEBUG RENT: Owner ${ownerPlayer.name} money BEFORE receiving rent: $${ownerPlayer.money}`);
                        await ownerPlayer.addMoney(rentPaid);
                        await ownerPlayer.refresh();
                        console.log(`DEBUG RENT: Owner ${ownerPlayer.name} money AFTER receiving rent: $${ownerPlayer.money}`);
                        
                        console.log(`DEBUG RENT: ${currentPlayer.name} paid rent - Amount: $${rentPaid}`);
                    } else if (propertyWithOwnership.owner.is_mortgaged) {
                        console.log(`DEBUG RENT: Property is mortgaged - no rent collected`);
                    } else {
                        console.log(`DEBUG RENT: Rent amount is 0 - no payment required`);
                    }
                    
                } catch (rentError) {
                    console.error('Error calculating/paying rent:', rentError);
                }
                
                await currentPlayer.refresh();
                console.log(`DEBUG RENT: ${currentPlayer.name} money AFTER paying rent: $${currentPlayer.money}`);
            }

            

            // Check if landed on Chance or Community Chest
            let requiresCard = false;
            let cardType = null;
            
            if (property && property.type === 'chance') {
                requiresCard = true;
                cardType = 'chance';
            } else if (property && property.type === 'community_chest') {
                requiresCard = true;
                cardType = 'community_chest';
            }

            //tax properties
            if (property && property.type === 'tax') {
                let taxAmount = 0;
                if (property.name.includes('Income Tax')) {
                    taxAmount = 200;
                } else if (property.name.includes('Luxury Tax')) {
                    taxAmount = 100;
                }
                
                if (taxAmount > 0) {
                    console.log(`DEBUG: ${currentPlayer.name} paying tax - Money before: $${currentPlayer.money}`);
                    await currentPlayer.subtractMoney(taxAmount);
                    await currentPlayer.refresh();
                    console.log(`DEBUG: ${currentPlayer.name} after tax - Money after: $${currentPlayer.money}, Tax paid: $${taxAmount}`);
                }
            }

            
            // Build response message
            let statusText = `${currentPlayer.name} rolled ${dice1} + ${dice2} = ${total}!`;
            if (passedGo) {
                statusText += ` Passed GO and collected $200!`;
            }

            if (rentPaid > 0) {
                let rentMessage = `${currentPlayer.name} paid $${rentPaid} rent to ${propertyWithOwnership.owner.name}`;
                
                if (property.type === 'utility') {
                    const multiplier = Math.floor(rentPaid / total);
                    rentMessage = `${currentPlayer.name} paid $${rentPaid} utility rent (${multiplier} × ${total}) to ${propertyWithOwnership.owner.name}`;
                }
                
                statusText += ` - ${rentMessage}`;
            }
             
            const bankruptcyResult = await game.checkForBankruptcy();
            res.json({
                success: true,
                message: 'Dice rolled successfully',
                data: {
                    dice: { dice1, dice2, total, isDoubles },
                    player: {
                        id: currentPlayer.id,
                        name: currentPlayer.name,
                        oldPosition: currentPlayer.position,
                        newPosition: newPosition,
                        money: currentPlayer.money,
                        passedGo
                    },
                    property: propertyWithOwnership,
                    rentPaid: rentPaid,
                    requiresCard,
                    cardType,
                    bankruptcy: bankruptcyResult,
                    gameState: await game.getCompleteGameState()
                }
            });

        } catch (error) {
            console.error('Error rolling dice:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to roll dice',
                error: error.message
            });
        }
    }

    static async endTurn(req, res) {
        try {
            const { gameId } = req.params;
            
            const game = await Game.findById(gameId);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: 'Game not found'
                });
            }

            if (game.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: 'Game is not active'
                });
            }

            const nextPlayer = await game.nextTurn();
            const gameState = await game.getCompleteGameState();

            res.json({
                success: true,
                message: 'Turn ended successfully',
                data: {
                    nextPlayer: {
                        id: nextPlayer.id,
                        name: nextPlayer.name,
                        order_id: nextPlayer.order_id
                    },
                    gameState
                }
            });

        } catch (error) {
            console.error('Error ending turn:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to end turn',
                error: error.message
            });
        }
    }

    static async buyProperty(req, res) {
        try {
            const { gameId } = req.params;
            const { propertyId } = req.body;
            
            const game = await Game.findById(gameId);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: 'Game not found'
                });
            }

            const currentPlayer = await game.getCurrentPlayer();
            if (!currentPlayer) {
                return res.status(400).json({
                    success: false,
                    message: 'No current player found'
                });
            }

            const property = await Property.findByPosition(propertyId);
            if (!property) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found'
                });
            }

            if (property.type !== 'property' && property.type !== 'railroad' && property.type !== 'utility') {
                return res.status(400).json({
                    success: false,
                    message: 'This property cannot be purchased'
                });
            }

            if (await property.isOwned()) {
                return res.status(400).json({
                    success: false,
                    message: 'Property is already owned'
                });
            }

            await currentPlayer.buyProperty(propertyId, property.price);

            const gameState = await game.getCompleteGameState();
            
            res.json({
                success: true,
                message: 'Property purchased successfully',
                data: {
                    property: {
                        id: propertyId,
                        name: property.name,
                        price: property.price
                    },
                    player: {
                        id: currentPlayer.id,
                        name: currentPlayer.name,
                        money: currentPlayer.money - property.price
                    },
                    gameState
                }
            });

        } catch (error) {
            console.error('Error buying property:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to buy property',
                error: error.message
            });
        }
    }

    static async getProperty(req, res) {
        try {
            const { propertyId } = req.params;
            
            const property = await Property.findByPosition(propertyId);
            if (!property) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found'
                });
            }

            const propertyWithOwnership = await property.getPropertyWithOwnership();
            
            res.json({
                success: true,
                data: propertyWithOwnership
            });

        } catch (error) {
            console.error('Error getting property:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get property',
                error: error.message
            });
        }
    }

    static async mortgageProperty(req, res) {
        try {
            const { gameId } = req.params;
            const { propertyId } = req.body;
            
            const game = await Game.findById(gameId);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: 'Game not found'
                });
            }

            const property = await Property.findByPosition(propertyId);
            if (!property) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found'
                });
            }

            const mortgageValue = await property.mortgage();
            const gameState = await game.getCompleteGameState();

            res.json({
                success: true,
                message: 'Property mortgaged successfully',
                data: {
                    propertyId,
                    mortgageValue,
                    gameState
                }
            });

        } catch (error) {
            console.error('Error mortgaging property:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mortgage property',
                error: error.message
            });
        }
    }

    static async buildHouse(req, res) {
        try {
            const { gameId } = req.params;
            const { propertyId } = req.body;
            
            const game = await Game.findById(gameId);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: 'Game not found'
                });
            }

            const property = await Property.findByPosition(propertyId);
            if (!property) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found'
                });
            }

            await property.buildHouse();
            const gameState = await game.getCompleteGameState();

            res.json({
                success: true,
                message: 'House built successfully',
                data: {
                    propertyId,
                    houseCost: property.house_price,
                    gameState
                }
            });

        } catch (error) {
            console.error('Error building house:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to build house',
                error: error.message
            });
        }
    }

    static async deleteGame(req, res) {
        try {
            const { gameId } = req.params;
            
            const game = await Game.findById(gameId);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: 'Game not found'
                });
            }

            await game.delete();

            res.json({
                success: true,
                message: 'Game deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting game:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete game',
                error: error.message
            });
        }
    }

    static async getGameStatistics(req, res) {
        try {
            const { gameId } = req.params;
            
            const game = await Game.findById(gameId);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: 'Game not found'
                });
            }

            const statistics = await game.getStatistics();

            res.json({
                success: true,
                data: statistics
            });

        } catch (error) {
            console.error('Error getting game statistics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get game statistics',
                error: error.message
            });
        }
    }

    static async drawCard(req, res) {
        try {
            const { gameId } = req.params;
            const { cardType } = req.body; 
            
            const game = await Game.findById(gameId);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: 'Game not found'
                });
            }

            if (game.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: 'Game is not active'
                });
            }

            const currentPlayer = await game.getCurrentPlayer();
            if (!currentPlayer) {
                return res.status(400).json({
                    success: false,
                    message: 'No current player found'
                });
            }

            // Validate card type
            if (!cardType || (cardType !== 'chance' && cardType !== 'community_chest')) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid card type'
                });
            }

            // Get random card
            const card = await Card.getRandomCard(cardType);
            if (!card) {
                return res.status(404).json({
                    success: false,
                    message: 'No cards found for this type'
                });
            }

            // Execute card action
            const actionResult = await card.executeAction(currentPlayer.id, gameId);
            
            // Get updated game state
            const gameState = await game.getCompleteGameState();

            res.json({
                success: true,
                message: 'Card drawn successfully',
                data: {
                    card: {
                        title: card.title,
                        description: card.description,
                        type: card.type
                    },
                    actionResult,
                    player: {
                        id: currentPlayer.id,
                        name: currentPlayer.name,
                        oldPosition: actionResult.newPosition !== currentPlayer.position ? currentPlayer.position : null,
                        newPosition: actionResult.newPosition,
                        money: currentPlayer.money + actionResult.moneyChange,
                        moneyChange: actionResult.moneyChange,
                        passedGo: actionResult.passedGo
                    },
                    gameState
                }
            });

        } catch (error) {
            console.error('Error drawing card:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to draw card',
                error: error.message
            });
        }
    }

    

static async checkBankruptcy(req, res) {
    try {
        const { gameId } = req.params;
        
        const game = await Game.findById(gameId);
        if (!game) {
            return res.status(404).json({
                success: false,
                message: 'Game not found'
            });
        }

        if (game.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Game is not active'
            });
        }

        const bankruptcyResult = await game.checkForBankruptcy();
        const gameState = await game.getCompleteGameState();

        res.json({
            success: true,
            message: 'Bankruptcy check completed',
            data: {
                ...bankruptcyResult,
                gameState
            }
        });

    } catch (error) {
        console.error('Error checking bankruptcy:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check bankruptcy',
            error: error.message
        });
    }
}




}

module.exports = GameController;
