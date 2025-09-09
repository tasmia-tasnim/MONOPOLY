const db = require('../config/database');

class Card {
    constructor(data) {
        this.id = data.id;
        this.type = data.type;
        this.title = data.title;
        this.description = data.description;
        this.action_type = data.action_type;
        this.amount = data.amount;
        this.position = data.position;
        this.per_house_amount = data.per_house_amount;
        this.per_hotel_amount = data.per_hotel_amount;
    }

    // Get random card by type
    static async getRandomCard(type) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM cards WHERE type = ? ORDER BY RAND() LIMIT 1',
                [type]
            );
            return rows.length > 0 ? new Card(rows[0]) : null;
        } catch (error) {
            console.error('Error getting random card:', error);
            throw error;
        }
    }

    // Get all cards by type
    static async getCardsByType(type) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM cards WHERE type = ?',
                [type]
            );
            return rows.map(row => new Card(row));
        } catch (error) {
            console.error('Error getting cards by type:', error);
            throw error;
        }
    }

    // Execute card action
    async executeAction(playerId, gameId) {
        const Player = require('./Player');
        const Game = require('./Game');
        
        try {
            const player = await Player.findById(playerId);
            const game = await Game.findById(gameId);
            
            if (!player || !game) {
                throw new Error('Player or game not found');
            }

            let result = {
                success: true,
                message: '',
                moneyChange: 0,
                newPosition: player.position,
                passedGo: false
            };

            switch (this.action_type) {
                case 'collect_money':
                    await player.addMoney(this.amount);
                    result.moneyChange = this.amount;
                    result.message = `${player.name} collected $${this.amount}`;
                    break;

                case 'pay_money':
                    const newMoney = await player.subtractMoney(this.amount);
                    result.moneyChange = -this.amount;
                    result.message = `${player.name} paid $${this.amount}`;
                    
                    // Check if player went bankrupt
                    if (newMoney === 0 && player.money >= this.amount) {
                        result.message += ' (Player is bankrupt!)';
                    }
                    break;

                case 'move_to_position':
                    const oldPosition = player.position;
                    let passedGo = false;
                    
                    // Check if passed GO 
                    if (this.position !== 10 && this.position < oldPosition) {
                        passedGo = true;
                        await player.addMoney(200);
                        result.moneyChange = 200;
                    }
                    
                    await player.updatePosition(this.position);
                    result.newPosition = this.position;
                    result.passedGo = passedGo;
                    
                    if (this.position === 10) {
                        await player.updateJailStatus(true);
                        result.message = `${player.name} went to jail!`;
                    } else {
                        result.message = `${player.name} moved to position ${this.position}`;
                        if (passedGo) result.message += ' and collected $200 for passing GO';
                    }
                    break;

                case 'collect_from_players':
                    const allPlayers = await game.getPlayers();
                    let totalCollected = 0;
                    
                    for (const otherPlayer of allPlayers) {
                        if (otherPlayer.id !== playerId) {
                            await otherPlayer.subtractMoney(this.amount);
                            totalCollected += this.amount;
                        }
                    }
                    
                    await player.addMoney(totalCollected);
                    result.moneyChange = totalCollected;
                    result.message = `${player.name} collected $${totalCollected} from other players`;
                    break;

                case 'pay_per_house':
                    const playerProperties = await player.getProperties();
                    let totalHouses = 0;
                    let totalHotels = 0;
                    
                    playerProperties.forEach(prop => {
                        totalHouses += prop.houses || 0;
                        totalHotels += prop.hotels || 0;
                    });
                    
                    const totalCost = (totalHouses * this.per_house_amount) + (totalHotels * this.per_hotel_amount);
                    await player.subtractMoney(totalCost);
                    result.moneyChange = -totalCost;
                    result.message = `${player.name} paid $${totalCost} for property repairs (${totalHouses} houses, ${totalHotels} hotels)`;
                    break;

                default:
                    throw new Error(`Unknown card action type: ${this.action_type}`);
            }

            return result;

        } catch (error) {
            console.error('Error executing card action:', error);
            throw error;
        }
    }
}

module.exports = Card;
