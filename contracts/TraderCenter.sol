pragma solidity ^0.4.18;

import "./Trader.sol";

contract TraderCenter
{
    address deployer;   // To record who deploy this contract
    
    event RegisteredTrader(address trader);
    // Each registered account can have an array of Trader contract instance
    mapping(address => Trader[]) public traderOf;
    
    /*
     * Constrctor function
     */
    function TraderCenter() public
    {
        deployer = msg.sender;
    }

    /*
     * Get all Traders of `_registrant`
     */
    function getTraders(address _registrant) external view returns (Trader[])
    {
        return traderOf[_registrant];
    }

    /*
     * @param _totalShare
     * @param _price Exchange rate of ether per share (only can customize here)
     * @param _fee Subscription fee
     * @param _splitting Splitting ratio of sharesOf in the benefit
     */
    function registerTrader(uint _totalShare, uint _price, uint _fee, uint _splitting) payable external
    {
        // New a Trader contract instance
        address[] memory _ownerList = new address[](2);
        _ownerList[0] = deployer;
        _ownerList[1] = msg.sender;
        Trader t = (new Trader).value(msg.value)(
                _ownerList,
                _totalShare,
                _price,
                _fee,
                _splitting);
        // Push to registrant's trader list
        traderOf[msg.sender].push(t);
        // Emit event
        emit RegisteredTrader(address(t));
    }
}
