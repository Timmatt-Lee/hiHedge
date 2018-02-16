pragma solidity ^0.4.18;

import "./Owner.sol";

contract Token is Owner
{
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint public totalSupply;
    uint public sellPrice=1 ether;
    uint public buyPrice=1 ether;

    mapping (address => uint) public balanceOf;
    mapping (address => mapping (address => uint)) public allowance;
    mapping (address => bool) public frozenAccount;

    event FrozenFunds(address target, bool frozen);
    event Transfer(address indexed from, address indexed to, uint value);
    event Burn(address indexed from, uint value);

    /*
     * Constrctor function
     *
     * Initializes contract with initial supply tokens to the creator of the contract
     */
    function Token(uint initialSupply,string tokenName,string tokenSymbol) public payable
    {
        totalSupply = initialSupply * 10 ** uint(decimals); // Update total supply with the decimal amount
        balanceOf[msg.sender] = totalSupply/10;             // Give the creator 1/10 initial tokens
        balanceOf[this] = totalSupply*9/10;                 // Minter has the rest
        name = tokenName;                                   // Set the name for display purposes
        symbol = tokenSymbol;                               // Set the symbol for display purposes
    }

    // return user and minter's ether & token balances
    function getBalances() public view returns (uint minter_token,uint user_token,uint minter_ether,uint user_ether)
    {
      return (balanceOf[this],balanceOf[msg.sender],this.balance,msg.sender.balance);
    }


    /*
     * Transfer tokens
     *
     * Send `_value` tokens to `_to` from your account
     *
     * @param _to The address of the recipient
     * @param _value the amount to send
     */
    function transfer(address _to, uint _value) public
    {
        _transfer(msg.sender, _to, _value);
    }


    /*
     * Internal transfer, only can be called by this contract
     */
    function _transfer(address _from, address _to, uint _value) internal
    {
        // Prevent transfer to 0x0 address. Use burn() instead
        require(_to != 0x0);
        // Check if the sender has enough
        require(balanceOf[_from] >= _value);
        // Check for overflows
        require(balanceOf[_to] + _value > balanceOf[_to]);
        // Save this for an assertion in the future
        uint previousBalances = balanceOf[_from] + balanceOf[_to];
        // Subtract from the sender
        balanceOf[_from] -= _value;
        // Add the same to the recipient
        balanceOf[_to] += _value;
        Transfer(_from, _to, _value);
        // Asserts are used to use static analysis to find bugs in your code. They should never fail
        assert(balanceOf[_from] + balanceOf[_to] == previousBalances);
    }

    /*
     * @notice Create `mintedAmount` tokens and send it to `target`
     * @param target Address to receive the tokens
     * @param mintedAmount the amount of tokens it will receive
     */
    function mintToken(address target, uint mintedAmount) onlyOwner public
    {
        balanceOf[target] += mintedAmount;
        totalSupply += mintedAmount;
        Transfer(0, this, mintedAmount);
        Transfer(this, target, mintedAmount);
    }

    /*
     * @notice Allow users to buy tokens for `newBuyPrice` eth and sell tokens for `newSellPrice` eth
     * @param newSellPrice Price the users can sell to the contract
     * @param newBuyPrice Price users can buy from the contract
     */
    function setPrices(uint newSellPrice, uint newBuyPrice) onlyOwner public
    {
        setSellPrice(newSellPrice);
        setBuyPrice(newBuyPrice);
    }

    function setSellPrice(uint newSellPrice) onlyOwner public
    {
        sellPrice = newSellPrice;
    }

    function setBuyPrice(uint newBuyPrice) onlyOwner public
    {
        buyPrice = newBuyPrice;
    }

    /*
     * @notice Sell `amount` tokens to contract
     * @param amount amount of tokens to be sold
     */
    function sell(uint amount) public returns (uint revenue)
    {
        revenue=amount * sellPrice/1 ether;
        require(this.balance >= revenue);                 // checks if the contract has enough ether to buy
        _transfer(msg.sender, this, revenue*1 ether/sellPrice);   // makes the transfers
        msg.sender.transfer(revenue);                     // sends ether to the seller. It's important to do this last to avoid recursion attacks
        return revenue;
    }


    // @notice Buy tokens from contract by sending ether
    function buy() payable public returns (uint amount)
    {
        amount = msg.value*1 ether / buyPrice;               // calculates the amount
        _transfer(this, msg.sender, amount);         // makes the transfers
        return amount;
    }

    /*
     * Transfer tokens from other address
     *
     * Send `_value` tokens to `_to` in behalf of `_from`
     *
     * @param _from The address of the sender
     * @param _to The address of the recipient
     * @param _value the amount to send
     */
    function transferFrom(address _from, address _to, uint _value) public returns (bool success)
    {
        require(_value <= allowance[_from][msg.sender]);     // Check allowance
        allowance[_from][msg.sender] -= _value;
        _transfer(_from, _to, _value);
        return true;
    }

    /*
     * Set allowance for other address
     *
     * Allows `_spender` to spend no more than `_value` tokens in your behalf
     *
     * @param _spender The address authorized to spend
     * @param _value the max amount they can spend
     */
    function approve(address _spender, uint _value) public returns (bool success)
    {
        allowance[msg.sender][_spender] = _value;
        return true;
    }

    /*
     * @notice `freeze? Prevent | Allow` `target` from sending & receiving tokens
     * @param target Address to be frozen
     * @param freeze either to freeze it or not
     */
    function freezeAccount(address target, bool freeze) onlyOwner public
    {
        frozenAccount[target] = freeze;
        FrozenFunds(target, freeze);
    }

    /*
     * Destroy tokens
     *
     * Remove `_value` tokens from the system irreversibly
     *
     * @param _value the amount of money to burn
     */
    function burn(uint _value) public returns (bool success)
    {
        require(balanceOf[msg.sender] >= _value);   // Check if the sender has enough
        balanceOf[msg.sender] -= _value;            // Subtract from the sender
        totalSupply -= _value;                      // Updates totalSupply
        Burn(msg.sender, _value);
        return true;
    }

    /*
     * Destroy tokens from other account
     *
     * Remove `_value` tokens from the system irreversibly on behalf of `_from`.
     *
     * @param _from the address of the sender
     * @param _value the amount of money to burn
     */
    function burnFrom(address _from, uint _value) public returns (bool success)
    {
        require(balanceOf[_from] >= _value);                // Check if the targeted balance is enough
        require(_value <= allowance[_from][msg.sender]);    // Check allowance
        balanceOf[_from] -= _value;                         // Subtract from the targeted balance
        allowance[_from][msg.sender] -= _value;             // Subtract from the sender's allowance
        totalSupply -= _value;                              // Update totalSupply
        Burn(_from, _value);
        return true;
    }
}
