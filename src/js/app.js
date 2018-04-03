'use strict'

var App = {
	web3Provider: null,
	contracts: {}, // Store every contracts' json
	account: undefined, // User's account
	etherBalance: 0, // User's ether balance

	init: function() {
		App.initWeb3();
	},

	initWeb3: function() {
		// Initialize web3 and set the provider to the testRPC.
		if (typeof web3 !== 'undefined') {
			// MetaMisk would inject web3
			App.web3Provider = web3.currentProvider;
		} else {
			// Set the provider you want from Web3.providers
			App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
		}
		web3 = new Web3(App.web3Provider);

		// Get json of the contracts & init
		App.initContract('Token');
		App.initContract('Trader');
		App.initContract('TraderCenter').then(TraderCenter.init); // init object in TraderCenter.js
		// Global UI
		App.initUI();
		// Async
		App.startAsyncing();
	},

	initContract: function(name) {
		return $.getJSON(name + '.json').success((data) => {
			// Get the necessary contract artifact file and instantiate it with truffle-contract.
			App.contracts[name] = TruffleContract(data);
			// Set the provider for our contract.
			App.contracts[name].setProvider(web3.currentProvider);
		});
	},

	initUI: function() {
		// user's account
		App.account = web3.eth.defaultAccount;
		if (App.account === undefined) // if not login in
		{
			// Alert for log in
			swal('Who are you ?', 'Please log in to your wallet for more', 'warning')
			// Hide some cards
			$('.wallet-user, .token-userAllowance, .token-forUserAllowance, .trader-subscription, .trader-subscriber').hide();
			// Tooltip for log in
			$('.tooltip-login').tooltip({
				title: 'Please log in'
			});
			// Disable every form with above tooltip
			$('.tooltip-login *').prop('disabled', true);
		} else {
			// Activate copy function
			new ClipboardJS('.address-copier');
			// User's ether balance
			web3.eth.getBalance(web3.eth.defaultAccount, (error, result) => {
				App.etherBalance = web3.fromWei(result);
				// Update global UI
				App.updateUI();
			});
		}
	},

	updateUI: function() {
		// User's account UI
		$('input.ether-userAddress').val(App.account);
		$('.ether-userAddress:not(:input)').text(App.account);
		$('.ether-userAddress').attr('data-clipboard-text', App.account);
		// User's ether balance UI
		$('.ether-userBalance').text(myNumber(App.etherBalance));
		// Every warning tootip
		$('.tooltip-notOwner').attr('data-original-title', 'Need Authentication');
		$('.tooltip-gotFrozen').attr('data-original-title', 'Sorry, you\'ve got frozen');
		// Bind listener and init for address-copier
		$('.address-copier').tooltip({
			title: 'click to copy',
			trigger: 'manual'
		});
		addressCopier_listener('.address-copier');
		// UI for invalid input
		$('input[placeholder*="Address"] + .invalid-tooltip').text('I need a valid address');
		$('input[placeholder*="Amount"] + .invalid-tooltip, input[placeholder*="ether"] + .invalid-tooltip').text('Come on... give me a positive number');
		// Enable every .myNumber tooltip
		$('.myNumber').tooltip();
	},

	startAsyncing: function() {
		// Watch update of blockchain
		web3.eth.filter('latest', (error, result) => {
			if (error) {
				console.error('App.startAsyncing()', error);
				return;
			}
			console.log('Block updated!');

			// Re-fetch several times to avoid update lost
			for (i = 1; i < 2; i++) {
				setTimeout(App.asyncList, 2000 * i);
			}
		});
	},

	// Add every async function into this list
	asyncList: function() {
		Token.async();
		Trader.async();
	}

};

$(function() {
	$(window).load(App.init);
});

// Generator for `_selector` to check validity input
function checkValidityMacro(_selector, _function) {
	// As soon as click, check if all input valid then call `_function`
	$(_selector + ' button').on('click', () => {
		// Traverse every child under `_selector`
		var _selectArr = $(_selector + ' input');
		var _flag = true;
		// Check if every child valid
		for (var i = 0; i < _selectArr.length; i++) {
			if (!_selectArr[i].checkValidity())
				_flag = false;
		}
		if (_flag) // If every child are valid then do `_function`
			_function();
		else // Else inject class into child to show their validity information
			$(_selector).addClass('was-validated');
	});
	// When not focus remove the ckecking state
	$(':not(' + _selector + ' *)').on('focus', () => $(_selector).removeClass('was-validated'));
}

// listener for address-copier
function addressCopier_listener(_selector) {
	$(_selector).on({
		'mouseenter': (event) => $(event.delegateTarget).tooltip('show'),
		'mouseleave': (event) => $(event.delegateTarget).tooltip('hide'),
		'click': (event) => {
			var t = $(event.delegateTarget);
			// Use DOM attr to determine if "Copied" hovering
			var tID = t.attr('timeoutID');
			if (typeof tID === typeof undefined || tID === false) {
				// "Copied" is not hovering, then change tooltip text and hover 3s
				// Stop listening for `mouseleave`
				t.off('mouseleave');
				// Change text after hiding tooltip
				t.tooltip('hide');
				// Once hiding
				t.one('hidden.bs.tooltip', () => {
					// Change text in tooltip and show tooltip
					t.attr('data-original-title', 'Copied');
					t.tooltip('show');
				});

			} else // "Copied" is still hovering
				clearTimeout(tID); // Clear previous scheduling

			// Start a scheduling for close hovered "Copied" tooltip
			t.attr('timeoutID', setTimeout(() => {
				// After 3s, tooltip become as usual
				t.tooltip('hide');
				t.attr('data-original-title', 'click to copy');
				// Activate listener for `mouseleave`
				t.on('mouseleave', (event) => t.tooltip('hide'));
				// Remove DOM attr for checking scheduling
				t.removeAttr('timeoutID');
			}, 3000));
		}
	});
}

// macro for multi-selector in jq
function multiSelector(preStr, arr, postStr) {
	var result = '';
	for (i in arr) {
		if (i > 0) // Add ',' after the first selector
			result += ','
		result += (preStr + arr[i] + postStr);
	}
	return result;
}

// Formulate number display
function myNumber(n) {
	var d = Math.floor(Math.log(n) / Math.log(10)); // digit of n
	switch (d) {
		case -3:
		case -2:
		case -1:
		case 0:
		case 1:
		case 2:
			// 0.001~999.9 show 4 digit
			return Math.floor(n * 1000) / 1000;
		case 3:
		case 4:
			// 1,000~99,999 show in format '1.23k' or '12.3k'
			return Math.floor(n / Math.pow(10, d - 2)) / Math.pow(10, 5 - d) + 'k';
		case 5:
			// 100,000~999,999 show in format '0.12M'
			return Math.floor(n / 10000) / 100 + 'M';
		case 6:
		case 7:
		case 8:
			// 1,000,000~999,999,999 show in format '1.23M','12.3M','123M'
			return Math.floor(n / Math.pow(10, d - 2)) / Math.pow(10, 8 - d) + 'M';
		default:
			// deal with overflow
			n = n / Math.pow(10, d - 1);
			if (n == 100) {
				n /= 10;
				d++;
			}
			// An HTML format of '2.3×10^d'
			return Math.floor(n) / 10 + '×10<sup>' + d + '</sup>';
	}
}

function numberWithCommas(n) {
	return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}