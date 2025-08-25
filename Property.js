const db = require('../config/database');

class Property {
    constructor(data) {
        this.position = data.position;
        this.name = data.name;
        this.type = data.type;
        this.color = data.color;
        this.price = data.price;
        this.base_rent = data.base_rent;
        this.house_rent1 = data.house_rent1;
        this.house_rent2 = data.house_rent2;
        this.house_rent3 = data.house_rent3;
        this.house_rent4 = data.house_rent4;
        this.hotel_rent = data.hotel_rent;
        this.house_price = data.house_price;
        this.hotel_price = data.hotel_price;
    }

    //property by position (0-39)
    static async findByPosition(position) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM properties WHERE position = ?',
                [position]
            );
            return rows.length > 0 ? new Property(rows[0]) : null;
        } catch (error) {
            console.error('Error finding property by position:', error);
            throw error;
        }
    }

  
    static async findAll() {
        try {
            const [rows] = await db.execute('SELECT * FROM properties ORDER BY position');
            return rows.map(row => new Property(row));
        } catch (error) {
            console.error('Error finding all properties:', error);
            throw error;
        }
    }

 
    static async findByType(type) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM properties WHERE type = ? ORDER BY position',
                [type]
            );
            return rows.map(row => new Property(row));
        } catch (error) {
            console.error('Error finding properties by type:', error);
            throw error;
        }
    }


    static async findByColor(color) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM properties WHERE color = ? ORDER BY position',
                [color]
            );
            return rows.map(row => new Property(row));
        } catch (error) {
            console.error('Error finding properties by color:', error);
            throw error;
        }
    }

   
    async isOwned() {
        try {
            const [rows] = await db.execute(
                'SELECT id FROM player_properties WHERE property_id = ?',
                [this.position]
            );
            return rows.length > 0;
        } catch (error) {
            console.error('Error checking if property is owned:', error);
            throw error;
        }
    }

  
    async getOwner() {
        try {
            const [rows] = await db.execute(`
                SELECT p.*, pp.houses, pp.hotels, pp.is_mortgaged
                FROM players p
                JOIN player_properties pp ON p.id = pp.player_id
                WHERE pp.property_id = ?
            `, [this.position]);
            
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error getting property owner:', error);
            throw error;
        }
    }


    async calculateRent() {
        try {
            if (this.type === 'special' || this.type === 'tax' || this.type === 'chance' || this.type === 'community_chest') {
                return 0;
            }

            const owner = await this.getOwner();
            if (!owner) return 0;

     
            if (owner.is_mortgaged) return 0;

        
            if (this.type === 'railroad') {
                const [railroadCount] = await db.execute(`
                    SELECT COUNT(*) as count
                    FROM player_properties pp
                    JOIN properties p ON pp.property_id = p.position
                    WHERE pp.player_id = ? AND p.type = 'railroad' AND pp.is_mortgaged = false
                `, [owner.id]);
                
                const count = railroadCount[0].count;
                return this.base_rent * Math.pow(2, count - 1);
            }

          
            if (this.type === 'utility') {
                const [utilityCount] = await db.execute(`
                    SELECT COUNT(*) as count
                    FROM player_properties pp
                    JOIN properties p ON pp.property_id = p.position
                    WHERE pp.player_id = ? AND p.type = 'utility' AND pp.is_mortgaged = false
                `, [owner.id]);
                
                const count = utilityCount[0].count;
               
                return count === 1 ? 4 : 10;
            }

        
            if (owner.hotels > 0) {
                return this.hotel_rent;
            }

            if (owner.houses > 0) {
                const rentLevels = [
                    this.base_rent,
                    this.house_rent1,
                    this.house_rent2,
                    this.house_rent3,
                    this.house_rent4
                ];
                return rentLevels[owner.houses] || this.base_rent;
            }

            
            const Player = require('./Player');
            const ownerPlayer = await Player.findById(owner.id);
            const hasMonopoly = await ownerPlayer.ownsCompleteColorGroup(this.color);
            
            return hasMonopoly ? this.base_rent * 2 : this.base_rent;

        } catch (error) {
            console.error('Error calculating rent:', error);
            throw error;
        }
    }


    async calculateUtilityRent(diceRoll) {
        try {
            const multiplier = await this.calculateRent();
            return multiplier * diceRoll;
        } catch (error) {
            console.error('Error calculating utility rent:', error);
            throw error;
        }
    }

   
    async canBuildHouses() {
        try {
            if (this.type !== 'property') return false;

            const owner = await this.getOwner();
            if (!owner) return false;

           
            const Player = require('./Player');
            const ownerPlayer = await Player.findById(owner.id);
            const hasMonopoly = await ownerPlayer.ownsCompleteColorGroup(this.color);
            
            if (!hasMonopoly) return false;

            
            const colorGroupProperties = await Property.findByColor(this.color);
            const houseCountsPromises = colorGroupProperties.map(async (prop) => {
                const propOwner = await prop.getOwner();
                return propOwner ? propOwner.houses : 0;
            });
            
            const houseCounts = await Promise.all(houseCountsPromises);
            const maxHouses = Math.max(...houseCounts);
            const currentHouses = owner.houses || 0;

          
            return currentHouses < 4 && currentHouses <= maxHouses;

        } catch (error) {
            console.error('Error checking if can build houses:', error);
            throw error;
        }
    }


    async buildHouse() {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const owner = await this.getOwner();
            if (!owner) {
                throw new Error('Property not owned');
            }

            const canBuild = await this.canBuildHouses();
            if (!canBuild) {
                throw new Error('Cannot build houses on this property');
            }

            const Player = require('./Player');
            const ownerPlayer = await Player.findById(owner.id);
            
            if (ownerPlayer.money < this.house_price) {
                throw new Error('Insufficient funds to build house');
            }

        
            await connection.execute(
                'UPDATE players SET money = money - ? WHERE id = ?',
                [this.house_price, owner.id]
            );

       
            await connection.execute(
                'UPDATE player_properties SET houses = houses + 1 WHERE player_id = ? AND property_id = ?',
                [owner.id, this.position]
            );

            await connection.commit();
            return true;

        } catch (error) {
            await connection.rollback();
            console.error('Error building house:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

 
    async buildHotel() {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const owner = await this.getOwner();
            if (!owner || owner.houses !== 4) {
                throw new Error('Need 4 houses to build hotel');
            }

            const Player = require('./Player');
            const ownerPlayer = await Player.findById(owner.id);
            
            if (ownerPlayer.money < this.hotel_price) {
                throw new Error('Insufficient funds to build hotel');
            }

            await connection.execute(
                'UPDATE players SET money = money - ? WHERE id = ?',
                [this.hotel_price, owner.id]
            );

 
            await connection.execute(
                'UPDATE player_properties SET houses = 0, hotels = 1 WHERE player_id = ? AND property_id = ?',
                [owner.id, this.position]
            );

            await connection.commit();
            return true;

        } catch (error) {
            await connection.rollback();
            console.error('Error building hotel:', error);
            throw error;
        } finally {
            connection.release();
        }
    }


    async mortgage() {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const owner = await this.getOwner();
            if (!owner) {
                throw new Error('Property not owned');
            }

            if (owner.is_mortgaged) {
                throw new Error('Property already mortgaged');
            }

            if (owner.houses > 0 || owner.hotels > 0) {
                throw new Error('Cannot mortgage property with buildings');
            }

            const mortgageValue = Math.floor(this.price / 2);

         
            await connection.execute(
                'UPDATE players SET money = money + ? WHERE id = ?',
                [mortgageValue, owner.id]
            );

      
            await connection.execute(
                'UPDATE player_properties SET is_mortgaged = true WHERE player_id = ? AND property_id = ?',
                [owner.id, this.position]
            );

            await connection.commit();
            return mortgageValue;

        } catch (error) {
            await connection.rollback();
            console.error('Error mortgaging property:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    async unmortgage() {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const owner = await this.getOwner();
            if (!owner) {
                throw new Error('Property not owned');
            }

            if (!owner.is_mortgaged) {
                throw new Error('Property not mortgaged');
            }

            const unmortgageCost = Math.floor(this.price / 2 * 1.1); 

            const Player = require('./Player');
            const ownerPlayer = await Player.findById(owner.id);
            
            if (ownerPlayer.money < unmortgageCost) {
                throw new Error('Insufficient funds to unmortgage property');
            }

     
            await connection.execute(
                'UPDATE players SET money = money - ? WHERE id = ?',
                [unmortgageCost, owner.id]
            );

      
            await connection.execute(
                'UPDATE player_properties SET is_mortgaged = false WHERE player_id = ? AND property_id = ?',
                [owner.id, this.position]
            );

            await connection.commit();
            return unmortgageCost;

        } catch (error) {
            await connection.rollback();
            console.error('Error unmortgaging property:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

   
    async getPropertyWithOwnership() {
        try {
            const owner = await this.getOwner();
            return {
                position: this.position,
                name: this.name,
                type: this.type,
                color: this.color,
                price: this.price,
                base_rent: this.base_rent,
                house_price: this.house_price,
                hotel_price: this.hotel_price,
                owned: !!owner,
                owner: owner ? {
                    id: owner.id,
                    name: owner.name,
                    houses: owner.houses || 0,
                    hotels: owner.hotels || 0,
                    is_mortgaged: owner.is_mortgaged || false
                } : null,
                current_rent: await this.calculateRent()
            };
        } catch (error) {
            console.error('Error getting property with ownership:', error);
            throw error;
        }
    }
}

module.exports = Property;
