pragma solidity ^0.4.18;

import "./Owner.sol";

contract Trader is Owner
{
    // OwnerList index identifier
    uint8 constant DEPLOYER = 0;
    uint8 constant REGISTRANT = 1;

    uint public totalShare;
    uint initPrice;             // Backup price to restore as soon as bankrupt
    uint public price ;         // Price of ether per share
    uint public fee;            // Subscription fee
    uint public splitting;      // Splitting ratio per share when appreciation
    bool public frozen = false; // If this contract's ether balance lower than margin

    address[] public subscriber;// Trader's subscribers
    mapping (address => uint) public shareOf;

    event Subscription(address indexed subscriber);
    event Records(uint time, string stock, int price, int amount);
    event Appreciation(uint amount);
    event Bankrupted();

    /*
     * Initializes ownerList, basic imformation, and buy `_initFund` for registrant
     */
    constructor(
        address[] _ownerList,
        uint _totalTrader,
        uint _price,
        uint _fee,
        uint _splitting) public payable Owner(_ownerList)
    {
        totalShare = _totalTrader;
        // This contract store total share at first
        shareOf[this] = totalShare;
        // Registrant can customize `price` only when init
        price = initPrice =_price;
        fee = _fee;
        // `splitting` must be devided by 1 ether to be percentage when usage
        require(_splitting <= 1 ether);
        splitting = _splitting;

        // Registrant's initFund (margin = 1 ether)
        require(msg.value >= 1 ether);
        subscriber.push(ownerList[REGISTRANT]);
        _transfer(this, ownerList[REGISTRANT], msg.value / price);
    }

    /*
     * Get all subscribers of this share contract in array type
     */
    function getSubscribers() external view returns (address[])
    {
        return subscriber;
    }

    // Determine whether `a` is a subscriber or not
    function isSubscriber(address a) internal view returns (bool)
    {
        for(uint i=0; i < subscriber.length; i++)
        {
            if(a == subscriber[i])
                return true;
        }
        return false;
    }

    /*
     * Subscribe to this trader
     */
    function subscribe() external payable
    {
      require(msg.value >= fee);
      require(!isSubscriber(msg.sender));

      // Add buyer to subscriber list
      subscriber.push(msg.sender);
      // Trasfer subscription fee (ether) to registrant
      ownerList[REGISTRANT].transfer(fee);

      // Emit Event
      emit Subscription(msg.sender);
    }

    /*
     * Transfer share
     *
     * @param _to Address of the recipient
     * @param _amount Amount of share to send
     */
    function transfer(address _to, uint _amount) external
    {
        _transfer(msg.sender, _to, _amount);
    }

    function _transfer(address _from, address _to, uint _amount) internal
    {
        // Prevent transfer to no one.
        require(_to != 0x0);
        // Check if the sender has enough share
        require(shareOf[_from] >= _amount);
        // Check for overflows
        require(shareOf[_to] + _amount > shareOf[_to]);
        // Subtract from the sender
        shareOf[_from] -= _amount;
        // Add to the recipient
        shareOf[_to] += _amount;
    }

    /*
     * Buy share
     *
     * @return amount Amount of share that buyer can get
     */
    function buy() external payable returns (uint amount)
    {
        // Check if sender is subscriber
        require(isSubscriber(msg.sender));
        // Unfrooze if trader's ether balance over than margin
        if(frozen && address(this).balance >= 1 ether) frozen = false;
        // Calculates the amount (deduct subscription fee)
        amount = msg.value / price;
        // Transfer share
        _transfer(this, msg.sender, amount);

        // If not subscriber, add buyer to subscription list
        if(!isSubscriber(msg.sender))
        {
            // Add buyer to subscriber list
            subscriber.push(msg.sender);
            // Trasfer subscription fee (ether) to registrant
            ownerList[REGISTRANT].transfer(fee);
        }
    }

    /*
     * Sell `_amount` shares to contract
     *
     * @param _amount Amount of shares to be sold
     * @return revenue Amount of ether that seller can get
     */
    function sell(uint _amount) external returns (uint revenue)
    {
        // Check if sender is subscriber
        require(isSubscriber(msg.sender));
        // Calculates the revenue
        revenue = _amount * price;
        // Frooze if trader's ether balance will be lower than margin
        if(address(this).balance - revenue < 1 ether) frozen = true;
        // Check if trader has enough ether
        require(address(this).balance >= revenue);
        // Transfer share
        _transfer(msg.sender, this, _amount);
        // Make ether transfer at last
        msg.sender.transfer(revenue);
    }

    /*
     * @require only registrant can modify
     * @param _fee Subscription fee of ether per subscription
     */
    function setFee(uint _fee) onlyOwner(REGISTRANT) external
    {
        require(_fee != fee);
        fee = _fee;
    }

    /*
     * @require only registrant can modify
     * @param _splitting Splitting ratio in respect of share from each benefit
     */
    function setSplitting(uint _splitting) onlyOwner(REGISTRANT) external
    {
        require(_splitting != splitting);
        splitting = _splitting;
    }

    // emit a transaction event
    function record(uint _time, string _stock, int _price, int _amount) external onlyOwner(REGISTRANT)
    {
        require(!frozen);
        emit Records(_time, _stock, _price, _amount);
    }

    /*
     * When trader earned, deployer can deposit ether to raise the price
     * and subscriber can have splitting benifit
     *
     * @require only deployer can call
     */
    function appreciate() onlyOwner(DEPLOYER) payable external
    {
        require(!frozen);
        // Appreciate the price (deduct splitting)
        price += msg.value * (1 ether-splitting) / 1 ether / (totalShare-shareOf[this]);
        // Emit event
        emit Appreciation(msg.value);
        // Send splitting benifit (ether) to all subscriber
        for(uint i=0; i<subscriber.length; i++)
            subscriber[i].transfer(
                // according to subscriber's share ratio
                // `splitting` must be devided by 1 ether to be percentage
                msg.value * shareOf[subscriber[i]] * splitting / 1 ether / (totalShare-shareOf[this])
            );
    }

    /*
     * When trader lost, deployer can withdraw `_value` ether to depreciate the price
     * and as soon as total shares' value lower than margin, trader bankrupts
     *
     * @require only deployer can call
     * @param _value Value of ether that the
     */
    function depreciate(uint _value) onlyOwner(DEPLOYER) external
    {
        require(!frozen);
        // Price decline
        price -= _value / (totalShare-shareOf[this]);
        // Frooze if trader's ether balance will be lower than margin
        if(address(this).balance - _value < 1 ether) frozen = true;
        // Bankrupt if total shares' value lower than margin
        if(totalShare * price < 1 ether) bankrupt();
        // Deployer withdraw ether
        ownerList[DEPLOYER].transfer(_value);
    }

    function bankrupt() internal
    {
        // Emit Event
        emit Bankrupted();
        price = initPrice;

        for(uint i=0; i<subscriber.length; i++)
        {
            // zeroing share
            shareOf[subscriber[i]] = 0;
            // Return ether to subscriber
            subscriber[i].transfer(
                address(this).balance * shareOf[subscriber[i]] / (totalShare-shareOf[this])
            );
        }
    }
}
