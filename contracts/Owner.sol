pragma solidity ^0.4.18;
contract Owner
{
  address public owner;

  function Owner() public
  {
    owner = msg.sender;
  }

  modifier onlyOwner
  {
    require(msg.sender == owner);
    _;
  }

  // 所有權轉移
  function transferOwnership(address newOwner) public onlyOwner
  {
    owner = newOwner;
  }
 }
