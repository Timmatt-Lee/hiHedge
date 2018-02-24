pragma solidity ^0.4.18;

library iterableMapping
{
    struct itMap 
    {
        mapping(address => uint) data;
        address[] keyIndex;
    }

    function insert(itMap storage self, address key, uint value) internal returns (bool replaced) 
    {
        self.data[key] = value;
        if (exist(self,key))  // we have had the key
        {
            if(value == 0)
                remove(self,key);   // 為零則移除在keyIndex裡的該key
            return true;
        }
        else
        {
            if(value != 0)          // 非零才添加key到keyIndex裡
                self.keyIndex[self.keyIndex.length++] = key;
            return false;
        }
    }
    
    function modify(itMap storage self, address key, uint delta) internal
    {
        insert(self, key, self.data[key]+delta);
    }
    
    function remove(itMap storage self, address key) internal
    {
        // swap current key with the last one
        (self.keyIndex[find(self,key)],self.keyIndex[self.keyIndex.length-1]) = (self.keyIndex[self.keyIndex.length-1],self.keyIndex[find(self,key)]);
        self.keyIndex.length--;     // shrink the keyIndex
    }

    function exist(itMap storage self, address key) internal view returns (bool isExist)
    {
        if(find(self,key) > self.keyIndex.length)
            return false;
        return true;
    }
    
    // find index which store key
    function find(itMap storage self, address key) internal view returns (uint index)
    {
        for(uint i=0; i < self.keyIndex.length; i++)
        {
            if(key == self.keyIndex[i])
            {
                return i;
            }
        }
        return self.keyIndex.length + 1;      // over the length represent not found
    }

    function size(itMap storage self) internal view returns (uint)
    {
        return self.keyIndex.length;
    }

    function traverse(itMap storage self) internal view returns (uint[] values)
    {
        values = new uint[](self.keyIndex.length);
        for(uint i=0; i < self.keyIndex.length; i++)
        {
            values[i] = self.data[self.keyIndex[i]];
        }
    }
}

// 2D itMap
library iterable2DMapping
{
    using iterableMapping for iterableMapping.itMap;

    struct it2DMap
    {
        mapping(address => iterableMapping.itMap) data;
        address[] keyIndex;
    }

    function insert(it2DMap storage self, address key,address innerkey, uint value) internal returns (bool replaced) 
    {
        self.data[key].insert(innerkey, value);
        if (exist(self, key))  // we have had the key
        {
            // inner的insert會因為value==0移除innerKey，如果此時這個key裡面裝的innerKey數量為零，那就也可以刪掉這個key了
            if(value == 0 && self.data[key].keyIndex.length == 0)   
                remove(self, key);
            return true;
        }
        else
        {
            // 非零才添加key到keyIndex裡
            if(value != 0)
                self.keyIndex[self.keyIndex.length++] = key;
            return false;
        }
    }

    function remove(it2DMap storage self, address key) internal
    {
        // swap current key with the last one
        (self.keyIndex[find(self,key)],self.keyIndex[self.keyIndex.length-1]) = (self.keyIndex[self.keyIndex.length-1],self.keyIndex[find(self,key)]);
        self.keyIndex.length--;     // shrink the keyIndex
    }

    function exist(it2DMap storage self, address key) internal view returns (bool isExist)
    {
        if(find(self,key) > self.keyIndex.length)
            return false;
        return true;
    }
    
    // find index which store key
    function find(it2DMap storage self, address key) internal view returns (uint index)
    {
        for(uint i=0; i < self.keyIndex.length; i++)
        {
            if(key == self.keyIndex[i])
            {
                return i;
            }
        }
        return self.keyIndex.length + 1;      // index over the length represent not found
    }
    
    // find the total amount and every indexes of key which contains with innerkey
    // notice [0] store total amount and [1~] store qualified results
    function find_outward(it2DMap storage self, address innerkey) internal view returns (uint[] indexes)
    {
        indexes = new uint[](self.keyIndex.length + 1); // it is and must be static (add one index at front for [0] store actual length)
        uint j = 0;
        for(uint i = 0; i < self.keyIndex.length; i++)
        {
            if(self.data[self.keyIndex[i]].exist(innerkey))
            {
                indexes[++j] = i;                   // push back i (jump over idnexes[0])
            }
        }
        indexes[0] = j;                             // represent actual length in indexes
    }

    function size(it2DMap storage self) internal view returns (uint)
    {
        return self.keyIndex.length;
    }

    function traverse_outward(it2DMap storage self,address innerKey) internal view returns (address[] keys, uint[] values)
    {
        keys = new address[](find_outward(self,innerKey)[0]);               // find_outward() return length on [0]
        values = new uint[](find_outward(self,innerKey)[0]);
        for(uint i = 1; i < find_outward(self,innerKey)[0] + 1; i++)        // find_outward() return results after [1]
        {
            address _foundKey = self.keyIndex[find_outward(self,innerKey)[i]];
            keys[i-1] = _foundKey;
            values[i-1] = self.data[_foundKey].data[innerKey];
        }
    }
}
