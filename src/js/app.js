'use strict'

// var l_up = [];
// var l_left = [];
// var l_right = [];
// var l_down = []


//up
//[1, 2, 3, 4, 6, 11, 19, 23, 32, 37, 38, 58, 61, 77, 93, 97, 101]
//[3, 6, 11, 19,23,37, 38,58,61,93]

var App = {
	web3Provider: null,
	contracts: {}, // Store every contracts' json
	account: undefined, // User's account
	etherBalance: 0, // User's ether balance

	init: function() {
		// 諸葛44,呂布9, 曹操61,0,0最爛，貂蟬103
		// var i = 0;
		// var l2 = [1, 2, 3, 4, 6, 11, 19, 23, 32, 37, 38, 58, 61, 77, 93, 97, 101]; 
		//[6, 7, 9, 11, 12, 15, 16, 20, 23, 24, 25, 29, 38, 40, 42, 43, 48, 51, 53, 64, 68, 73, 85, 91]
		// $('#target').on('keydown', (e) => {
		// 	if (e.keyCode == 38) l_up.push(i - 1);
		// 	else if (e.keyCode == 40) l_down.push(i - 1);
		// 	else if (e.keyCode == 39) l_right.push(i - 1);
		// 	else if (e.keyCode == 37) l_left.push(i - 1);
		// });
		// var loop = setInterval(() => {
		// 	drawChart('tab-traderShare', i++);
		// 	console.log(i - 1);
		// 	if (i == 105)
		// 		clearInterval(loop);
		// }, 2000)
		// var loop = setInterval(() => {
		// 	drawChart('tab-traderShare', l2[i++]);
		// 	console.log(l2[i - 1]);
		// 	if (i == l2.length)
		// 		clearInterval(loop);
		// }, 2000)
		// drawChart('tab-traderShare', 0)
		// return;
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
		App.initContract('Trader');
		App.initContract('TraderCenter').then(TraderCenter.init); // Init object in TraderCenter.js
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
		// User's account
		App.account = web3.eth.defaultAccount;
		if (App.account === undefined) // If not login in
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
		$('.ether-userBalance').text(App.etherBalance.toFixed(2));
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
		$('input[placeholder*="Amount"] + .invalid-tooltip, input[placeholder*="ETH"] + .invalid-tooltip').text('Come on... give me a positive number');
		// Enable every .myNumber tooltip
		$('.myNumber').tooltip();
		// Enable every carousel
		$('.carousel').carousel();
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
			for (var i = 1; i < 2; i++) {
				setTimeout(App.asyncList, 2000 * i);
			}
		});
	},

	// Add every async function into this list
	asyncList: function() {
		// traverse all traders and call their sync function
		$.each(TraderCenter.registeredTrader, (addr, obj) => obj.async());

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

// Listener for address-copier
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

// Macro for multi-selector in jq
function multiSelector(preStr, arr, postStr) {
	var result = '';
	for (var i in arr) {
		if (i > 0) // Add ',' after the first selector
			result += ','
		result += (preStr + arr[i] + postStr);
	}
	return result;
}

// Formulate number display
function myNumber(n) {
	var d = Math.floor(Math.log(n) / Math.log(10)); // Digit of n
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
			// Deal with overflow
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


function zip(arr1, arr2) {
	var r = arr1.map((e, i) => [e, arr2[i]]);
	return r;
}

function revertDateNumber(date) {
	date = date.toString();
	var Y = date.slice(0, 4);
	var M = date.slice(4, 6);
	var D = date.slice(6, 8);

	var h = date.slice(8, 10);
	var m = date.slice(10, 12);
	var s = date.slice(12, 14);
	return (new Date(Date.UTC(Y, M - 1, D, h, m, s)));
}

function formatDateNumber(date) {
	var Y = date.getUTCFullYear();
	var M = date.getUTCMonth() + 1;
	if (M < 10)
		M = '0' + M;
	var D = date.getUTCDate();
	if (D < 10)
		D = '0' + D;
	var h = date.getUTCHours();
	if (h < 10)
		h = '0' + h;
	var m = date.getUTCMinutes();
	if (m < 10)
		m = '0' + m;
	var s = date.getUTCSeconds();
	if (s < 10)
		s = '0' + s;
	return Y + M + D + h + m + s;
}

function formatYMD(timestamp_in_ms, slicer = '/') {
	var offset = new Date().getTimezoneOffset();
	var dt_offset = offset * 60 * 1000;
	var dt = new Date(timestamp_in_ms + dt_offset);

	var y = dt.getFullYear();
	var m = dt.getMonth() + 1;
	var d = dt.getDate();

	// the above dt.get...() functions return a single digit
	// so I prepend the zero here when needed
	if (m < 10) {
		m = '0' + m;
	}
	if (d < 10) {
		d = '0' + d;
	}
	return y + slicer + m + slicer + d;
}


function formatTime(timestamp_in_ms, slicer = ':') {
	var offset = new Date().getTimezoneOffset();
	var dt_offset = offset * 60 * 1000;
	var dt = new Date(timestamp_in_ms + dt_offset);

	var hours = dt.getHours();
	var minutes = dt.getMinutes();
	var seconds = dt.getSeconds();

	if (hours < 10)
		hours = '0' + hours;

	if (minutes < 10)
		minutes = '0' + minutes;

	if (second < 10)
		second = '0' + second;
	return hours + slicer + minutes + slicer + second;
}

function round(v, deci) {
	var x = Math.pow(10, deci);
	return Math.round(v * x) / x;
}

// Check if unit needed plural
function plural(value, unit) {
	return value + ' ' + unit + (Math.abs(value) > 1 ? 's' : '');
};