const Game = require('../models/Game');
const Player = require('../models/Player');
const Property = require('../models/Property');

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

            

let newPosition = (currentPlayer.position + total) % 40;


let passedGo = false;
if (!currentPlayer.first_turn && (currentPlayer.position + total) >= 40) {
    passedGo = true;
    await currentPlayer.addMoney(200);
}


if (currentPlayer.first_turn) {
    await currentPlayer.setFirstTurnComplete();
}



         
            await currentPlayer.updatePosition(newPosition);

          
            const property = await Property.findByPosition(newPosition);
            const propertyWithOwnership = property ? await property.getPropertyWithOwnership() : null;

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
}

module.exports = GameController;
