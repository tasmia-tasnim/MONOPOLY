const db = require('../config/database');
const Player = require('./Player');

class Game {
    constructor(data) {
        this.id = data.id;
        this.status = data.status || 'waiting';
        this.current_player = data.current_player;
        this.created_at = data.created_at;
    }

    // new game
    static async create() {
        try {
            const [result] = await db.execute(
                'INSERT INTO games (status) VALUES (?)',
                ['waiting']
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating game:', error);
            throw error;
        }
    }

 
    static async findById(gameId) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM games WHERE id = ?',
                [gameId]
            );
            return rows.length > 0 ? new Game(rows[0]) : null;
        } catch (error) {
            console.error('Error finding game by ID:', error);
            throw error;
        }
    }

    // Start game
    async start() {
        try {
        
            const players = await Player.findByGameId(this.id);
            if (players.length === 0) {
                throw new Error('No players in game');
            }

            const firstPlayer = players[0]; 

            await db.execute(
                'UPDATE games SET status = ?, current_player = ? WHERE id = ?',
                ['active', firstPlayer.id, this.id]
            );

            this.status = 'active';
            this.current_player = firstPlayer.id;
            
            return true;
        } catch (error) {
            console.error('Error starting game:', error);
            throw error;
        }
    }

   
    async end() {
        try {
            await db.execute(
                'UPDATE games SET status = ?, current_player = NULL WHERE id = ?',
                ['finished', this.id]
            );
            this.status = 'finished';
            this.current_player = null;
        } catch (error) {
            console.error('Error ending game:', error);
            throw error;
        }
    }

   
    async nextTurn() {
        try {
            const players = await Player.findByGameId(this.id);
            const currentPlayerIndex = players.findIndex(p => p.id === this.current_player);
            
            if (currentPlayerIndex === -1) {
                throw new Error('Current player not found');
            }

            const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
            const nextPlayer = players[nextPlayerIndex];

            await db.execute(
                'UPDATE games SET current_player = ? WHERE id = ?',
                [nextPlayer.id, this.id]
            );

            this.current_player = nextPlayer.id;
            return nextPlayer;
        } catch (error) {
            console.error('Error switching to next player:', error);
            throw error;
        }
    }


    async getCurrentPlayer() {
        try {
            if (!this.current_player) {
                return null;
            }
            return await Player.findById(this.current_player);
        } catch (error) {
            console.error('Error getting current player:', error);
            throw error;
        }
    }

 
    async getPlayers() {
        try {
            return await Player.findByGameId(this.id);
        } catch (error) {
            console.error('Error getting game players:', error);
            throw error;
        }
    }

    async getCompleteGameState() {
        try {
            const players = await this.getPlayers();
            const currentPlayer = await this.getCurrentPlayer();
            
            const playersData = await Promise.all(
                players.map(player => player.getCompleteData())
            );

            return {
                id: this.id,
                status: this.status,
                current_player_id: this.current_player,
                current_player_order: currentPlayer ? currentPlayer.order_id : null,
                current_player_name: currentPlayer ? currentPlayer.name : null,
                created_at: this.created_at,
                players: playersData
            };
        } catch (error) {
            console.error('Error getting complete game state:', error);
            throw error;
        }
    }


    async addPlayers(playersData) {
        try {
            const playerIds = [];
            
            for (let i = 0; i < playersData.length; i++) {
                const playerData = {
                    ...playersData[i],
                    game_id: this.id,
                    order_id: i + 1
                };
                
                const playerId = await Player.create(playerData);
                playerIds.push(playerId);
            }
            
            return playerIds;
        } catch (error) {
            console.error('Error adding players to game:', error);
            throw error;
        }
    }

  
    async isFull() {
        try {
            const players = await this.getPlayers();
            return players.length >= 4;
        } catch (error) {
            console.error('Error checking if game is full:', error);
            throw error;
        }
    }


    async canPlayerJoin() {
        try {
            return this.status === 'waiting' && !(await this.isFull());
        } catch (error) {
            console.error('Error checking if player can join:', error);
            throw error;
        }
    }

    async removePlayer(playerId) {
        try {
            if (this.status !== 'waiting') {
                throw new Error('Cannot remove player from active game');
            }

            const player = await Player.findById(playerId);
            if (player && player.game_id === this.id) {
                await player.delete();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error removing player from game:', error);
            throw error;
        }
    }

  
    async delete() {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

         
            await connection.execute(`
                DELETE pp FROM player_properties pp
                JOIN players p ON pp.player_id = p.id
                WHERE p.game_id = ?
            `, [this.id]);

          
            await connection.execute('DELETE FROM players WHERE game_id = ?', [this.id]);

          
            await connection.execute('DELETE FROM games WHERE id = ?', [this.id]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Error deleting game:', error);
            throw error;
        } finally {
            connection.release();
        }
    }


    async getStatistics() {
        try {
            const players = await this.getPlayers();
            const playersData = await Promise.all(
                players.map(player => player.getCompleteData())
            );

        
            const totalMoney = playersData.reduce((sum, player) => sum + player.money, 0);
            const totalProperties = playersData.reduce((sum, player) => sum + player.properties.length, 0);
            
            const richestPlayer = playersData.reduce((richest, player) => 
                player.money > richest.money ? player : richest
            );

            const mostProperties = playersData.reduce((most, player) => 
                player.properties.length > most.properties.length ? player : most
            );

            return {
                total_players: players.length,
                total_money_in_game: totalMoney,
                total_properties_owned: totalProperties,
                richest_player: {
                    name: richestPlayer.name,
                    money: richestPlayer.money
                },
                most_properties: {
                    name: mostProperties.name,
                    count: mostProperties.properties.length
                }
            };
        } catch (error) {
            console.error('Error getting game statistics:', error);
            throw error;
        }
    }
}

module.exports = Game;
