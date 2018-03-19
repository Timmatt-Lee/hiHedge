pragma solidity ^0.4.18;

import "./Owner.sol";

contract Token is Owner
{
    string public name;
    string public symbol;
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
     * Initializes contract with initial supply tokens to the deployer of the contract
     */
    function Token(uint _totalSupply, string _name, string _symbol) public payable
    {
        totalSupply = _totalSupply * 1 ether;   // Update total supply with the same decimal as ether
        balanceOf[this] = totalSupply;          // Minter has total supply
        name = _name;                           // Set the name for display purposes
        symbol = _symbol;                       // Set the symbol for display purposes
    }

    /*
     * return user and minter's ether & token balances
     */
    function getBalances() public view returns (uint minter_token, uint user_token, uint minter_ether, uint user_ether)
    {
      return (balanceOf[address(this)], balanceOf[msg.sender], address(this).balance, msg.sender.balance);
    }

    /*
     * Send `_amount` tokens to `_to` from your account
     *
     * @param _to Address of the recipient
     * @param _amount Amount to send
     */
    function transfer(address _to, uint _amount) public
    {
        _transfer(msg.sender, _to, _amount);
    }


    /*
     * Internal transfer
     */
    function _transfer(address _from, address _to, uint _amount) internal
    {
        // Prevent transfer to no one. Use burn() instead
        require(_to != 0x0);
        // Check if the sender has enough token
        require(balanceOf[_from] >= _amount);
        // Check for overflows
        require(balanceOf[_to] + _amount > balanceOf[_to]);
        // Check whether 2 address is frozen
        require(!frozenAccount[_from] && !frozenAccount[_to]);
        // Save this for a assert check later
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
     * Create `_amount` tokens and send it to `_target`
     *
     * @param _target Address to receive the tokens
     * @param _amount Amount of tokens it will receive
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
     * Remove `_amount` tokens from the system irreversibly
     *
     * @param _amount Amount of money to burn
     */
    function burn(uint _amount) public
    {
        require(balanceOf[msg.sender] >= _amount);   // Check if the sender has enough
        balanceOf[msg.sender] -= _amount;            // Subtract from the sender
        totalSupply -= _amount;                      // Updates totalSupply
        Transfer(msg.sender, 0x0, _amount);
    }

    /*
     * Allow users to buy tokens for `_sellPrice` eth and sell tokens for `_buyPrice` eth
     *
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
        require(_sellPrice != sellPrice);
        sellPrice = _sellPrice;
    }

    function setBuyPrice(uint _buyPrice) onlyOwner public
    {
        require(_buyPrice != buyPrice);
        buyPrice = _buyPrice;
    }

    /*
     * Sell `_amount` tokens to contract
     *
     * @param _amount Amount of tokens to be sold
     * @return revenue Amount of ether that seller can get
     */
    function sell(uint _amount) public returns (uint revenue)
    {
        revenue = _amount * sellPrice / 1 ether;
        require(address(this).balance >= revenue);  // checks if the contract has enough ether to send
        _transfer(msg.sender, this, _amount);       // transfer
        msg.sender.transfer(revenue);               // sends ether to the seller. It's important to do this last to avoid recursion attacks
    }

    /*
     * Buy tokens from contract by sending ether
     *
     * @return amount Amount of token that buyer can get
     */
    function buy() payable public returns (uint amount)
    {
        amount = msg.value * 1 ether / buyPrice;    // calculates the amount
        _transfer(this, msg.sender, amount);        // transfer
    }

    /*
     * Toggle allow/prevent `_target` from sending & receiving tokens
     *
     * @param _target Address to be frozen
     */
    function toggleFrozen(address _target) onlyOwner public
    {
        setFrozen(_target, !frozenAccount[_target]);
    }

    /*
     * `_isFrozen? Prevent | Allow` `_target` from sending & receiving tokens
     *
     * @param _target Address to be frozen
     * @param _isFrozen Determine to freeze it or not
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
     * @param _spender Address authorized to spend
     * @param _amount Max amount they can spend
     */
    function approve(address _spender, uint _amount) public
    {
        _approve(msg.sender, _spender, _amount);
    }
    
    /*
     * internal approve
     */
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
     * Send `_amount` tokens to `_to` in behalf of `_from`
     *
     * @param _from Address of the sender
     * @param _to Address of the recipient
     * @param _amount Amount to send
     */
    function transferFrom(address _from, address _to, uint _amount) public
    {
        require(_amount <= allowance[_from][_to]);      // Check allowance
        allowance[_from][_to] -= _amount;               // Modify the referenced value
        Allowance(_from, _to, allowance[_from][_to]);
        _transfer(_from, _to, _amount);
    }

    /*
     * Remove `_amount` tokens from the system irreversibly on behalf of `_from`.
     *
     * @param _from Address of the sender
     * @param _amount Amount of money to burn
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
