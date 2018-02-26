pragma solidity ^0.4.18;

import "./Owner.sol";

contract Token is Owner
{
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint public totalSupply;
    uint public sellPrice = 1 ether;
    uint public buyPrice = 1 ether;

    mapping (address => uint) public balanceOf;
    mapping (address => mapping (address => uint)) public allowance;
    mapping (address => bool) public frozenAccount;

    event FrozenFunds(address target, bool frozen);
    event Transfer(address indexed from, address indexed to, uint value);
    event Allowance(address indexed from, address indexed to, uint value);

    /*
     * Constrctor function
     *
     * Initializes contract with initial supply tokens to the creator of the contract
     */
    function Token(uint _supply,string _name,string _symbol) public payable
    {
        totalSupply = _supply * 10 ** uint(decimals); // Update total supply with the decimal amount
        balanceOf[msg.sender] = totalSupply/10;       // Give the creator 1/10 initial tokens
        balanceOf[this] = totalSupply*9/10;           // Minter has the rest
        name = _name;                                 // Set the name for display purposes
        symbol = _symbol;                             // Set the symbol for display purposes
    }

    // return user and minter's ether & token balances
    function getBalances() public view returns (uint minter_token,uint user_token,uint minter_ether,uint user_ether)
    {
      return (balanceOf[this],balanceOf[msg.sender],this.balance,msg.sender.balance);
    }

    /*
     * Transfer tokens
     *
     * Send `_amount` tokens to `_to` from your account
     *
     * @param _to The address of the recipient
     * @param _amount the amount to send
     */
    function transfer(address _to, uint _amount) public
    {
        _transfer(msg.sender, _to, _amount);
    }

    /*
     * Internal transfer, only can be called by this contract
     */
    function _transfer(address _from, address _to, uint _amount) internal
    {
        // Prevent transfer to no one. Use burn() instead
        require(_to != 0x0);
        // Check if the sender has enough
        require(balanceOf[_from] >= _amount);
        // Check for overflows
        require(balanceOf[_to] + _amount > balanceOf[_to]);
        // Check whether 2 address is frozen
        require(!frozenAccount[_from] && !frozenAccount[_to]);
        // Save this for an assertion in the future
        uint previousBalances = balanceOf[_from] + balanceOf[_to];
        // Subtract from the sender
        balanceOf[_from] -= _amount;
        // Add the same to the recipient
        balanceOf[_to] += _amount;
        Transfer(_from, _to, _amount);
        // Asserts are used to use static analysis to find bugs in your code. They should never fail
        assert(balanceOf[_from] + balanceOf[_to] == previousBalances);
    }

    /*
     * @notice Create `_amount` tokens and send it to `_target`
     * @param _target Address to receive the tokens
     * @param _amount the amount of tokens it will receive
     */
    function mint(address _target, uint _amount) onlyOwner public
    {
        require(_target != 0x0);          // Prevent mint in vein
        balanceOf[_target] += _amount;
        totalSupply += _amount;
        Transfer(0x0, this, _amount);
        Transfer(this, _target, _amount);
    }
    
    /*
     * Destroy tokens
     *
     * Remove `_amount` tokens from the system irreversibly
     *
     * @param _amount the amount of money to burn
     */
    function burn(uint _amount) public
    {
        require(balanceOf[msg.sender] >= _amount);   // Check if the sender has enough
        balanceOf[msg.sender] -= _amount;            // Subtract from the sender
        totalSupply -= _amount;                      // Updates totalSupply
        Transfer(msg.sender, 0x0, _amount);
    }

    /*
     * @notice Allow users to buy tokens for `newBuyPrice` eth and sell tokens for `newSellPrice` eth
     * @param _sellPrice Price the users can sell to the contract
     * @param _buyPrice Price users can buy from the contract
     */
    function setPrices(uint _sellPrice, uint _buyPrice) onlyOwner public
    {
        setSellPrice(_sellPrice);
        setBuyPrice(_buyPrice);
    }

    function setSellPrice(uint _sellPrice) onlyOwner public
    {
        sellPrice = _sellPrice;
    }

    function setBuyPrice(uint _buyPrice) onlyOwner public
    {
        buyPrice = _buyPrice;
    }

    /*
     * @notice Sell `amount` tokens to contract
     * @param amount amount of tokens to be sold
     */
    function sell(uint _amount) public returns (uint revenue)
    {
        revenue=_amount * sellPrice/1 ether;
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
     * @notice toggle allow/prevent `_target` from sending & receiving tokens
     * @param _target Address to be frozen
     */
    function toggleFrozen(address _target) onlyOwner public
    {
        setFrozen(_target, !frozenAccount[_target]);
    }

    /*
     * @notice `_isFrozen? Prevent | Allow` `_target` from sending & receiving tokens
     * @param _target Address to be frozen
     * @param freeze either to freeze it or not
     */
    function setFrozen(address _target, bool _isFrozen) onlyOwner public
    {
        frozenAccount[_target] = _isFrozen;
        FrozenFunds(_target, _isFrozen);
    }

    /*
     * Set allowance for other address
     *
     * Allows `_spender` to spend no more than `_amount` tokens in your behalf
     *
     * @param _spender The address authorized to spend
     * @param _amount the max amount they can spend
     */
    function approve(address _spender, uint _amount) public
    {
        _approve(msg.sender, _spender, _amount);
    }
    
    function _approve(address _from, address _to, uint _amount) internal
    {
        // Prevent approve to no one
        require(_to != 0x0);
        // Check if the sender has enough
        require(balanceOf[_from] >= _amount);
        // Check whether 2 address is frozen
        require(!frozenAccount[_from] && !frozenAccount[_to]);
        
        allowance[_from][_to] = _amount;
        Allowance(_from, _to, _amount);
    }
    
    /*
     * Transfer tokens from other address
     *
     * Send `_amount` tokens to `_to` in behalf of `_from`
     *
     * @param _from The address of the sender
     * @param _to The address of the recipient
     * @param _amount the amount to send
     */
    function transferFrom(address _from, address _to, uint _amount) public
    {
        require(_amount <= allowance[_from][_to]);      // Check allowance
        allowance[_from][_to] -= _amount;               // Modify the referenced value
        Allowance(_from, _to, allowance[_from][_to]);
        _transfer(_from, _to, _amount);
    }

    /*
     * Destroy tokens from other account
     *
     * Remove `_amount` tokens from the system irreversibly on behalf of `_from`.
     *
     * @param _from the address of the sender
     * @param _amount the amount of money to burn
     */
    function burnFrom(address _from, uint _amount) public
    {
        require(balanceOf[_from] >= _amount);               // Check if the targeted balance is enough
        require(_amount <= allowance[_from][msg.sender]);   // Check allowance
        balanceOf[_from] -= _amount;                        // Subtract from the targeted balance
        allowance[_from][msg.sender] -= _amount;            // Modify the referenced value
        Allowance(_from, msg.sender, allowance[_from][msg.sender]);
        totalSupply -= _amount;                             // Update totalSupply
        Transfer(_from, 0x0, _amount);
    }
}
