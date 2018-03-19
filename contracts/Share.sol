pragma solidity ^0.4.18;

import "./Owner.sol";

contract Share is Owner
{
    uint public totalShare;
    uint public splitting; // splitting ratio of share in the benefit
    uint public fee;       // subscription fee
    uint public price = 1 ether;

    mapping (address => uint) public share;

    /*
     * Constrctor function
     *
     * Initializes contract with initial shares to the deployer of the contract
     */
    function Share(uint _totalShare, uint _fee, uint _splitting) public
    {
        totalShare = _totalShare;
        share[this] = totalShare;   // this contract store total share at first
        fee = _fee;
        splitting = _splitting;
    }

    /*
     * Transfer share
     *
     * @require owner of this contract (basically is Trader contract)
     * @param _from Address of the sender
     * @param _to Address of the recipient
     * @param _amount Amount to send
     */
    function transfer(address _from, address _to, uint _amount) onlyOwner public
    {
        _transfer(_from, _to, _amount);
    }
    
    /*
     * Internal transfer
     */
    function _transfer(address _from, address _to, uint _amount) internal
    {
        // Prevent transfer to no one.
        require(_to != 0x0);
        // Check if the sender has enough share
        require(share[_from] >= _amount);
        // Check for overflows
        require(share[_to] + _amount > share[_to]);
        // Save this for a assert check later
        uint previousBalances = share[_from] + share[_to];
        // Subtract from the sender
        share[_from] -= _amount;
        // Add the same to the recipient
        share[_to] += _amount;
        // Asserts are used to use static analysis to find bugs in your code. They should never fail
        assert(share[_from] + share[_to] == previousBalances);
    }
    
    /*
     * Buy share
     *
     * @require owner of this contract (basically is Trader contract)
     * @param _buyer Address who want to buy shares
     * @param _value Amount of ether that buyer has paid
     * @return amount Amount of share that buyer can get
     */
    function buy(address _buyer, uint _value) onlyOwner public returns (uint amount)
    {
        amount = _value * 1 ether / price;  // calculates the amount
        _transfer(this, _buyer, amount);    // transfer
    }
    
    /*
     * Sell `_amount` shares to contract
     *
     * @require owner of this contract (basically is Trader contract)
     * @param _seller Address who want to sell shares
     * @param _amount Amount of shares to be sold
     * @return revenue Amount of ether that seller can get
     */
    function sell(address _seller, uint _amount) onlyOwner public returns (uint revenue)
    {
        revenue = _amount * price / 1 ether;    // calculates the revenue
        _transfer(_seller, this, _amount);      // transfer
    }

    /*
     * Allow users to buy &sell shares for `_price` eth
     *
     * @param _price Price that how much one share worth in ether
     */
    function setPrice(uint _price) onlyOwner public
    {
        require(_price != price);
        price = _price;
    }
}
