# ✨ So you want to sponsor a contest

This `README.md` contains a set of checklists for our contest collaboration.

Your contest will use two repos: 
- **a _contest_ repo** (this one), which is used for scoping your contest and for providing information to contestants (wardens)
- **a _findings_ repo**, where issues are submitted (shared with you after the contest) 

Ultimately, when we launch the contest, this contest repo will be made public and will contain the smart contracts to be reviewed and all the information needed for contest participants. The findings repo will be made public after the contest report is published and your team has mitigated the identified issues.

Some of the checklists in this doc are for **C4 (🐺)** and some of them are for **you as the contest sponsor (⭐️)**.

---

# Contest setup

## ⭐️ Sponsor: Provide contest details

Under "SPONSORS ADD INFO HERE" heading below, include the following:

- [ ] Create a PR to this repo with the below changes:
- [ ] Name of each contract and:
  - [ ] source lines of code (excluding blank lines and comments) in each
  - [ ] external contracts called in each
  - [ ] libraries used in each
- [ ] Describe any novel or unique curve logic or mathematical models implemented in the contracts
- [ ] Does the token conform to the ERC-20 standard? In what specific ways does it differ?
- [ ] Describe anything else that adds any special logic that makes your approach unique
- [ ] Identify any areas of specific concern in reviewing the code
- [ ] Add all of the code to this repo that you want reviewed


---

# Contest prep

## ⭐️ Sponsor: Contest prep
- [ ] Provide a self-contained repository with working commands that will build (at least) all in-scope contracts, and commands that will run tests producing gas reports for the relevant contracts.
- [ ] Make sure your code is thoroughly commented using the [NatSpec format](https://docs.soliditylang.org/en/v0.5.10/natspec-format.html#natspec-format).
- [ ] Modify the bottom of this `README.md` file to describe how your code is supposed to work with links to any relevent documentation and any other criteria/details that the C4 Wardens should keep in mind when reviewing. ([Here's a well-constructed example.](https://github.com/code-423n4/2021-06-gro/blob/main/README.md))
- [ ] Please have final versions of contracts and documentation added/updated in this repo **no less than 24 hours prior to contest start time.**
- [ ] Be prepared for a 🚨code freeze🚨 for the duration of the contest — important because it establishes a level playing field. We want to ensure everyone's looking at the same code, no matter when they look during the contest. (Note: this includes your own repo, since a PR can leak alpha to our wardens!)
- [ ] Promote the contest on Twitter (optional: tag in relevant protocols, etc.)
- [ ] Share it with your own communities (blog, Discord, Telegram, email newsletters, etc.)
- [ ] Optional: pre-record a high-level overview of your protocol (not just specific smart contract functions). This saves wardens a lot of time wading through documentation.
- [ ] Delete this checklist and all text above the line below when you're ready.

---

# Canto Dex Oracle contest details
- 19,000 CANTO main award pot
- 1,000 CANTO gas optimization award pot
- Join [C4 Discord](https://discord.gg/code4rena) to register
- Submit findings [using the C4 form](https://code4rena.com/contests/2022-09-canto-contest/submit)
- [Read our guidelines for more details](https://docs.code4rena.com/roles/wardens)
- Starts September 7, 2022 20:00 UTC
- Ends September 8, 2022 20:00 UTC

[ ⭐️ SPONSORS ADD INFO HERE ]
# Oracle Audit

## **Total LOC: 155**

# **BaseV1-Periphery**

## **getUnderlyingPrice (SLOC: 487 - 522): 35 LOC -**

### Explanation

This method is defined to adhere to the Compound `PriceOracle` interface. The Comptroller calls this method when calculating accountLiquidities for users who hold balances of Erc20 tokens. These tokens are priced in terms of `$NOTE` . Stable coins (USDC, USDT, NOTE) have prices that are statically set to 1e18.  

For non-stable tokens, there are two cases

- The token is an lpToken
    
    If the token to be priced is an lpToken, the price of the lpToken is determined from `getPriceLP` (defined below)
    
- The token is not an lpToken
    
    The Price of the token is determined through the price determined from the Canto/Token pool * price from Canto/Note pool. All non-stable tokens, are priced in reference to the Canto/Token Pool.
    

The final price is scaled by 1e18.

### Concerns

- Overriding pools that should be referenced, by pools that a user themselves deploys and is able to easily manipulate

### External Calls

- L495
    
    ```solidity
    address(ICErc20(address(ctoken)).underlying())
    ```
    
- L502/506
    
    ```go
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

```go
prices = sample(token_asset, token_asset_decimals, 8, 1)
```

Essentially, this returns the amount of the unitToken (Canto or Note) that swapping `10 **token.decimals()` of the assetToken would return with the reserves stored for each of the most recent 8 observations.

The totalSupply of lpTokens at each of the most recent 8 observations is also recorded. The lpTokenPrice is determined as follows

```go
sum_i((token_asset_reserves[i] * price[i] + token_unit_reserves[i])/totalSupply[i]) 
```

### Concerns

- What is the tolerance of the lpToken Pricing to large moves in volatility / reserve sizes in both volatile / not-volatile pairs
- Inaccuracy resulting from rounding errors
- StableSwap invariant for stable pairs (x^3y + xy^3) that is used, may also lead to inaccuracy in `getAmountOut` calculations

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

Adds the current values of the reserves and totalSupply times the timeDiff between the last observations to the supply, reserve accumulators. After `updateFrequency` difference in `blockTimestamps` between the last recorded block timestamp and the current block timestamp, the `reserveCumulative` and `totalSupplyCumulative` values are written to state. Each time that any of these values changes, the accumulators are adjusted as follows,

 

```go
reserve0Cumulative += timeDiff * reserve0
reserve1Cumulative += timeDiff * reserve1
totalSupplyCumulataive += timeDiff * totalSupply
```

Where timeDiff is the difference in block timestamps between the current block timestamp, and the last time time that update was called. This enables TWAs to be calculated between observations as follows

```go
(observation[i].reserve0Cumulative - observation[i-1].resrve0Cumulative)/timeElapsed
```

## R**eserves (SLOC: 224 - 237) 13 LOC -**

### Explanation

This method returns the totalSum of the last n recorded reserves for either pair, this value can then be averaged by the number of requested values, to obtain a TWA over the number of periods requested.

## **sampleReserves (SLOC: 237 - 259): 22 LOC -**

### Explanation

This method returns the TW value of the reserves of either asset between observations. The user is able to determine the windowSize, and the number of windows to return TW values for, it is calculated as follows

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

This method returns the TW value of the reserves of either asset between observations. The user is able to determine the windowSize, and the number of windows to return TW values for, it is calculated as follows

```go
timeElapsed = observation[window * (i)].timeStamp - observation[window*(i - 1)].timeStamp
supply[i] = (observation[window * (i)].totalSupplyCumulative - observation[window*(i - 1)].totalSupplyCumulative) / timeElapsed
```
