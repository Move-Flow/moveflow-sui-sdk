import { Network, Config, getConfig, TESTNET_CONFIG, UNITTEST_CONFIG } from './config'

describe('getConfig function', () => {
  test('should return TESTNET_CONFIG for testnet', () => {
    const config: Config = getConfig(Network.testnet)
    expect(config).toBe(TESTNET_CONFIG)
  })

  test('should return UNITTEST_CONFIG for testnet', () => {
    const config: Config = getConfig(Network.unittest)
    expect(config).toBe(UNITTEST_CONFIG)
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
