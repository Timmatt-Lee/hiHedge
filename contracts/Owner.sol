pragma solidity ^0.4.18;

contract Owner
{
  address[] public ownerList;

  constructor(address[] _ownerList) public
  {
    ownerList = _ownerList;
  }

  modifier onlyOwner(uint8 i)
  {
    require(msg.sender == ownerList[i]);
    _;
  }

  function transferOwnership(uint8 i, address newOwner) public onlyOwner(i)
  {
    ownerList[i] = newOwner;
  }
 }
