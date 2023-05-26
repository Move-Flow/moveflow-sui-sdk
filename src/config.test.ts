import { Network, Config, TESTNET_CONFIG, getConfig } from './config'

describe('getConfig function', () => {
  test('should return TESTNET_CONFIG for testnet', () => {
    const config: Config = getConfig(Network.testnet)
    expect(config).toBe(TESTNET_CONFIG)
  })

  test('should throw an error for unsupported networks', () => {
    expect(() => getConfig(Network.devnet)).toThrowError(
      new Error(`Sorry, ${Network[Network.devnet]} not supported yet`)
    )
    expect(() => getConfig(Network.mainnet)).toThrowError(
      new Error(`Sorry, ${Network[Network.mainnet]} not supported yet`)
    )
  })
})
