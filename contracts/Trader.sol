pragma solidity ^0.4.18;

import "./Token.sol";
import "./lib/iterableMapping.sol";

contract Trader is Token
{
    // init iterableMapping 
    using iterableMapping for iterableMapping.itMap;
    using iterable2DMapping for iterable2DMapping.it2DMap;
    
    event Transaction(uint indexed time, address indexed trader, string indexed stock, uint price, int amount);
    event Subscription(address indexed from, address indexed to, uint amount);
    
    address[] public trader;    // users who can transact and emit transaction to subscribers
    iterable2DMapping.it2DMap subscription;
    mapping (address => uint) public fee;  // subscription fee
    
    /*
     * Constrctor function
     *
     * Initializes Token
     */
    function Trader() public Token(10000, "hiCoin", "✋")
    {
        
    }
    
    /*
     * @notice Exclude non-Traders/Traders
     * @param _isTrader Toggle the function can only access to Traders/non-Traders
     */
    modifier isTrader(bool _isTrader)
    {
        bool result = _isTrader ? false : true;
        for(uint i=0; i < trader.length; i++)
        {
            if(msg.sender == trader[i])
                result = _isTrader ? true : false;
        }
        require(result);
        _;
    }
    
    // a non-trader register to be a trader who can transact and emit transaction to subscribers
    function registerTrader() isTrader(false) public
    {
        trader[trader.length++] = msg.sender;
    }
    
    /*
     * @notice sender subscribe a trader with amount that bond with trader's strategy afterward
     * @param _trader Address that sender subscribe to
     * @param _amount Amount of Token that share ownership to trader 
     */
    function subscribe(address _trader, uint _allowance) public
    {
        _transfer(msg.sender, _trader, fee[_trader]);           // pay subscription fee to trader
        _approve(msg.sender, _trader, _allowance);              // sender approve to trader
        subscription.insert(_trader, msg.sender, _allowance);   // insert data
        Subscription(_trader, msg.sender, _allowance);          // record on event
    }
    
    /*
     * @notice trader make transaction
     * @param _time Time that transaction happen
     * @param _stock Name of stock
     * @param _price Price that trader buy in or sell _amount
     * @param _amount Amount that trader want to buy(positive number) or sell(negative number)
     */
    function transaction(uint _time, string _stock, uint _price, int _amount) isTrader(true) public
    {
        for(uint i=0; i < subscription.size(msg.sender); i++)
        {
            subscription.getKey(msg.sender, i);
        }
        Transaction(_time, msg.sender, _stock, _price, _amount);
    }
}
