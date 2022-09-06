
# Canto Dex Oracle contest details
- 19,000 CANTO main award pot
- 1,000 CANTO gas optimization award pot
- Join [C4 Discord](https://discord.gg/code4rena) to register
- Submit findings [using the C4 form](https://code4rena.com/contests/2022-09-canto-contest/submit)
- [Read our guidelines for more details](https://docs.code4rena.com/roles/wardens)
- Starts September 7, 2022 20:00 UTC
- Ends September 8, 2022 20:00 UTC

# Oracle Audit



## **Total LOC: 155**

# **Oracle Overview**
The oracle we define below is used in the Canto-Lending Market to determine the value of asset collateral of (`$CANTO`, `$NOTE`, `$USDC` `$USDT`, `$ETH`, `$ATOM`). It is also used to determine the value of lpTokens used as collateral. As such, the oracle is general purpose in that it is able to determine prices, from specified pairs deployed from the router, of non-LP and LP tokens. 
Stable pairs follow the `x^3y + y^3x = k` CF curve invariant. While stable pairs follow the regular constant-product CF invariant, `xy = k`, where `x` and `y` are the reserves of the assets in the pool.

# **Integration Tests**
Integration tests using CLM in conjunction with the oracle may be found [here](github.com/Canto-Network/clm), 
## **To Run**
`git clone https://github.com/Canto-Network/clm.git` 

`nvm use 14.0.0`

`yarn install --lock-file`

`npx hardhat test tests/canto/[test_file_to_run]`


# **BaseV1-Periphery**

## **getUnderlyingPrice (SLOC: 487 - 522): 35 LOC -**

### Explanation

This method is defined to adhere to the Compound `PriceOracle` interface. The Comptroller calls this method when calculating accountLiquidities for users who hold balances of Erc20 tokens. These tokens are priced in terms of `$NOTE` . Stable coins (USDC, USDT, NOTE) have prices that are statically set to 1e18.  

For non-stable tokens, there are two cases,

- The token is an lpToken
    
    If the token to be priced is an lpToken, the price of the lpToken is determined from `getPriceLP` (defined below)
    
- The token is not an lpToken
    
    The Price of the token is determined through the price determined from the Canto/Token pool * price from Canto/Note pool. All non-stable tokens, are priced in reference to the Canto/Token Pool.
    

The final price is scaled by 1e18.

### Concerns

- Is is possible for users to create non-stable pairs for stable pairs, and have the router reference them in price determination, and vice-versa for non-stable assets and stable pairs. i.e. we're trying to get USDC/NOTE stable price, but a 3rd party has deployed USDC/NOTE non-stable, and ensure that oracle is looking at correct one


### External Calls

- L495
    
    ```solidity
    address(ICErc20(address(ctoken)).underlying())
    ```
    
- L502/506
    
    ```solidity
    erc20(underlying).decimals();
    ```
    

## **getPriceLP (SLOC: 549 - 593): 14 LOC -**

### Explanation

This method is used to price lpTokens. There are two cases here

- The pair that lpToken is minted from is stable
    
    In this case, the Router will reference the Note/Token pool. The lpToken calculation  determines the reserves of Note in the pool (`unitReserves`) and the reserves of the other asset in the pool (`assetReserves`)
    
- The pair that lpToken is minted from is not stable
    
    In this case, the Router will reference the Canto/Token pool. The lpToken calculation determines the reserves of Canto in the pool (`unitReserves`) and the reserves of the other token in the pool (`assetReserves`)
    

along with the reserves, the last 8 price observations are determined, where the price is represented as follows 

```solidity
prices = sample(token_asset, token_asset_decimals, 8, 1)
```

Essentially, this returns the amount of the unitToken (Canto or Note) that swapping `10 **token.decimals()` of the assetToken would return with the reserves stored for each of the most recent 8 observations.

The totalSupply of lpTokens at each of the most recent 8 observations is also recorded. The lpTokenPrice is determined as follows

```go
sum_i((token_asset_reserves[i] * price[i] + token_unit_reserves[i])/totalSupply[i]) 
```
Where `token_asset_reserves`, `price`, `token_unit_reserves`, and `totalSupply` are TWAs of reserves, prices, and totalSupply from the pair. This calculation was meant to 


### Concerns

- What is the tolerance of the lpToken Pricing to large moves in volatility / reserve sizes in both volatile / not-volatile pairs. I.e - try to induce large moves in reserves sizes to force price to be over/under-estimate of actual reserve ratio.
- Inaccuracy resulting from rounding errors.
- StableSwap invariant for stable pairs `x^3y + xy^3` that is used, may also lead to inaccuracy in `getAmountOut` calculations

### External Calls

- L560/564/569/574
    
    ```go
    10 ** (erc20(token1).decimals());
    ```
    
- L561/565/571/575
    
    ```go
    pair.sample(token0, decimals, 8, 1) // call to BaseV1Pair 
    ```
    
- L562/566/572/576
    
    ```go
    pair.sampleReserves(8, 1);
    ```
    

## **getPriceCanto (SLOC: 525 - 534): 9 LOC -**

### Explanation

This method is used to determine the price of assets in terms of Canto. This method calls `quote` on the volatile pair between Canto/Asset. This returns the amount of Canto received when swapping `10 ** token.decimals()` for Canto in the Canto/Asset pair

### External Calls

- L532
    
    ```go
    IBaseV1Pair(pair).quote(address(token), decimals, 8)
    ```
    

## **getPriceNote (SLOC: 537 - 546): 9 LOC -**

### Explanation

Returns the price of the asset in Note. This is called for the deriving the price of stable assets. All stable assets are swapped in pools between the asset and Note. This method works similarly to `getPriceCanto` . All stable pools obey the curve invariant `x^3y + y^3x = k`  as such the calculations for `amountOut`  are different than in Canto/Asset pairs.

### Concerns

- Tolerance of stableswap invariant used to large moves in reserves of either asset.

### External Calls

- L544
    
    ```go
    IBaseV1Pair(pair).quote(address(token), decimals, 8)
    ```
    

# **BaseV1-Core**

## **_update (SLOC: 137 - 153): 16 LOC -**

### Explanation

Adds the current values of the reserves and totalSupply times the timeDiff between the last observations to the supply and reserve accumulators. After `updateFrequency` difference in `blockTimestamps` between the last recorded block timestamp and the current block timestamp, the `reserveCumulative` and `totalSupplyCumulative` values are written to state. Each time that any of these values changes, the accumulators are adjusted as follows,

 

```go
reserve0Cumulative += timeDiff * reserve0
reserve1Cumulative += timeDiff * reserve1
totalSupplyCumulataive += timeDiff * totalSupply
```

Where timeDiff is the difference in block timestamps between the current block timestamp, and the last time time that update was called. This enables TWAs to be calculated between observations as follows,

```go
(observation[i].reserve0Cumulative - observation[i-1].resrve0Cumulative)/timeElapsed
```

## R**eserves (SLOC: 224 - 237) 13 LOC -**

### Explanation

This method returns the totalSum of the last n recorded reserves for either pair, this value can then be averaged by the number of requested values, to obtain a TWA over the number of periods requested.

## **sampleReserves (SLOC: 237 - 259): 22 LOC -**

### Explanation

This method returns the TW value of the reserves of either asset between observations. The user is able to determine the windowSize, and the number of windows to return TW values for, it is calculated as follows,

```go
timeElapsed = observation[window * (i)].timeStamp - observation[window*(i - 1)].timeStamp
reserve0[i] = (observation[window * (i)].reserve0Cumulative - observation[window*(i - 1)].reserve0Cumulative) / timeElapsed
reserve1[i] = (observation[window * (i)].reserve1Cumulative - observation[window*(i - 1)].reserve1Cumulative) / timeElapsed
```

## **totalSupplyAvg (SLOC: 260 - 269): 9 LOC -**

### Explanation

This serves the same purpose as `reserves` however, the values summed are returned from `sampleSupply` (defined below)

## **sampleSupply (SLOC: 271 - 289): 18 LOC -**

### Explanation

This method returns the TW value of the reserves of either asset between observations. The user is able to determine the windowSize, and the number of windows to return TW values for, it is calculated as follows,

```go
timeElapsed = observation[window * (i)].timeStamp - observation[window*(i - 1)].timeStamp
supply[i] = (observation[window * (i)].totalSupplyCumulative - observation[window*(i - 1)].totalSupplyCumulative) / timeElapsed
```
