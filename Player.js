const db = require('../config/database');

class Player {
    constructor(data) {
        this.id = data.id;
        this.game_id = data.game_id;
        this.order_id = data.order_id;
        this.name = data.name;
        this.avatar = data.avatar;
        this.money = data.money || 1500;
        this.position = data.position || 0;
        this.jail = data.jail || false;
        this.pass_go = data.pass_go || false;
        this.hotel_pass = data.hotel_pass || false;
        this.first_turn = data.first_turn || true;
    }

   //create player in db
   static async create(playerData) {
    try {
        const [result] = await db.execute(
            `INSERT INTO players (game_id, order_id, name, avatar, money, position, jail, pass_go, hotel_pass) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                playerData.game_id,
                playerData.order_id,
                playerData.name,
                playerData.avatar,
                playerData.money || 1500,
                playerData.position || 0,
                playerData.jail || false,
                playerData.pass_go || false,
                playerData.hotel_pass || false
            ]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error creating player:', error);
        throw error;
    }
}
    async setFirstTurnComplete() {
    try {
        await db.execute(
            'UPDATE players SET first_turn = 0 WHERE id = ?',
            [this.id]
        );
        this.first_turn = false;
    } catch (error) {
        console.error('Error setting first turn complete:', error);
        throw error;
    }
}

    // Get player by ID
    static async findById(playerId) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM players WHERE id = ?',
                [playerId]
            );
            return rows.length > 0 ? new Player(rows[0]) : null;
        } catch (error) {
            console.error('Error finding player by ID:', error);
            throw error;
        }
    }

   
    static async findByGameId(gameId) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM players WHERE game_id = ? ORDER BY order_id',
                [gameId]
            );
            return rows.map(row => new Player(row));
        } catch (error) {
            console.error('Error finding players by game ID:', error);
            throw error;
        }
    }

    // Update player position
    async updatePosition(newPosition) {
        try {
            await db.execute(
                'UPDATE players SET position = ? WHERE id = ?',
                [newPosition, this.id]
            );
            this.position = newPosition;
        } catch (error) {
            console.error('Error updating player position:', error);
            throw error;
        }
    }

    // Update player money
    async updateMoney(newMoney) {
        try {
            await db.execute(
                'UPDATE players SET money = ? WHERE id = ?',
                [newMoney, this.id]
            );
            this.money = newMoney;
        } catch (error) {
            console.error('Error updating player money:', error);
            throw error;
        }
    }

    // Add money 
    async addMoney(amount) {
        const newMoney = this.money + amount;
        await this.updateMoney(newMoney);
        return newMoney;
    }

    // Subtract money 
    async subtractMoney(amount) {
        const newMoney = Math.max(0, this.money - amount);
        await this.updateMoney(newMoney);
        return newMoney;
    }

    // Update jail status
    async updateJailStatus(inJail) {
        try {
            await db.execute(
                'UPDATE players SET jail = ? WHERE id = ?',
                [inJail, this.id]
            );
            this.jail = inJail;
        } catch (error) {
            console.error('Error updating jail status:', error);
            throw error;
        }
    }

 
    async getProperties() {
        try {
            const [rows] = await db.execute(`
                SELECT pp.*, p.name, p.color, p.price, p.type
                FROM player_properties pp
                JOIN properties p ON pp.property_id = p.position
                WHERE pp.player_id = ?
            `, [this.id]);
            return rows;
        } catch (error) {
            console.error('Error getting player properties:', error);
            throw error;
        }
    }

    //  mortgaged properties
    async getMortgagedProperties() {
        try {
            const [rows] = await db.execute(`
                SELECT pp.*, p.name, p.color, p.price
                FROM player_properties pp
                JOIN properties p ON pp.property_id = p.position
                WHERE pp.player_id = ? AND pp.is_mortgaged = true
            `, [this.id]);
            return rows;
        } catch (error) {
            console.error('Error getting mortgaged properties:', error);
            throw error;
        }
    }

    // Buy property
    async buyProperty(propertyId, price) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

       
            if (this.money < price) {
                throw new Error('Insufficient funds');
            }

       
            const [existing] = await connection.execute(
                'SELECT id FROM player_properties WHERE property_id = ?',
                [propertyId]
            );

            if (existing.length > 0) {
                throw new Error('Property already owned');
            }

    
            await connection.execute(
                'UPDATE players SET money = money - ? WHERE id = ?',
                [price, this.id]
            );

      
            await connection.execute(
                'INSERT INTO player_properties (player_id, property_id) VALUES (?, ?)',
                [this.id, propertyId]
            );

            await connection.commit();
            this.money -= price;
            
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Error buying property:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

   
    async getCompleteData() {
    try {
        const properties = await this.getProperties();
        const mortgagedProperties = await this.getMortgagedProperties();

        return {
            id: this.id,
            game_id: this.game_id,
            order_id: this.order_id,
            name: this.name,
            avatar: this.avatar,
            money: this.money,
            position: this.position,
            jail: this.jail,
            pass_go: this.pass_go,
            hotel_pass: this.hotel_pass,
            first_turn: this.first_turn, 
            properties: properties.map(p => ({
                id: p.property_id,
                name: p.name,
                color: p.color,
                houses: p.houses,
                hotels: p.hotels,
                is_mortgaged: p.is_mortgaged
            })),
            mortgaged_properties: mortgagedProperties.map(p => p.name)
        };
    } catch (error) {
        console.error('Error getting complete player data:', error);
        throw error;
    }
}

 
    async ownsCompleteColorGroup(color) {
        try {
       
            const [allPropsInColor] = await db.execute(
                'SELECT COUNT(*) as total FROM properties WHERE color = ?',
                [color]
            );

       
            const [playerPropsInColor] = await db.execute(`
                SELECT COUNT(*) as owned
                FROM player_properties pp
                JOIN properties p ON pp.property_id = p.position
                WHERE pp.player_id = ? AND p.color = ?
            `, [this.id, color]);

            return allPropsInColor[0].total === playerPropsInColor[0].owned;
        } catch (error) {
            console.error('Error checking color group ownership:', error);
            throw error;
        }
    }


    async delete() {
        try {
           
            await db.execute('DELETE FROM player_properties WHERE player_id = ?', [this.id]);
            
        
            await db.execute('DELETE FROM players WHERE id = ?', [this.id]);
        } catch (error) {
            console.error('Error deleting player:', error);
            throw error;
        }
    }
}

module.exports = Player;
