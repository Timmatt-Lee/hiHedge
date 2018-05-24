'use strict';

// Characters
const DIAO_CHAN = 0,
	TSAO_TSAO = 1,
	JUGAR_LIAN = 2,
	JOHN_FAT = 3,
	LU_BOO = 4;

var TraderCenter = {
	contract: null,
	instance: null,
	registeredTrader: {}, // {traderAddress:traderObj} all registered traders
	subscription: {}, // {traderAddress:(share,proportion)} traders whom user subscribed to
	userTrader: [], // User's all traders

	init: function() {
		// Get instance of TraderCenter.sol
		App.contracts.TraderCenter.deployed().then((instance) => {
			TraderCenter.instance = instance;
			// Init other after get instance
			TraderCenter.getRegisteredTraders();
			TraderCenter.listener();
		});
	},

	register: function() {
		var n = $('input[for="name"]', '#register').val();
		var s = $('input[for="symbol"]', '#register').val();
		var a = $('input[for="abbreviation"]', '#register').val();
		var p = $('input[for="price"]', '#register').val();
		var ts = $('input[for="totalShare"]', '#register').val();
		var i = $('input[for="seedFund"]', '#register').val();
		var f = $('input[for="fee"]', '#register').val();
		var sp = $('input[for="split"]', '#register').val();
		var d = $('textarea', '#register').val();
		var img = $('.carousel-item', '#register #characters-img').index($('.active', '#register'));
		// console.log(img);
		TraderCenter.instance.registerTrader(ts, web3.toWei(p), web3.toWei(f), web3.toWei(sp / 100), { value: web3.toWei(i) })
			.then(r => {
					$.ajax({
						url: "/register",
						data: {
							address: r.logs['0'].args.trader,
							name: n,
							description: d,
							abbr: a,
							symbol: s,
							img: img
						},
					});
					swal({
						title: '',
						text: '<img src="img/characters/' + img + '.jpg" width="100%">\
							' + (img == JUGAR_LIAN ? 'I won\'t let you regret.' :
							(img == TSAO_TSAO ? 'Victory is yours.' :
								(img == DIAO_CHAN ? 'Shall we play the game?' :
									(img == JOHN_FAT ? 'Nothing can stop me!' :
										'No time to waste!')))) + '\
							<footer class="blockquote-footer"><small><cite title="Source Title">\
							' + n + ', born in block #13</cite></small></footer>',
						confirmButtonText: img == JUGAR_LIAN ? 'Smart choice' :
							(img == TSAO_TSAO ? 'I\'ll take it' :
								(img == DIAO_CHAN ? 'Yeah' :
									(img == JOHN_FAT ? 'GO!' :
										'Come on!'))),
						html: true
					});
					// swal('Mined in block #' + r.receipt.blockNumber, n + ': "Hi, you\'ve just created me!"', 'success');
				}

			).catch(console.error);
	},

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
		$('.subscription table tbody', '#tab-traderCenter').empty();
		$.each(arr, (i, [trader, share, proportion]) => {
			var s = TraderCenter.registeredTrader[trader];
			$('.subscription table > tbody', '#tab-traderCenter').append('\
        <tr style="cursor:pointer;"\
					onclick="$(\'a[href=\\\'' + s.domID + '\\\']\').tab(\'show\')">\
          <td>' + s.name + ' ( ' + s.abbr + ' )</td>\
          <td data-toggle="tooltip" class="myNumber"\
						data-title="' + numberWithCommas(share) + ' ' + s.symbol + '\
						 ( ' + s.abbr + ' )">' + myNumber(share) + ' ' + s.symbol + '\
          </td>\
          <td>' + (proportion * 100).toFixed(1) + ' % </td>\
        </tr>\
      ');
		});
		// Subscriber list (user's trader's subscribers)
		// Sort by proportion in user's each trader
		var arr = [];
		for (var t in TraderCenter.userTrader) {
			var arr2 = [];
			for (var s in TraderCenter.userTrader[t].subscriber)
				arr2.push([t, s,
					TraderCenter.userTrader[t].subscriber[s].share,
					TraderCenter.userTrader[t].subscriber[s].proportion
				]);
			arr2.sort((a, b) => b[3] - a[3]);
			arr = arr.concat(arr2);
		}
		// Subscriber list UI
		$('.subscriber table tbody', '#tab-traderCenter').empty();
		$.each(arr, (i, [trader, subscriber, share, proportion]) => {
			var t = TraderCenter.userTrader[trader];
			$('.subscriber table > tbody', '#tab-traderCenter').append('\
        <tr style="cursor:pointer;"\
					onclick="$(\'a[href=\\\'' + t.domID + '\\\']\').tab(\'show\')">\
          <td' + (subscriber == App.account ? '>YOU' : ' data-simplebar\
						data-toggle="tooltip" class="address-copier" \
						data-clipboard-text="' + subscriber + '">' + subscriber) + '\
          </td>\
          <td data-toggle="tooltip" class="myNumber" data-title="\
						( ' + (proportion * 100).toFixed(1) + '% ) \
						' + numberWithCommas(share) + ' \
						' + t.symbol + '">' + myNumber(share) + ' ' + t.symbol + '\
          </td>\
        </tr>\
      ');
		});
		// Call global's UI update
		App.updateUI();
	},

	appendTraderCard: function(t) {
		if (!$('.traderCards', '#tab-traderCenter').hasClass('card-columns')) {
			$('.traderCards', '#tab-traderCenter').addClass('card-columns');
			$('.traderCards', '#tab-traderCenter').empty();
		}
		$('.traderCards', '#tab-traderCenter').append('\
			<div class="card" id="card-' + t.address + '" style="cursor:pointer;"\
				onclick="$(\'a[href=\\\'' + t.domID + '\\\']\').tab(\'show\')"\
				onmouseover="$(\'.collapse\',this).collapse(\'show\')"\
				onmouseleave="$(\'.collapse\',this).collapse(\'hide\')\">\
			<div class="card-img-top"\
				style="background-image: url(\'img/characters/' + t.img + '.jpg\');\
					background-size:cover;display: flex;">\
				<div style="margin-top: 190px;background-color: rgba(0,0,0,0.5);\
					color: white;" class="card-body">\
					<h1 class="card-title">' + t.name + '</h1>\
					<div class="py-2">Price: <t class="price"></t> ETH / ' + t.symbol + '</div>\
					<div class="py-2">Performance: <t class="performance"></t></div>\
					<div class="collapse"><div class="py-2">Total Share: ' + myNumber(t.totalShare) + ' ' + t.symbol + '</div></div>\
					<div class="collapse"><div class="py-2 mb-3 isSubscribed"></div></div>\
					' + (t.description ? '<div class="collapse"><blockquote class="mb-0">\
						<p style="opacity:0.5" class="mb-1">' + t.description + '</p>\
						<footer class="blockquote-footer">\
							<small>\
							<cite title="Source Title">' + t.name + '</cite>\
						</small>\
						</footer>\
					</blockquote></div>' : '') + '\
				</div>\
				</div>\
				<div class="card-footer">\
					<small class="text-muted"><t class="last-action">No action yet...</t></small>\
				</div>\
			</div>');
		t.updateUI();
	},

	getRegisteredTraders: function() {
		TraderCenter.instance.RegisteredTrader(null, { fromBlock: 0 }, (err, res) => {
			if (err) throw err;

			var t = res.args.trader;

			// Create Trader Object from trader.js
			createTrader(t).then(_t => {
				TraderCenter.registeredTrader[t] = _t;
				if (_t.registrant == App.account) {
					// When registrant is user
					TraderCenter.userTrader.push(_t);
					$('#navbarSupportedContent .dropdown:first').show();
					_t.initDOM();
				} else // When registrant is the other and user is his/her subscribers
					// Watch user having subscription to this trader
					_t.instance.Subscription({ subscriber: App.account }, { fromBlock: 0 }, (err, res) => {
						if (err) throw err;
						TraderCenter.subscription[t] = { share: 0, proportion: 0 };
						$('#navbarSupportedContent .dropdown:last').show();
						_t.initDOM();
						TraderCenter.updateUI();
					});

				TraderCenter.updateUI();
				TraderCenter.appendTraderCard(_t);
			});
		});
	},

	listener: function() {
		// Bind check validity to register trader form
		checkValidityMacro($('#register'), TraderCenter.register);
		// only detect scroll position under md
		if ($(window).width() < 768)
			$(window).scroll(() =>
				$('.black-filter').css('opacity',
					(($(window).scrollTop() + $(window).height()) - $(document).height() + $('.guide').height()) / $('.guide').height() - 0.3
				)
			);
		else
			$('.black-filter').hide();
	}
};