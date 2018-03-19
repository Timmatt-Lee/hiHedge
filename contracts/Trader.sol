pragma solidity ^0.4.18;

import "./Owner.sol";
import "./Share.sol";

contract Trader
{
    address[] public trader;                            // all traders
    mapping(address => address[]) public subscriber;    // key: trader, index: trader's subscribers
    mapping(address => Share) public share;             // each trader's Share contract
    
    /*
     * Get all traders in array type
     */
    function getTraders() public view returns (address[])
    {
        return trader;
    }
    
    /*
     * Get all subscribers of `_trader` in array type
     */
    function getSubscribers(address _trader) public view returns (address[])
    {
        return subscriber[_trader];
    }
    
    /*
     * Require `_target` is `_isTrader? trader | not trader`
     *
     * @param _target Address to check
     * @param _isTrader Require trader or not trader
     */
    modifier isTrader(address _target, bool _isTrader)
    {
        for(uint i=0; i < trader.length; i++)
        {
            if(_target == trader[i])
            {
                if(_isTrader)
                {
                    // to trick the final require()
                    _isTrader = false;
                    break;
                }
                else
                    revert();
            }
        }
        /* 
         * Loop check done, require `_isTrader` == false
         *
         * if require trader and `_target` is, then `_isTrader` pretent to be false above   PASS
         * if require trader and `_target` is NOT, then `_isTrader` remain true             FAIL
         * if require NOT trader and `_target` is NOT, then `_isTrader` remain false        PASS
         * if require NOT trader and `_target` is, then this have triggered revert() above  FAIL
         */
        require(!_isTrader);
        _;
    }
    
    /*
     * Require `_trader` is `_isTrader? trader | non-trader`
     *
     * @notice same logic as modifier isTrader()
     * @param _trader Address of a trader
     * @param _target Address to check
     * @param _isTrader Require subscriber or not subscriber
     */
     modifier isSubscriber(address _trader, address _target, bool _isSubscriber)
    {
        for(uint i=0; i < subscriber[_trader].length; i++)
        {
            if(_target == subscriber[_trader][i])
            {
                if(_isSubscriber)
                {
                    _isSubscriber = false;
                    break;
                }
                else
                    revert();
            }
        }
        require(!_isSubscriber);
        _;
    }
    
    /*
     * Regist as trader
     *
     * @require msg.sender is NOT trader
     * @param _totalShare
     * @param _splitting Splitting ratio of share in the benefit
     * @param _fee Subscription fee
     */
    function registerTrader(uint _totalShare, uint _splitting, uint _fee) isTrader(msg.sender, false) payable public
    {
        require(_totalShare >= 1 ether);       // total share should more than min margin
        require(msg.value >= 1 ether);         // sender should pay at least min margin at first
        trader[trader.length++] = msg.sender;   // append trader list
        share[msg.sender] = new Share(_totalShare, _splitting, _fee);   //make Share contract
        share[msg.sender].buy(msg.sender, msg.value);   // initial share for sender's initial pay
    }
    
    /*
     * Subscribe to a trader
     *
     * @require `_trader` must be an existed trader
     * @require you must not use to be a subscriber
     * @param _trader Trader you want to subscribe
     */
    function subscribe(address _trader) isTrader(_trader, true) isSubscriber(_trader, msg.sender, false) payable public
    {
        subscriber[_trader][subscriber[_trader].length++] = msg.sender;     // append trader's subscriber list
        share[_trader].buy(msg.sender, msg.value - share[_trader].fee());   // buy shares for buyer (minus subscription fee)
        _trader.transfer(share[_trader].fee());                             // trasfer subscription fee (ether) to trader
    }
    
    /*
     * Buy trader's shares
     *
     * @require `_trader` must be an existed trader
     * @require you must be subscriber of `trader` 
     * @param _trader Trader you want to subscribe
     */
    function buyShare(address _trader) isTrader(_trader, true) isSubscriber(_trader, msg.sender, true) payable public returns (uint amount)
    {
        amount = share[_trader].buy(msg.sender, msg.value);  // buy shares for buyer
    }
    
    /*
     * Sell trader's shares
     *
     * @require `_trader` must be an existed trader
     * @require you must be subscriber of `trader` 
     * @param _trader Trader you want to subscribe
     * @param 
     */
    function sellShare(address _trader, uint _amount) isTrader(_trader, true) isSubscriber(_trader, msg.sender, true) public returns (uint revenue)
    {
        revenue = share[_trader].sell(msg.sender, _amount); // sell shares for seller
        require(address(this).balance >= revenue);          // checks if the contract has enough ether to send   
        msg.sender.transfer(revenue);                       // sends ether to the seller. It's important to do this last to avoid recursion attacks
    }
    
    /*
     * Tranfer trader's shares to `_to`
     *
     * @require `_trader` must be an existed trader
     * @require you must be subscriber of `trader` 
     * @param _trader Trader you want to subscribe
     */
    function transferShare(address _trader, uint _amount, address _to) isTrader(_trader, true) isSubscriber(_trader, msg.sender, true) public
    {
        share[_trader].transfer(msg.sender, _to, _amount);  // transfer shares to `_to`
    }
}
