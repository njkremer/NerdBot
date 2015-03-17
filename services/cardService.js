var rest = require('rest');
var _und = require('underscore');
var mime = require('rest/interceptor/mime');
var CardModel = require('../models/magic/cardModel.js');
var client = rest.wrap(mime);

function randomInt(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function processCard(foundCard, additionalCards, log) {

    var additionalSeachReultsToDisplay = 42;
    var numberPerGroup = 14.0;

    var additionalSearchMatches = _und.chain(additionalCards).without(foundCard).first(additionalSeachReultsToDisplay - 1).value();
    var additionalMatchNumber = (additionalCards.length - additionalSeachReultsToDisplay);
    additionalMatchNumber = additionalMatchNumber > 0 ? additionalMatchNumber : undefined;
    var exactMatch = additionalSearchMatches.length == 0;

    // break the additional editions up into smaller chunks for display purposes

    var additionalSearchMatcheGroups = undefined;
    if (!exactMatch) {
        additionalSearchMatcheGroups = [];
        var totalGroups = Math.ceil(additionalSeachReultsToDisplay / numberPerGroup);
        for (var i = 0; i < totalGroups; i++) {
            additionalSearchMatcheGroups.push(additionalSearchMatches.splice(0, numberPerGroup));
        }
        if (additionalMatchNumber) {
            _und.last(additionalSearchMatcheGroups).push({
                name: additionalMatchNumber + "more...",
                store_url: undefined
            });
        }
    }

    log.debug(foundCard);

    var cardEditions = _und.sortBy(foundCard.editions, function(edition) {
        return -edition.multiverse_id;
    });

    var mostRecentEdition = cardEditions.shift();
    var hasImage = mostRecentEdition.multiverse_id != 0;

    var additionalEditions = _und.each(cardEditions, function(edition) {
        edition.hasImage = edition.multiverse_id != 0;
        edition.image_url = 'http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=' + edition.multiverse_id + '&type=card';
    });

    return {
        hasImage: hasImage,
        exactMatch: exactMatch,
        additionalSearchMatches: additionalSearchMatcheGroups,
        additionalMatchNumber: additionalMatchNumber,
        additionalEditions: additionalEditions,
        mostRecentEdition: mostRecentEdition
    }
}

function CardService(apiUrl, log) {
    this.log = log;
    this.rest = client;
    this.apiUrl = apiUrl;
}

CardService.prototype.getCardByNameAsync = function(cardName) {
	var log = this.log;
	this.log.debug('Making request for card with name: ' + cardName);
    return this.rest(this.apiUrl + 'cards?name=' + cardName)
        .then(function(response) {
        	// Todo also bad, fix it
        	var cards = response.entity;

            // try to find exact match
            var card = _und.find(cards, function(icard) {
                return icard.name.trim().toLowerCase() == cardName.trim().toLowerCase();
            });


            if(card == undefined || card.length == 0) {
                card = cards[0];
            }

            var cardData = processCard(card, cards, log);

            return new CardModel(card.name,
                card.types,
                card.colors,
                card.text,
                cardData.mostRecentEdition['rarity'],
                cardData.mostRecentEdition['set'],
                cardData.mostRecentEdition['price']['average'],
                'http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=' + cardData.mostRecentEdition['multiverse_id'] + '&type=card',
                cardData.mostRecentEdition['store_url'],
                cardData.hasImage,
                cardData.additionalSearchMatches, 
                cardData.additionalEditions,
                cardData.additionalMatchNumber,
                cardData.exactMatch);
        });
};

CardService.prototype.getRandomCard = function(filter) {
    var log = this.log;
    this.log.debug('Making request for a random card with filter: ' + filter);
    
    var minPage = 0;
    var maxPage = 149;
    var randomPage = randomInt(minPage, maxPage);

    var query = "?page=" + randomPage;
    if (filter && filter.indexOf("=") > -1) {
        query = '?' + filter;
    }

    return this.rest(this.apiUrl + 'cards' + query)
        .then(function(response) {
            var allCards = response.entity;
            var low = 0;
            var high = allCards.length;
            var randomNumber = randomInt(low, high);
            // Todo also bad, fix it
            var card = allCards[randomNumber];

console.log("blah");

            var cardData = processCard(card, [], log);

            log.debug(card);

            return new CardModel(card.name,
                card.types,
                card.colors,
                card.text,
                cardData.mostRecentEdition['rarity'],
                cardData.mostRecentEdition['set'],
                cardData.mostRecentEdition['price']['average'],
                cardData.mostRecentEdition['image_url'],
                cardData.mostRecentEdition['store_url'],
                cardData.hasImage,
                cardData.additionalSearchMatches, 
                cardData.additionalEditions,
                cardData.additionalMatchNumber,
                cardData.exactMatch);
        });
};

module.exports = CardService;
