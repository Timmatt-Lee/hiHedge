'use strict';

var TraderCenter = {
	contract: null,
	instance: null,
	registeredTrader: {}, // {traderAddress:traderObj} all registered traders
	subscription: {}, // {traderAddress:(share,proportion)} traders whom user subscribed to
	subscriber: {}, // {traderAddress:{subscriber:(share,proportion)}} user's trader's subscribers

	init: function() {
		// Get instance of TraderCenter.sol
		App.contracts.TraderCenter.deployed().then((instance) => {
			TraderCenter.instance = instance;
			// Init other after get instance
			TraderCenter.getRegisteredTraders();
			TraderCenter.bindEvents(); // Bind UI with listener
			TraderCenter.listeners(); // Other listener
		});
	},

	bindEvents: function() {},

	listeners: function() {},

	updateUI: function() {
		// Subscription list (traders whom user subscribed to)
		// Sort by share proportion
		var arr = [];
		for (var t in TraderCenter.subscription)
			arr.push([t,
				TraderCenter.subscription[t].share,
				TraderCenter.subscription[t].proportion
			]);
		arr.sort((a, b) => b[2] - a[2]);
		// Subscription list UI
		$('.traderShare-subscription table tbody').empty();
		$.each(arr, (i, [trader, share, proportion]) => {
			var s = TraderCenter.registeredTrader[trader];
			$('.traderShare-subscription table > tbody').append('\
        <tr style="cursor:pointer;"\
					onclick="$(\'a[href=\\\'' + s.selectorID + '\\\']\').tab(\'show\')">\
          <td>' + s.name + ' ' + s.symbol + '</td>\
          <td data-toggle="tooltip" class="myNumber"\
						data-title="' + s.symbol + ' ' + numberWithCommas(share) + ' \
						' + s.abbr + '">' + myNumber(share) + ' ' + s.abbr + '\
          </td>\
          <td>' + (proportion * 100).toFixed(1) + ' % </td>\
        </tr>\
      ');
		});
		// Subscriber list (user's trader's subscribers)
		// Sort by proportion in user's each trader
		var arr = [];
		for (var t in TraderCenter.subscriber) {
			var arr2 = [];
			for (var s in TraderCenter.subscriber[t])
				// Only show subscribers except for user himself/herself
				s == App.account ? null : arr2.push([t, s,
					TraderCenter.subscriber[t][s].share,
					TraderCenter.subscriber[t][s].proportion
				]);
			arr2.sort((a, b) => b[3] - a[3]);
			arr = arr.concat(arr2);
		}
		// Subscriber list UI
		$('.traderShare-subscriber table tbody').empty();
		$.each(arr, (i, [trader, subscriber, share, proportion]) => {
			var s = TraderCenter.registeredTrader[trader];
			$('.traderShare-subscriber table > tbody').append('\
        <tr>\
          <td' + (subscriber == App.account ? '>YOU' : ' data-simplebar\
						data-toggle="tooltip" class="address-copier" \
						data-clipboard-text="' + subscriber + '">' + subscriber) + '\
          </td>\
          <td data-toggle="tooltip" class="myNumber" data-title="\
						' + s.symbol + ' ( ' + (proportion * 100).toFixed(1) + '% ) \
						' + numberWithCommas(share) + ' \
						' + s.abbr + '">' + myNumber(share) + ' ' + s.abbr + '\
          </td>\
        </tr>\
      ');
		});

		// Trader card information
		$('.traderCard').empty();
		$.each(TraderCenter.registeredTrader, (address, trader) =>
			$('.traderCard').append('\
        <div class="card">\
				<div class="card-img-top"\
					style="background-image: url(\'img/characters/' + trader.name + '.jpg\');\
						background-size:cover;display: flex;">\
					<div style="margin-top: 190px;background-color: rgba(0,0,0,0.3);\
						color: white;" class="card-body">\
						<h1 class="card-title">' + trader.name + '</h1>\
            <blockquote class="blockquote mb-0">\
              <p class="mb-1">' + trader.description + '</p>\
              <footer class="blockquote-footer">\
                <small>\
                <cite title="Source Title">' + trader.name + '</cite>\
              </small>\
              </footer>\
            </blockquote>\
          </div>\
					</div>\
          <div class="card-footer">\
            <small class="text-muted">Last Trade 1 day ago</small>\
          </div>\
        </div>\
      	')
		);
		// Call global's UI update
		App.updateUI();
	},

	getRegisteredTraders: function() {
		TraderCenter.instance.RegisteredTrader(null, { fromBlock: 0 }, (error, result) => {
			if (error) return console.error(error);

			var t = result.args.trader;

			// Create Trader Object from trader.js
			createTrader(t).then((_traderObj) => {
				TraderCenter.registeredTrader[t] = _traderObj;
				if (!$.trim($('#navbarSupportedContent .dropdown-menu:first').html()))
					$('#navbarSupportedContent .dropdown:first').hide();
				if (!$.trim($('#navbarSupportedContent .dropdown-menu:last').html()))
					$('#navbarSupportedContent .dropdown:last').hide();
				// Subscriber & subscription
				if (_traderObj.registrant == App.account) {
					// When registrant is user
					TraderCenter.subscriber[t] = _traderObj.subscriber;
					$('#navbarSupportedContent .dropdown:first').show();
					_traderObj.initDOM();
				} else if (App.account in _traderObj.subscriber) {
					// When registrant is the other and user is their subscribers
					TraderCenter.subscription[t] = _traderObj.subscriber[App.account];
					$('#navbarSupportedContent .dropdown:last').show();
					_traderObj.initDOM();
				}
				// Update trader center UI at last
				TraderCenter.updateUI();
			});
		});
	},
};