const express = require('express');
const router = express.Router();
const GameController = require('../controllers/GameController');

// Game management 
router.post('/create', GameController.createGame);
router.get('/:gameId', GameController.getGameState);
router.delete('/:gameId', GameController.deleteGame);
router.get('/:gameId/statistics', GameController.getGameStatistics);

// Game actions
router.post('/:gameId/roll-dice', GameController.rollDice);
router.post('/:gameId/end-turn', GameController.endTurn);
router.post('/:gameId/buy-property', GameController.buyProperty);
router.post('/:gameId/mortgage-property', GameController.mortgageProperty);
router.post('/:gameId/build-house', GameController.buildHouse);

// Property 
router.get('/property/:propertyId', GameController.getProperty);

// Card actions
router.post('/:gameId/draw-card', GameController.drawCard);


router.post('/:gameId/check-bankruptcy', GameController.checkBankruptcy);


module.exports = router;
